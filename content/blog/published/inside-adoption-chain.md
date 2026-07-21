---
title: "Inside Adoption Chain: an auditable second-order research engine for small-cap equity"
slug: inside-adoption-chain
archetype: thesis
date: 2026-07-02
project: adoption-chain
version: v6 / 2026
status: published
tags: [buy-side, sec-edgar, retrieval, auditability, deepseek, provider-agnostic, cost-economics, research-tooling]
summary: Adoption Chain turns a portfolio manager's scenario into a consequence map, then finds the under-covered small-cap companies sitting on each consequence, then drafts a one-page thesis per name in which every factual claim links to the exact SEC filing sentence behind it. It is leverage underneath judgment, never a recommendation. This post walks the phrase-rule that makes retrieval actually work, the rubric-outside-the-model design that makes it auditable, and the read-once-query-many corpus that runs the whole thing for about twenty-two dollars.
---

# Inside Adoption Chain: an auditable second-order research engine for small-cap equity

By Russ. Built 2026.

---

## What this post is

Adoption Chain is an idea-generation engine for a small-cap growth-equity team. A portfolio manager types a scenario ("humanoid robotics reaches commercial scale," "onshoring accelerates"). The system returns three things: an organized consequence map of first, second, and third-order effects, both good and bad; a ranked list of under-covered small-cap companies sitting on each consequence; and a one-page thesis draft per name in which every factual claim links to the exact sentence in the exact SEC filing it came from.

The design principle is one line: **leverage underneath judgment, never a recommendation.** The system does the search, the reading, and the sourcing that would take an analyst days. It does not tell the PM what to buy. It hands them a defensible starting point where every claim is one click from its primary source.

I built it as the centerpiece of a buy-side Associate Analyst case. It is a personal project on public data, so everything here is exactly how it works. This post is for engineers and architects evaluating retrieval-heavy, auditability-first LLM systems. The financial-research framing is the vehicle.

---

## The problem

A growth-equity PM has more scenarios than analyst-hours. The valuable ideas are not the obvious first-order beneficiaries everyone already owns. They are the second and third-order names three links down the supply chain that no sell-side analyst covers yet. Finding them means reading a lot of filings.

Three properties of this domain shape the architecture.

1. **The output has to be auditable or it is worthless.** A PM cannot act on "the model says this company benefits." They can act on "this company's own 10-K, this sentence, says it supplies this component to this end market." An LLM assertion is a liability; a linked primary-source citation is an asset. Every factual claim traces to a filing sentence. Claims that cannot be sourced get dropped.

2. **The retrieval system has its own grammar.** SEC EDGAR full-text search matches exact phrases. It does not understand analyst language. This single fact governs whether the map-to-company step works at all, and it is where the naive version fails.

3. **The economics have to work at a solo budget.** Reading the full small-cap universe with a frontier model on every query would cost real money per run. The architecture has to make the expensive work happen once and the queries happen for near-free.

---

## System overview

The stack is deliberately dependency-light.

- **TypeScript end to end.** A Vite and React front end with essentially no runtime dependencies, and an API server on Node's built-in HTTP module, no web framework.
- **A provider-agnostic LLM adapter**: plain fetch, no vendor SDK, selected by an environment variable. It runs against a local fixture set for deterministic testing, a local Ollama model, or any OpenAI-compatible endpoint. In production it targets DeepSeek, a heavy tier for reasoning-dense passes and a light tier for bulk tagging. Swapping providers is a config change, not a code change.
- **Free, keyless public data**: SEC EDGAR full-text search, XBRL company facts, and Form 4 insider filings; federal contract data; reverse-citation lookups. A seam exists for paid sell-side coverage data, off by default.
- **Persistence** to Supabase in the intended deployment, currently identical JSON shapes on disk, so the storage layer can swap without touching the pipeline.

The interesting decisions are in how these fit together.

---

## The phrase rule

This is the single most important design decision in the system, and it came from a real failure.

The map-to-company step takes a consequence ("demand for rare-earth permanent magnets rises") and has to find the companies exposed to it. The mechanism is SEC EDGAR full-text search, which matches **exact phrases**. So the LLM's job in this step is not to reason about who benefits. Its job is to generate the search phrases a company would actually write **in its own filings**.

The naive version has the model produce analyst language: "humanoid robotics beneficiaries," "companies exposed to embodied AI." Those phrases return nothing, because no company writes that sentence in its 10-K. The failure was concrete and logged: hyper-specific engineering compounds like "harmonic drive gear" mapped to zero filers, because the phrasing was too precise to appear verbatim. The fix was to rebalance toward the common on-theme terms companies actually use to describe their own business: "rare earth magnets," the names of the components and end markets as they appear in a risk-factors section.

==The phrase rule: when an LLM drives a retrieval system, the model's output must be shaped to the retrieval system's actual grammar, not to natural language. Ground the generation in how the corpus is written, not in how the question is asked.== This is the difference between a demo that returns plausible nonsense and a system that returns the actual supply chain. It generalizes to any RAG or agentic-search system: the model has to speak the index's language, and getting that alignment right is most of the work.

---

## The rubric lives outside the model

Once candidates are found, they are scored on a six-dimension rubric: optionality, revenue-relative-to-opportunity, customer validation, catalyst density, insider conviction, and management conviction, each with an explicit weight.

The decision that matters is that **the rubric arithmetic lives outside the model.** The LLM extracts and tags the evidence for each dimension. The weighting and the final ranking are ordinary arithmetic in application code, with the weights stored as editable configuration, not baked into a prompt.

The payoff is an "argue with the weights" panel. A PM who thinks customer validation should matter more than catalyst density slides the weight. The entire ranking re-sorts live, with no model call and no rerun. The scoring is transparent, deterministic, and instantly tunable. It is arithmetic the PM can see and change, not a black-box judgment buried in a generation.

==The transferable lesson: keep the judgment the model is good at (reading and tagging evidence) inside the model, and keep the arithmetic the model is bad at (weighted ranking) outside it, where it is auditable and tunable. Do not ask the model to do math you want to be able to argue with.== This is the same principle as the deterministic validation layer in my CRE workflow: the model writes, deterministic code audits and computes.

---

## Read once, query many

Running the full small-cap universe through the model on every PM query would be slow and expensive. The architecture separates the expensive step from the cheap step through an offline corpus.

A one-time backfill reads the in-band universe once and produces a structured corpus: for each company, its tagged exposures, its catalysts, its addressable-market claims, each linked to its source filing. That corpus is the read-once artifact. Every subsequent PM query runs against the corpus, not against the raw filings, so the per-query cost collapses.

The economics are the headline. Building the corpus across nearly two thousand in-band companies (thousands of tagged exposures, thousands of catalysts, over a thousand market-size claims) cost under seven dollars against a fifty-dollar cap, on the order of a fraction of a cent per company. A full-universe backfill runs about twenty-two dollars one time on the light-tier model, with single-digit dollars a month to keep it current.

==The transferable lesson: separate the expensive read from the cheap query. Pay once to build a structured corpus, then serve many queries against it for near-free. The cost architecture is what makes a research tool viable at a real budget.==

---

## Never a recommendation

The system is built to say no. The candidate universe is filtered to a defined small-and-mid-cap band. Most candidates are then rejected at the customer-validation stage. That stage checks whether a company's own filings actually substantiate the exposure the theme implies. A dry run on a humanoid-robotics scenario mapped eighty companies, narrowed to thirty-four in the market-cap band, and surfaced three worth a full read. The other thirty-one did not clear the bar, and the system said so.

This is a feature, not a limitation. ==A research tool that mostly returns "no candidate clears the bar" is more trustworthy than one that always returns picks. A system that cannot say no is a system that is telling you what you want to hear.== The output per surviving name is a one-page thesis draft with every claim sourced, explicitly framed as leverage for the analyst's judgment, never as a buy signal. The PM decides. The system defends.

---

## What I would change starting over

Three things.

1. **Deploy the persistence and auth layer.** The system currently persists structured JSON to disk with a mock auth token. The intended Supabase deployment, with real accounts and row-level security, is the operational work that turns it from a local tool into a team tool.

2. **Add explicit recency weighting to catalysts.** Catalyst density currently counts catalysts; it should decay them by age, the same way my other systems weight signals by a half-life, so a catalyst from last quarter outweighs one from three years ago.

3. **Close the retrospective loop.** The system generates theses; it does not yet track what happened to the names it surfaced. A retrospective layer that scores the pipeline's hit rate over time is the thing that would make it measurably better rather than just faster.

---

## Closing

Adoption Chain is a retrieval-heavy, auditability-first research engine that turns a PM's scenario into sourced, rank-ordered, argue-with-the-weights leverage, for about the price of lunch per corpus build. The architecture is not exotic. The discipline is: shape the model's output to the retrieval system's grammar, keep the rankable arithmetic outside the model where it is auditable, read once and query many so the economics work, and build the thing to say no.

The through-line to the rest of my work is auditability and cost discipline: every claim traceable to a primary source, every ranking transparent and tunable, every expensive operation paid for once. If you are building a retrieval-heavy LLM system where the users cannot act on an unsourced assertion, the questions worth asking are: does the model speak your index's actual language; is the arithmetic you want to argue with kept outside the model; have you separated the expensive read from the cheap query; and can your system say no.

For the deterministic-validation-around-a-model pattern in a different domain, see [Inside the Mosaic feasibility workflow](/blog/inside-cre-feasibility.html). For the multi-pass orchestration discipline behind structured, sourced outputs, see [Inside Marketing Bot v2](/blog/inside-marketing-bot.html).

---

Russ
