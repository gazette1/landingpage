---
title: "Field Note: stacking R/ECAP, QCT, OZ, and DDD for LIHTC competitive advantage"
slug: field-lihtc-triple-stack
archetype: field-note
date: 2026-05-19
project: null
version: null
status: published
tags: [lihtc, cre, affordable-housing, mosaic, public-data, ai-architecture, fdaa]
summary: A 16-unit scattered-site LIHTC corridor in Wilmington East Side sits on a parcel that qualifies simultaneously as a Qualified Census Tract, a Qualified Opportunity Zone, a Downtown Development District, an R/ECAP, and a USDA food desert. Each designation independently shifts the deal economics. Stacking them is the work. This Field Note walks the framework Mosaic uses to identify and stack these designations, and what an AI architect would do to compress the research from three weeks to three hours.
---

# Field Note: stacking R/ECAP, QCT, OZ, and DDD for LIHTC competitive advantage

By Russ. Field Note, 2026.

---

## The existing approach

A 9 percent LIHTC application in any state is a competitive scoring exercise. The Qualified Allocation Plan (QAP) defines how state housing finance agencies (DSHA in Delaware, DHCD in Maryland, NJHMFA in New Jersey, on through every state) score applications against a fixed number of available credits. Projects compete on a per-point basis. The applicant with the higher score wins the allocation. Everything else is execution.

Most emerging developers approach the QAP as a single-source scoring exercise: read the QAP, count the points your project earns by default, hope it is enough. The math rarely works. A first-time developer with no completed deal earns close to zero on the "experience" line, takes a known hit on the "balanced housing" geography line in jurisdictions that reward suburban siting, and ends up needing to make up 20 to 30 points elsewhere to compete.

The competitive way to play the QAP is to **stack distress designations on the parcel** so the project earns points from multiple federal, state, and local programs at once, and to layer those designations against complementary funding sources that prefer the same geographies. Each designation does a different job:

- **Qualified Census Tract (QCT).** HUD designation. Triggers the 30 percent eligible basis boost in LIHTC, which roughly translates to a third more equity per dollar of construction cost. Mapped by HUD annually; eligibility is determined by tract-level poverty and rent-to-income ratios.
- **Qualified Opportunity Zone (OZ).** IRS/Treasury designation, active through end of 2028 under OZ 1.0. Layers capital gains deferral and ten-year basis step-up on the equity side of the stack. Worth real money to investors and meaningfully expands the LP universe willing to commit to the project.
- **Downtown Development District (DDD).** State or local designation. In Delaware, triggers a 20 percent rebate on Qualified Real Property Investment plus a dedicated state historic tax credit set-aside. Stacks cleanly with LIHTC.
- **R/ECAP (Racially/Ethnically Concentrated Area of Poverty).** HUD definition. Does not directly add points but is required narrative framing for the fair-housing analysis and triggers eligibility for several CDBG and HOME funding streams.
- **USDA LILA food desert.** USDA Economic Research Service designation. Adds to the community-need narrative and unlocks some federal grant streams. Does not subtract LIHTC points.

A parcel that fires on all five gets a basis boost, a tax-advantaged investor base, a state rebate, a fair-housing narrative, and access to a wider grant ecosystem. A parcel that fires on one of the five is a regular LIHTC application.

## Where it works

The five-designation stack works because the agencies that issued the designations are not coordinating. Each program was designed independently. The applicant who knows how to look across all five gets compounding advantage that none of the program designers intended. The geography that produces a five-designation overlap is rare; Mosaic's recent Wilmington East Side work sits on a stack that fires on all five plus a sixth (CCRP, Community Center Revitalization Plan, for an additional state scoring tier).

The work to identify a five-designation stack is a research project of its own. It is also a research project that an AI architect can compress materially.

## Where it breaks

The break comes when the developer treats the designations as fungible. They are not. QCT and OZ have different geographic boundaries even when they overlap by tract. DDD boundaries are city-defined and frequently disagree with federal census-tract boundaries. R/ECAP is a HUD analytical overlay, not a program. Food deserts are USDA. Each designation has a different effective date, a different renewal cadence, and a different scoring weight in the QAP.

An emerging developer who confuses two of the five designations writes an application narrative that references the wrong program rules and loses scoring credibility. The state housing finance agencies catch these errors in the first read. The application gets ranked accordingly.

The other break is that the geographies move. QCT designations refresh annually. OZ 1.0 expires end of 2028. DDD boundaries can be expanded or contracted by city council vote. An application that cites the FY2025 QCT designation for a tract that lost QCT status in FY2026 is wrong on the application date. The research is not one-time work; it is continuously stale.

## What an AI architect would change

The current Mosaic workflow on a new corridor opportunity takes roughly three weeks of senior-analyst time to compile a complete designation-stack profile, including direct queries against the Census Bureau ACS API, HUD's QCT and SADDA tables, the IRS OZ census tract lists, USDA's Food Access Research Atlas, and the relevant state DDD or equivalent programs. Cross-referencing those layers against the project site, the surrounding tracts, and the corridor-level demographic data is hand work in Excel and a working PDF dossier.

An AI architect would architect this differently:

**A structured data layer** that maintains a parcel-keyed table of all five designation statuses, refreshed nightly against the source APIs. Census ACS is free. HUD QCT is free. IRS OZ is free. USDA Food Atlas is free. DDD boundaries are typically GIS-published. The data layer is a Postgres table with one row per parcel and one column per designation, plus citation pointers to the source data for each value.

**A retrieval-augmented narrative layer** that, given a parcel, pulls the designation status, the per-designation scoring implication for the relevant QAP, and the historical comparable deals that used similar stacks. The output is a structured payload the underwriter reads, not a chat conversation the underwriter has to drive.

**A QAP-mapping pass** that takes the designation stack and produces a per-line scoring estimate for the target QAP, with traceable references to the QAP section that awards each line. The underwriter sees a defensible score before they decide whether to commit time to the application.

**A continuous-refresh discipline** that flags when a designation has changed since the last application review. The freshness is the value; a designation that flipped between application cycles is the kind of error that loses applications and reputations.

The architecture is not novel. It is the same multi-source data fusion pattern that powers off-market property scoring in [Atlas](/blog/inside-atlas.html), applied to a different domain. Public-records-first, paid-enrichment only on parcels that earn it, structured output the underwriter can read and defend.

## What it would cost

The compute cost is rounding error. Census, HUD, IRS, USDA, and DDD sources are all free. The LLM cost to produce a per-corridor designation-stack narrative is in the low single-digit dollars per corridor at current model pricing. The deterministic data layer runs on a small Postgres instance and a nightly cron.

The labor cost is the real economics: three weeks of senior-analyst time per corridor at conventional rates, compressed to under an hour of operator review on the AI-produced output, including the manual validation pass that catches any designation the model misread.

That compression is the difference between Mosaic evaluating one or two corridor opportunities per quarter and evaluating ten. It changes the firm's deal-sourcing economics, not the per-deal economics.

## What would not change

The QAP itself is a state-by-state political artifact, and the application narrative still requires senior judgment about how to frame the project for the local housing finance agency. The narrative voice, the community-engagement letters, the partner-developer LOIs, the environmental and zoning posture, all stay senior-analyst work. The AI architect's job is to compress the data-gathering and pre-scoring work so the senior analyst spends time on the parts that actually move the application score.

==The architectural principle: an AI system that automates the data gathering and pre-scoring releases the senior analyst to do the parts only a senior analyst can do. The domain expertise does not get automated; the data-fetching does.==

## Closing

A 16-unit LIHTC corridor with a five-designation stack is the kind of opportunity that exists in every state, in every market, and in every QAP cycle. The work to find it, characterize it, and score it competitively is the work most emerging developers do not have the bandwidth to do well. That bandwidth gap is where the AI architect adds value.

If you are a regional bank, a CDFI, a state housing finance agency, or a sponsor evaluating how to systematize the LIHTC research-and-scoring workflow, the questions worth asking are: how do you maintain the structured data layer against five-plus public APIs without losing freshness; how do you encode QAP scoring rules in a way that handles state-by-state variation; how do you produce a defensible per-corridor scoring estimate the underwriter can present to a credit committee; and how do you compress the research timeline from three weeks to three hours without losing the senior judgment that makes the application win.

Those are the questions this Field Note is meant to answer.

For the production-ML calibration discipline behind the score-review workflow Mosaic uses, see [Inside TrialEdge](/blog/inside-trialedge.html). For the customer-facing signal-composition counterpart that uses the same multi-source fusion shape on a different domain, see [Inside Atlas](/blog/inside-atlas.html). For the prompt-suite workflow that produces Mosaic feasibility studies in 90 minutes, see [Inside the Mosaic feasibility workflow](/blog/inside-cre-feasibility.html).

---

Russ
