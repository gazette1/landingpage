---
title: "Inside TrialEdge: a calibrated probability ensemble for FDA catalyst prediction"
slug: inside-trialedge
archetype: thesis
date: 2026-05-19
project: trialedge
version: v1.6
status: published
tags: [calibration, lightgbm, biotech, cloudflare, ml-architecture, eval, cost-economics]
summary: TrialEdge predicts FDA PDUFA catalyst outcomes. 4,032 tracked entities, 208 labeled outcomes, AUC 0.686 on the held-out set. The architecture is intentionally small, intentionally calibrated, and intentionally cheap. This post walks the architecture decisions, the eval rig, the cost economics, and what would change starting over.
---

# Inside TrialEdge: a calibrated probability ensemble for FDA catalyst prediction

By Russ. Production version v1.6, deployed 2026.

---

## What this post is

TrialEdge predicts the outcome of FDA PDUFA catalysts. The system runs in production with 4,032 tracked biotech entities and 208 labeled PDUFA outcomes used for training and calibration. Held-out AUC sits at 0.686. The architecture is intentionally small, intentionally calibrated, and intentionally cheap to run.

This post walks through the architecture decisions that matter, why I made each one, what I would change if I were starting over, and how I monitor the system in production. It is written for engineers and architects who are evaluating whether a similar shape applies to their domain, not for biotech investors looking for catalyst picks.

The parts most likely to be useful to a fellow architect are the modeling-and-calibration discussion, the eval rig, the cost economics, and the monitoring section. The biotech domain framing is a vehicle for those architectural points.

---

## The problem

A PDUFA date is the deadline by which the FDA must rule on a drug application. The decision is binary in the most consequential sense: approve or do not. The stock-price reaction is asymmetric. Approvals on consensus expected drugs move biotech tickers 5 to 15 percent. Surprise rejections on consensus expected approvals move them 40 to 70 percent down. The same direction holds for unexpected approvals on doubted drugs, in the other direction.

Three properties of this domain shape everything downstream:

1. **Small N.** A few dozen PDUFA decisions per quarter across all of biotech. Even multi-year labeled sets stay in the low hundreds. This rules out architectures that need millions of examples.

2. **Asymmetric payoff.** A 10 percent improvement in raw accuracy is worth far less than a 5 percent improvement in calibration. A model that says "0.7" and is right 70 percent of the time is more valuable than a model that says "0.95" and is right 80 percent of the time. The first one lets you size positions correctly. The second one bankrupts you on the surprise misses.

3. **Sparse, biased signal.** Most of what is publicly known about a PDUFA outcome is in SEC filings, transcripts, and FDA documents. Those documents are long, partial, and written by people with incentives. The features are not clean tabular data; they are extracted opinions about extracted facts.

Most ML systems built for this domain have failed at one of those three. They either tried to be deep (small N kills you), or they optimized raw accuracy without calibration (asymmetric payoff destroys you), or they ignored the noise in the underlying source extraction.

TrialEdge is shaped by the three constraints in order.

---

## System overview

The stack:

- **Cloudflare Pages and Workers** for the application layer and APIs.
- **Cloudflare R2** for filing artifacts and feature snapshots.
- **Cloudflare KV** for hot-path caches.
- **Supabase Postgres** for the labeled training set, model artifacts, and catalyst metadata.
- **Google Sheets** as the editorial layer where domain experts (mostly me) review and label catalyst outcomes.
- **OpenRouter with Gemma 3 27B** for filing summarization and structured field extraction.
- **LightGBM** wrapped in a **CalibratedDebateScorer** for the prediction itself.

The full system fits on a single repo and a single Postgres instance. Total monthly run cost is in the low double digits, dominated by OpenRouter calls for filing summarization. Cloudflare and Supabase costs round to zero at this scale.

I will return to cost economics at the end. The stack choices were cost-driven, not capability-driven, and that distinction matters.

---

## Data ingestion

Two pipelines feed the model.

The **entity pipeline** maintains the 4,032 tracked biotech tickers and the relationships between them (parent or subsidiary, indication areas, prior FDA history, partnership structures). It runs nightly against SEC EDGAR and a small number of public catalyst calendars. New entities flow into Supabase with their raw structured fields and a status flag indicating they need editorial review before becoming active candidates.

The **filing pipeline** detects new 10-K, 10-Q, 8-K, and S-1 filings, pulls the raw text, segments it by SEC item, and queues each segment for summarization. The summarizer runs Gemma 3 27B via OpenRouter with a templated prompt per segment type. Output is structured (catalyst mentions, pipeline disclosures, financial position, risk factors related to FDA process) and stored back to Postgres with a citation pointer to the source segment.

Two things to call out about this layer:

**Effective context is shorter than advertised.** Gemma 3 27B has a 128K context window. A 10-K can easily run 80K to 100K tokens. Long-context performance degrades in the middle of inputs even when the window technically accommodates them. TrialEdge handles this by segmenting filings before summarization rather than by feeding the full filing in one call. Each segment summary is faithful to its segment; the aggregation back to a catalyst-level signal happens deterministically in code, not inside the LLM context.

**Source attribution is preserved at the claim level.** Every extracted statement in Postgres carries a citation pointer (filing ID, section, offset). This is not for human readers; it is so the model layer can ignore claims it has no source for and so the eval rig can spot-check faithfulness during development.

---

## The modeling layer

The model is LightGBM. The wrapper around it is where the design lives.

### Why LightGBM, not a neural network

With 208 labeled outcomes, a neural network is the wrong choice. Tree-based gradient boosting beats deep nets reliably at this sample size for tabular signal. It has added benefits: splits are inspectable, training is fast enough to retrain on every label change, and the resulting model is small enough to deploy as a static artifact in R2.

The features are 16 engineered signals derived from the structured filing extractions: indication area, mechanism of action class, FDA review division, prior CRL history for the sponsor, partner involvement, label-claim complexity, primary endpoint type, panel scheduling, and several derived flags that are cheap to compute and high signal in this domain. The exact list is in the repo. The design principle was simple: only signals a domain analyst would point at, no kitchen-sink feature engineering.

### CalibratedDebateScorer

A wrapper I call the CalibratedDebateScorer calibrates and aggregates the raw LightGBM probability output. The name describes its two jobs.

**Calibration.** Raw boosted-tree outputs are systematically overconfident. The wrapper applies isotonic regression calibration fit on a held-out portion of the labeled set. Output of 0.7 from the calibrator means the underlying historical base rate at that confidence band was 70 percent, within sampling error.

**Debate scoring.** For each candidate catalyst, the calibrator produces a bull-case probability and a bear-case probability from two slightly different feature framings of the same underlying signals. The final score is not their average. It is a function that penalizes the catalyst score when the two cases disagree sharply. A catalyst where the bull and bear cases both produce 0.7 is a higher-conviction call than a catalyst where bull is 0.85 and bear is 0.55, even though both average to 0.7. The disagreement penalty is a single tunable parameter fit on the calibration set.

This pattern is structurally similar to debate-style inference architectures published more recently, but it predates them in this codebase. I am not claiming originality on the pattern, only that the wrapper was the difference between a model that scored well on AUC and a model that produced position-sizable probabilities.

### Held-out performance

AUC on the held-out set is 0.686. I want to be honest about what this means.

AUC at this level is not Bloomberg-terminal-killer territory. It is meaningfully better than the published baselines for biotech catalyst prediction. Most academic and industry baselines hover at 0.55 to 0.62. But it does not mean TrialEdge is "right" in any narrative sense most of the time. What it means is this: when TrialEdge says 0.8, the catalyst hits at roughly an 80 percent rate. When TrialEdge says 0.3, the catalyst hits at roughly a 30 percent rate. ==Calibration is the product. Discrimination is the qualifier.==

For position sizing and portfolio construction, calibration is what you actually need. For headline accuracy claims, calibration looks worse than raw "I called it right" stories. I optimize for the first, not the second.

---

## The eval rig

Every production AI system claim should be cashable as "and here is how I would know if it stopped working." This section is mine.

### Three layers

**Offline eval** runs on every code change. The held-out set is 20 percent of the labeled outcomes, stratified by year and indication area to prevent temporal or domain leakage. Metrics: AUC, Brier score, calibration curve max-deviation, and a custom metric I call "expected log-loss vs base rate." That metric compares the model's calibrated outputs to the rolling-3-year FDA approval base rate for the indication area. The third metric is what catches regressions where AUC stays flat but calibration drifts.

**Online eval** runs continuously against the editorial layer. The Google Sheets review surface logs every catalyst the model scored and the eventual outcome once the PDUFA date passes. A weekly cron computes the same metrics on the rolling 30, 90, and 365 day windows of newly-resolved catalysts. ==This is the eval rig that catches drift the offline set cannot, because the data distribution moves over time as new indication areas become active.==

**Drift detection** runs at the feature level. Each of the 16 features has a rolling distribution baseline. Significant drift in any feature distribution (Wasserstein distance over threshold against the training-set baseline) raises an alert and a manual review of whether the model needs recalibration. This has fired twice in production. Both times it correctly identified that the source filing-summarization prompts had shifted output distributions slightly after a Gemma model update on OpenRouter.

### What I do not do, and why

I do not run automated retraining. The dataset is small enough that any retraining decision deserves a human reviewing the calibration curve before deployment. Automating it would introduce a class of failures I am not willing to absorb at this scale.

I do not run ensembles of LightGBM models. I tested it; the calibration improvement was within noise and the inference complexity doubled. The CalibratedDebateScorer wrapper captures the variance I was hoping to capture through ensembling.

---

## Cost economics

Per-unit economics get asked at every architecture review. Here are the numbers.

**Per-catalyst cost (inference):** about $0.02 in OpenRouter calls. The cost is dominated by filing summarization, not by the LightGBM inference itself. That inference runs in milliseconds on a Cloudflare Worker, free at this volume.

**Per-filing cost (ingestion):** about $0.10 for a typical 10-K, scaling roughly linearly with filing length. A new 10-K hits the summarization pipeline once and produces structured outputs that feed many downstream catalyst scores. So the amortized cost per catalyst is well under the headline filing cost.

**Total monthly run cost:** in the low double digits at current entity coverage. The cap on this number is not the system; it is how many filings hit the pipeline in a given month.

**What I would change with more budget:** I would route higher-stakes catalysts to a more expensive model for the final pre-decision summarization pass, while keeping bulk summarization on Gemma. Higher-stakes means a position sized above a threshold. This is a routing decision, not an architecture decision. The existing system already supports per-call model overrides. ==I have not made this change because the eval rig has not yet shown a quality lift that justifies the cost increase.==

This is the discipline that separates "we should use the better model" from "we measured and decided." The second answer is the one that lands in technical interviews.

---

## Monitoring and observability

I want to address this section explicitly because it is the question every senior architect asks and most candidate descriptions of production AI systems wave at.

The monitoring is layered.

1. **Pipeline health.** Cloudflare Worker analytics catch ingestion failures, retries, and rate-limit events. Every filing pipeline run logs to a Supabase table with timestamps and outcomes. A nightly job checks for stalled pipelines and pages me through a simple webhook.

2. **Feature distribution drift.** As described in the eval rig section. The interesting failures here have been upstream (the Gemma summarizer producing slightly different outputs after an OpenRouter model update), not in the LightGBM layer itself.

3. **Output distribution monitoring.** I track the rolling distribution of CalibratedDebateScorer outputs weekly. A sudden shift in the output distribution that does not correspond to a known model change signals something upstream broke silently.

4. **Calibration tracking.** The most important monitor. Each new catalyst resolved by the editorial layer updates the calibration curve. A 7-day rolling calibration check flags any sustained deviation between predicted probability and realized base rate by 5 points or more, in either direction.

5. **Editorial layer audit log.** Every change in the Google Sheets layer (catalyst added, outcome resolved, manual override applied) writes to a Supabase audit table. This is for forensics, not real-time monitoring. But it is how I caught the two production issues that originated in upstream prompt changes rather than model code.

The discipline I bring from CRE credit underwriting matters here. ==In credit, you do not get to claim a deal is performing because you closed it; you have to defend it against the eventual realized outcomes.== I run TrialEdge the same way. The model that looks great in offline eval still has to defend itself against the actual PDUFA outcomes month after month.

---

## What I would change starting over

Three things, in order.

1. **Move the editorial layer off Google Sheets.** It works at this scale, but it does not scale to a team and it does not produce clean audit trails by default. I built it on Sheets because Sheets is where domain analysts already live. If I were starting over with the same constraint, I would build a thin web UI on Cloudflare Pages that wrote directly to Supabase, with Sheets as a read-only export rather than the source of truth.

2. **Adopt a formal eval framework.** The current eval rig is hand-rolled Python that lives in the same repo as the model. RAGAS-style or DeepEval-style frameworks would let me run faithfulness checks against the filing summarizer outputs more rigorously, especially for the structured-extraction step where hallucination has been the hardest class of error to catch.

3. **Externalize the debate scorer.** The CalibratedDebateScorer is currently one Python module wrapping LightGBM. A cleaner v2 would express the bull case and bear case as separate model calls, possibly using different feature representations or even different model families, with the disagreement penalty computed explicitly. The cost would roughly double. The architectural clarity would be worth it for portfolio and interview purposes alone.

---

## Closing

TrialEdge is a small production AI system that solves a narrow problem with disciplined calibration, a cheap stack, and a layered eval rig. The architecture is not novel; the discipline is what makes it work. The small-N domain, the asymmetric payoff, and the noisy-source signal all conspired to force decisions that look conservative from the outside (no neural net, no ensembling, manual retraining) but were the right tradeoffs given the constraints.

If you are building something similar in a different domain, the questions worth asking are: how do you decide between deep and shallow architectures at small N, what is your calibration story, how do you catch drift in upstream LLM components, and what does your system cost to run per useful output. Those are the questions this post is meant to answer for TrialEdge.

For more on the architectural discipline behind this and related systems, see the Atlas case study at /blog/inside-atlas.html when it lands, and the upcoming TrialEdge-ML companion post that covers the tabular calibration sibling to this system.

---

Russ
