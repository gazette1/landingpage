---
title: "Inside the corridor pipeline: Python automation for LIHTC research"
slug: inside-corridor-pipeline
archetype: thesis
date: 2026-05-19
project: mosaic
version: v1 / 2026
status: published
tags: [python, lihtc, corridor-analysis, public-data, automation, mosaic, fdaa, cost-economics]
summary: A 15-script Python pipeline that turns a corridor opportunity into a defensible LIHTC scoring estimate plus a structured proforma. The system fuses Census ACS, HUD QCT, IRS OZ, USDA Food Atlas, state DDD, and land bank inventory data on a parcel key, scores each parcel against the relevant QAP, and produces an LP-memo-ready output. This post walks the architectural decisions that made the pipeline tractable as solo work.
---

# Inside the corridor pipeline: Python automation for LIHTC research

By Russ. Solo build, 2026. Production tooling for Mosaic Capital Solutions corridor evaluation.

---

## What this post is

This is a Python pipeline I wrote to automate the corridor-evaluation work behind LIHTC applications. Fifteen scripts, a handful of structured-data manifests, and a small collection of analysis markdown files that get regenerated nightly. The system takes a corridor (a contiguous set of parcels in a target market), fuses six public-records layers against a land-bank inventory, scores every parcel against the relevant state Qualified Allocation Plan, and produces an LP-memo-ready output that a senior underwriter reviews and ships.

The pipeline is the engineering backbone of the LIHTC field-note workflow described in [stacking R/ECAP, QCT, OZ, and DDD](/blog/field-lihtc-triple-stack.html). That post explained the analytical pattern. This post is the engineering. The pipeline took several weeks to build, runs in production now, and compresses the per-corridor research timeline from roughly three weeks of senior-analyst work to under a day of operator review on auto-generated output.

This post is for engineers and architects evaluating whether a similar fuse-and-score shape applies to their domain. The architectural decisions and the cost economics are what transfer. The LIHTC framing is the vehicle.

---

## The decision frame

A corridor-evaluation pipeline operates inside three conditions that shape every architectural choice:

1. **Public-data freshness is non-negotiable.** Every designation the pipeline relies on (QCT, OZ, DDD, food desert, R/ECAP, ACS demographics) refreshes on a different cadence and changes the deal economics when it moves. A pipeline that runs on stale data produces wrong scoring estimates that the senior underwriter then has to debug at the worst possible moment, right before an application deadline.

2. **The output has to be defensible to a credit committee.** Every numeric claim in the output needs a traceable source, every QAP score needs a citation to the QAP section that awards it, and every comp needs a public record the underwriter can pull. Hand-waved outputs fail at the credit-committee stage, and a system that produces hand-waved outputs is worse than no system.

3. **Solo build means dependency discipline.** Each new library, each new external API, each new data source is a maintenance commitment. The pipeline runs on a small set of well-chosen dependencies, with a clear separation between code that ingests data, code that scores parcels, and code that renders human-readable output.

Those three conditions are the lens for every decision below.

---

## Decision 1: structured data layer before any scoring logic

The first decision was the order of operations. The candidates:

- Build a scoring rubric first, hand-load the data, iterate on the rubric.
- Build the structured data layer first, validate against known parcels, then layer scoring on top.

The naive approach is the first one. The decisive approach was the second.

Scoring rules are useless if the underlying data is unreliable. A QAP scoring rule that awards points for QCT status is a SQL query on the QCT layer; the rule is trivial, the data ingestion is the work. The pipeline puts the data ingestion first as a fully-tested layer with explicit citations to each source, then adds scoring as a layer on top that reads from the validated data.

The architectural commitment underneath this is that every data point in the pipeline carries a citation pointer back to the source API call, the date it was fetched, and the version of the source data. A score that depends on a designation is a score that can be defended by walking the citation chain from the output back to the source. ==The pipeline is auditable from output to source, and that auditability is the discipline that makes the output credit-committee-ready.==

The transferable lesson: in any analysis pipeline that fuses multiple data sources, build the data layer as the contract first. Scoring rules and rendering layers come second.

---

## Decision 2: separate the parcel-scoring engine from the corridor-rollup engine

The pipeline operates at two granularities: per-parcel and per-corridor. Each parcel gets scored independently against the QAP scoring rules. Corridors are then computed as the aggregation of their member parcels, with additional corridor-level signals (median demographic profile, neighbor designation overlap, transit access patterns) that only make sense at the corridor scale.

The decision was whether to fuse these into a single scoring pass or to separate them.

I separated them. The reasoning: per-parcel scoring is a stateless, parallelizable operation (each parcel scores against the same rule set, no inter-parcel state). Corridor-rollup is stateful (membership matters, ordering matters, neighbor counts matter). Mixing the two into a single pass would have required passing corridor state into the per-parcel scoring function, which would have broken parallelism and made debugging harder.

The architectural pattern: `score_parcels.py` takes a list of parcels and returns a list of scored parcels. A separate corridor-rollup module takes a set of scored parcels and a corridor definition, and returns a corridor-level summary. The two modules can be developed, tested, and run independently.

==The transferable lesson: when an analysis pipeline operates at two granularities, separate the granularities into distinct passes. The smaller granularity should be stateless. The larger granularity reads from the smaller one's output and adds the aggregation logic.==

This is the same pattern as Marketing Bot v2's pass contracts and the same pattern that makes the Atlas signal pipeline composable.

---

## Decision 3: gap-fill documents as a first-class artifact

The pipeline produces structured data outputs (CSV, Excel, JSON) for the underwriter. It also produces a set of markdown documents called gap-fill files, each scoped to a specific knowledge gap that the structured data cannot resolve: WHA payment standards that are not publicly posted, DNREC brownfield grant eligibility that requires a phone call to clarify, CDBG application windows that are administratively closed.

Each gap-fill file is a structured markdown document with: the gap (what is unknown), the best-available information, the source that needs to be contacted to resolve the gap, and the placeholder value used in the model until the gap is filled.

The decision was whether to bury the gaps in the analyst's head or to surface them as artifacts.

Surfacing them as artifacts is the discipline. Every gap-fill file is a TODO for the underwriter. The application deadline is a function of how many gap-fill items remain open, not a function of when the underwriter remembered to make the next call. ==Gap-fill files are the difference between a pipeline that pretends to be complete and a pipeline that is honest about what it does not know.==

The transferable lesson: in any analysis system that depends on non-public data sources, the unknowns are first-class artifacts. List them, source them, and track them to closure. Hidden gaps are how applications miss deadlines.

---

## Decision 4: render the LP memo, do not let the LLM compose it

The pipeline ends with a structured payload that contains everything a Limited Partner memo needs: deal summary, designation stack, QAP scoring estimate, funding stack, pro forma assumptions, key risks, source citations. The question was whether to feed that payload to an LLM and let the model write the memo, or to render the memo deterministically from the payload.

I render it deterministically. The reasoning matches the architectural pattern from Marketing Bot v2: the LLM produces structured outputs at each pass, but the final composition into a branded document is a deterministic renderer reading from the structured payload. Re-rendering the memo with different branding, different ordering, or different section emphasis is a renderer change, not an LLM call.

The cost of this discipline is real. The renderer is more work to maintain than a "send the payload to the LLM and let it write" approach. The benefit is that the memo is exactly what the underwriter expects every time, the numeric claims map to the structured payload exactly, and the memo can be regenerated for free when the underlying data changes.

==The transferable lesson: structured data is the source of truth. The rendered output is a deterministic view of that data. Mixing the two destroys auditability and re-renderability.==

---

## Decision 5: nightly refresh with explicit drift detection

The pipeline runs on a nightly cron against the source APIs. Each refresh writes its outputs alongside the prior night's outputs and produces a drift report: which parcels gained or lost designation status, which census tracts shifted demographic bands, which DDD boundaries changed, which corridor scores moved by more than a configurable threshold.

The decision was whether to overwrite the prior outputs (simpler) or to maintain the historical trail (more work, more disk).

I maintain the trail. The reasoning is operational: an application that cited a designation on the date of submission needs to be defensible against the source data on that exact date, even if the designation has since changed. The historical trail makes that defense possible. The drift report also surfaces the cases where overnight refresh changed something that the underwriter needs to know about before they ship the next deliverable.

==The transferable lesson: in any pipeline whose outputs get cited in time-bound deliverables (applications, filings, reports), preserve the historical state. The application is dated. The data has to be dated to match.==

---

## Cost economics

The pipeline runs on a small dedicated environment. Compute is rounding error. The data sources (Census ACS, HUD QCT, IRS OZ, USDA Food Atlas, state DDD, the regional land bank's published inventory) are all free public sources accessed via APIs or via cached PDF downloads where APIs are unavailable.

Per-corridor cost at current operating scale:

- **Compute and storage**: a few dollars a month for the whole pipeline. No LLM costs in the data ingestion path; the LLM is only used in the optional narrative-generation step downstream.
- **Engineering maintenance**: a few hours per quarter to handle source-API changes (HUD QCT format shifts annually, USDA Food Atlas refreshes on its own cadence).
- **Per-corridor LLM cost** (for the narrative pass at the end): a few dollars per corridor, total.

The labor cost is what the pipeline displaces. The conventional research workflow on a corridor opportunity is two to three weeks of senior-analyst time. The pipeline compresses that to under a day, including the manual review pass that catches anything the model misread. At Mosaic's engagement economics, that compression is the difference between evaluating a handful of corridors per year and evaluating one or two per week.

==The headline number: the pipeline pays back its engineering cost on the first corridor it surfaces that the conventional research would have missed. The freshness alone justifies the build.==

---

## What I would change starting over

Three things.

1. **Express the QAP scoring rules as a versioned manifest, not as Python functions.** The current scoring rules are encoded in Python. Each state QAP has its own scoring rule set, and the rules change year over year. A YAML or JSON manifest that the scoring engine loads at runtime would let me ship new state QAPs without touching the engine code, and would let me version-control the rule set independently of the engine.

2. **Move the source-API ingestion to a job queue.** The current ingestion runs as a single nightly script. As I added more sources, the script grew. A proper job queue (each source as its own job, with explicit retry and dead-letter behavior) would let me handle source-API failures gracefully without re-running the whole nightly pass.

3. **Build the LP memo renderer as a templated system, not as procedural code.** The current renderer is procedural Python that writes out HTML and Excel. A templating system (Jinja2 with explicit section partials) would let me ship new memo formats without rewriting the renderer.

None of these are critical at current scale. All three become important as soon as the pipeline serves a second corridor at a different state's QAP, or as soon as a second underwriter wants a different memo format.

---

## Closing

The corridor pipeline is the project in my portfolio that most directly demonstrates how I architect data-fusion-plus-scoring systems for high-stakes low-volume domains. Public-data-first, deterministic rendering, explicit gap tracking, audit trail by default, scoring engine separated from data layer separated from renderer.

If you are building something similar in a different domain (any analysis pipeline where you fuse multiple public data sources, score against a domain-specific rubric, and produce a deliverable that has to survive credit-committee or regulatory review), the questions worth asking are: how do you separate the data layer from the scoring layer so each can be tested independently; how do you handle the gaps that public data cannot fill without burying them in analyst heads; how do you preserve the historical state so time-bound deliverables stay defensible; and how do you render the final output deterministically so re-rendering is free.

Those are the questions this post is meant to answer.

For the customer-facing data-fusion counterpart that runs on a different domain, see [Inside Atlas](/blog/inside-atlas.html). For the production-ML calibration discipline that shaped the score-review workflow, see [Inside TrialEdge](/blog/inside-trialedge.html). For the LIHTC field-note that explains the analytical pattern this pipeline implements, see [stacking R/ECAP, QCT, OZ, and DDD](/blog/field-lihtc-triple-stack.html).

---

Russ
