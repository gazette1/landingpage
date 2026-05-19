---
title: "Inside MES Open: five architectural decisions in an algorithmic trading system"
slug: inside-mes-open
archetype: thesis
date: 2026-05-19
project: mes
version: Phase 3 / 2026
status: published
tags: [algorithmic-trading, decision-analysis, regime-detection, anti-lookahead, fdaa, judgment]
summary: MES Open is an algorithmic trading system targeting the New York open window on Micro E-mini S&P 500 futures. The system has shipped through three development phases and a multi-year backtest with positive expected value. This post is not a tutorial on the system. It is a walk through five architectural decisions I made while building it, the alternatives I rejected, and what each decision teaches about Forward Deployed AI Architect judgment in a high-noise low-sample domain. The implementation is mine. The reasoning is portable.
---

# Inside MES Open: five architectural decisions in an algorithmic trading system

By Russ. Phase 3 of an active build, 2026.

---

## What this post is

MES Open is an algorithmic trading system I built to target the New York open window on Micro E-mini S&P 500 futures. The system runs as a backtest framework, has shipped through three development phases, and produces positive expected value at meaningful Profit Factor and Sharpe across multi-year out-of-sample tests.

This post is not a tutorial. The trading edge in this kind of system is small, contested, and degraded by being documented. I am not going to walk through every module, name every parameter, or hand a competitor the configuration that produces the backtest result. The system is mine.

What is portable, and what this post is actually about, is the **architectural judgment** I applied while building it. Five decisions, each with alternatives I considered and rejected, each with a transferable lesson about Forward Deployed AI Architect work in a high-noise low-sample domain. If you are reading this as a hiring manager or a peer evaluating how I think, the decisions are the artifact. If you are reading this hoping for a working bot, you are in the wrong post.

---

## The decision frame

A trading system targeting the open of a major equity-index future operates inside three conditions that shape every other choice:

1. **Signal-to-noise is brutal.** Most bars are noise. The architecture that wins is the one that filters aggressively, not the one with the cleverest entry rule.

2. **The human discretionary baseline is informative, not embarrassing.** A skilled trader applying the same setup rules outperforms the bot by a wide margin. That gap is not a failure of the system; it is a measurement of what cannot be captured in OHLC bar data. Treating the gap honestly is the discipline that prevents over-tuning the model to false signals that look like the missing alpha.

3. **Asymmetric payoff means calibration matters more than discrimination.** At the reward-to-risk ratio this strategy targets, a small move in win rate flips the system between profitable and unprofitable. The architecture cannot afford to be wrong about regime; one bad regime call cancels several good entries.

Those three conditions are the lens for every decision below.

---

## Decision 1: mathematical primitives over learned representations

The first decision was the modeling layer's basic shape. The candidates:

- A learned representation (deep network on price tensors, transformer on bar sequences, etc.).
- A library of hand-engineered mathematical primitives (consolidation detection, breakout confirmation, market-phase classification) composed deterministically.

The decision criterion was sample size, not sophistication. The labeled data available for this strategy is the set of historical days when the setup conditions fired and a trade occurred. That sample, even across multiple years, is in the low thousands at best. Deep networks on tabular or sequential market data at this sample size produce models that are either underfit (no edge) or overfit (edge that disappears out of sample). I have seen both failure modes in the published trading literature and in side projects.

Hand-engineered primitives, composed deterministically and parameterized minimally, are inspectable, testable, and survive walk-forward analysis cleanly. They are also, importantly, **debuggable by a domain expert** without a GPU. When a trade does not execute on a day the system should have traded, I can trace why through deterministic code; I cannot trace why through learned weights.

==The transferable lesson: at small sample size, inspectability beats expressiveness. Pick the architecture whose failure mode you can diagnose.==

This is the same call I made on TrialEdge (LightGBM over neural net at 208 labeled outcomes) and the same call I would make for any production system where the labeled set is in the hundreds or low thousands and the operator needs to defend the system's outputs to a non-technical stakeholder.

---

## Decision 2: regime detection by operational informativeness, not theoretical elegance

The single most consequential architectural decision in the system was the regime filter: a pre-flight check that classifies the current market state and decides whether the entry models even run.

I tested three approaches against each other. Two were more theoretically sophisticated than the one I chose:

- A hidden-state clustering approach over a feature vector of returns, volatility, and volume signals.
- A GARCH-family volatility-regime classifier with percentile-based state assignment.
- A simpler approach based on the ratio between a short-window and a long-window volatility measure.

The first approach produced a state distribution that collapsed to one dominant state across more than 90 percent of observations. Mathematically defensible, operationally useless: a filter that says "yes" 90 percent of the time is not a filter.

The second produced an even three-way distribution but with no directional context. It could distinguish a calm market from a violent one but could not distinguish a calm market that was about to break from a calm market that was about to reverse.

The third approach produced a state distribution that **mapped to the entry models' failure modes**. The state it flagged as "do not trade" was the state where the system's trend-following entries had historically lost money. The mapping between regime state and entry-model edge was the only criterion that mattered.

I picked the third. Removing the filter entirely turns the system from a positive-expected-value strategy into a meaningful loss generator over the same test period. The filter alone is the difference between the system being shippable and being a research toy.

==The transferable lesson: when you are evaluating two approaches and one is more theoretically motivated than the other, pick the one whose output is most informative for the downstream task. Theoretical elegance is not a metric.==

This is, in my experience, the single most common architectural failure I see in junior ML work: picking the model whose math is most defensible rather than the model whose output is most useful. The defensible answer is correct in academia and wrong in production.

---

## Decision 3: multi-model architecture with honest selectivity

The system was designed with three entry models, each rooted in a different trading philosophy: a momentum model, an institutional-order-flow model, and a mean-reversion model. The intent was that the three models would fire on different market conditions and collectively cover more of the year than any one model alone.

In practice, the momentum model produces almost all the executable trades and almost all the edge. The other two generate signals but rarely survive the regime filter, the session filter, and the timing-window constraints downstream. They have not yet produced enough trades to evaluate their per-model edge meaningfully.

The architectural decision queued for the next phase is the one I find most interesting: **what do you do with a model that is theoretically sound but practically silent?**

The temptations are:

- **Relax the model's thresholds** so it fires more often. This is the most common path and usually the wrong one; the strictness is what made the model defensible in the first place.
- **Remove the model from the production pipeline.** This is honest but loses the optionality that the model is genuinely valuable on rare regimes the momentum model misses.
- **Isolate the model in a research pipeline with relaxed thresholds while keeping the production pipeline strict.** This preserves the optionality without polluting the production system.

I am leaning toward the third option. The reasoning generalizes: any production system that includes a research-grade component should run that component in a parallel research path, not in the production pipeline, until the research path produces enough signal to justify production inclusion.

==The transferable lesson: a production system and a research system are different systems with different test bars. Mixing them is what corrupts both.==

---

## Decision 4: anti-lookahead as a system commitment, not a feature

The anti-lookahead architecture (preventing future information from contaminating past-bar signals) is enforced at the data pipeline boundary, not inside individual signal modules. Every bar-by-bar simulation passes through a single function that maps each execution-timeframe bar to only the most recently *completed* higher-timeframe bar.

The mechanical reason is correctness: most public algorithmic-trading code lookaheads on this exact boundary, accidentally allowing future information into the signal-generation step, and the resulting backtests look profitable until they touch live data.

The architectural reason is more important: by enforcing the discipline at the boundary, no downstream signal module can violate it accidentally. A new contributor (or future me) writing a new entry model cannot break anti-lookahead unless they bypass the data pipeline entirely, which would be obvious in code review.

==The transferable lesson: invariants enforced at architectural boundaries beat invariants relied on at the call site. The boundary is the contract; the call site is the failure mode.==

This is the same discipline as parse-time voice validation on a generated letter (caught by Atlas and Marketing Bot v2), as point-in-time integrity gates on a labeled training set (caught by TrialEdge-ML), and as deterministic validation of LLM-produced numeric outputs against a separate calculator (caught by the Mosaic CRE feasibility workflow). Different domains, same architectural pattern: the contract sits at the boundary.

---

## Decision 5: how to bound the win-rate gap honestly

The hardest decision was not technical. It was about how to frame the gap between the bot and the human discretionary baseline on the same strategy.

The bot closes roughly 40 percent of the per-trade edge that a skilled discretionary trader achieves applying the same setup rules. The gap is large and reproducible. Three responses were available:

- **Pretend the gap does not exist.** Report only the bot's profitable backtests and the human's existence as a sanity check. This is the path of least resistance and the path of dishonest reporting; I will not take it.
- **Treat the gap as a failure of the system.** Endlessly tune the bot to close the gap. This is the over-fitting path; every tuning iteration runs the risk of fitting to the noise the bot would not have caught on a fresh sample.
- **Treat the gap as a measurement of what cannot be captured in OHLC bar data, and design accordingly.**

I picked the third. The gap is informative: it tells me that sub-bar context (tape, order flow, candle nuance, session character) carries roughly 40 percent of the strategy's edge and is invisible to the bot's data. The architectural decision that follows is to either invest in capturing that data (tick-level feeds, order-book modeling) or accept the bot at its current ceiling and ship it as the system that captures 60 percent of the achievable edge.

==The transferable lesson: when your model underperforms a human baseline, the gap is a measurement of an information asymmetry, not a tuning opportunity. Diagnose the asymmetry before tuning the model.==

This is the discipline a Forward Deployed AI Architect brings to a client engagement that is missing its target. Most engagements that "fail" do not fail because the model is wrong; they fail because the input data does not carry the signal the human was using. Diagnosing that distinction is half the job.

---

## What these decisions look like applied elsewhere

If you are evaluating me as a Forward Deployed AI Architect and you want to know how the MES decisions translate to your domain, the five lessons compress to:

1. **Inspectability over expressiveness at small sample size.** Pick the model whose failure mode you can diagnose.
2. **Operational informativeness over theoretical elegance for filters and classifiers.** Pick the one whose output maps to your downstream task.
3. **Separate the production system from the research system.** Mixing them corrupts both.
4. **Enforce invariants at boundaries, not at call sites.** Boundaries are contracts; call sites are failure modes.
5. **Treat human-model gaps as information asymmetries, not tuning opportunities.** Diagnose the asymmetry before adjusting the model.

These five are the architectural patterns I would apply to a forecasting system, a fraud-detection system, a recommendation system, a clinical-prediction system, or any other domain where the labeled sample is in the hundreds-to-low-thousands range, the operator needs to defend the output, and a human discretionary baseline exists and meaningfully outperforms the model. They are the closest thing I have to a portable methodology.

---

## What this post does not contain

For the record, since the framing matters: this post does not contain the specific entry-model parameters, the regime threshold values, the exact backtest configuration, the module-by-module test breakdown, or the dataset specifics that would let someone reconstruct the system. Those are intellectual property I am not handing to a competitor. The decisions and the reasoning are the artifact; the implementation is mine.

If you are a hiring committee and you want a walkthrough of the production code with parameters intact, that is what an on-site technical conversation is for, not what a public blog post is for.

---

## Closing

MES Open is the project in my portfolio that most directly demonstrates how I make architectural decisions in a high-noise low-sample domain where the inputs are limited, the human baseline outperforms the model, and the cost of being wrong is real.

If you are hiring a Forward Deployed AI Architect to build something similar in a different domain (financial forecasting, anomaly detection, demand modeling, anything where the signal is contested and the discretionary expert beats the algorithm), the questions worth asking are: how do you pick between a learned representation and a hand-engineered model at small sample size; how do you evaluate multiple filter approaches without picking the most mathematically defensible one; how do you handle production-system components that are theoretically sound but practically silent; how do you enforce data-pipeline invariants so no downstream module can violate them; and how do you diagnose the gap between your model and a skilled human baseline without falling into tuning theater.

Those are the questions this post is meant to answer for MES.

For the production-ML calibration discipline that shaped my eval philosophy across projects, see [Inside TrialEdge](/blog/inside-trialedge.html). For the customer-facing signal-composition counterpart, see [Inside Atlas](/blog/inside-atlas.html).

---

Russ
