---
title: "Inside the Mosaic feasibility workflow: how I underwrite CRE deals with Claude"
slug: inside-cre-feasibility
archetype: thesis
date: 2026-05-19
project: cre
version: prompt-suite-v2
status: published
tags: [cre, underwriting, prompt-engineering, claude, mosaic, eat-your-own-dog-food]
summary: The Mosaic feasibility workflow is not deployed software. It is a Claude prompt suite I run by hand inside my CRE advisory practice to produce bank-quality feasibility studies in 90 minutes instead of 30 hours. This post walks the prompt architecture, the Standard Underwriting Schema v2.0 framework underneath it, and what would change when it gets deployed as Q3 software.
---

# Inside the Mosaic feasibility workflow: how I underwrite CRE deals with Claude

By Russ. Current iteration is a prompt suite, not deployed software. 2026.

---

## What this post is

The Mosaic feasibility workflow is the most heavily-used AI system in my actual professional life. It does not live in a repo. It lives inside Claude. I run it by hand, one deal at a time, inside my CRE advisory practice (Mosaic Capital Solutions, LIHTC and CRE underwriting in the Southeast and Mid-Atlantic).

The output is a feasibility study at the quality bar a regional bank or a deal sponsor expects: dual-scenario NOI analysis, DSCR at offer and at walk, four creative structures (seller note, earnout, JV/LP, master lease), and a ranked list of probable lenders by counterparty type (bank, credit union, debt fund). The work I do for a single feasibility study, before the workflow, was roughly 20 to 40 hours of senior-analyst time. With the workflow, the same study takes 60 to 90 minutes of my time, plus a final hour of validation against the actual deal documents.

I am writing this post for two audiences. The first is engineers and architects evaluating whether to use AI in their own domain expertise, not just to ship AI products. The second is real estate professionals who want a window into how a careful prompt suite changes the unit economics of underwriting.

The post also exists because the workflow is on a roadmap to become deployed software in Q3 2026. Writing it down now is the first step toward shipping the v1 product.

---

## The problem

A CRE feasibility study answers four questions:

1. Does the deal generate enough net operating income to service the debt at the offered price, both in the base case and under reasonable stress?
2. What is the debt-service coverage ratio at offer, and what is the price at which the DSCR walks below the lender's covenant?
3. If the cash purchase math is marginal, what creative structures (seller carry, earnout, JV equity, master lease) bring the deal back to feasible?
4. Which lenders in this asset class and corridor are most likely to fund this specific deal at terms the sponsor can accept?

Three properties of this domain shape every architecture decision:

1. **High-stakes, low-volume.** A bad feasibility study causes a real principal to lose six or seven figures of equity on a closed deal that should not have closed. Volume is low: a sponsor produces 4 to 12 of these per year. Sample sizes for any kind of supervised learning do not exist. Each deal is essentially a custom domain with shared structure.

2. **The framework matters more than the model.** A senior analyst applying a consistent underwriting schema across 12 deals produces comparable, defensible work. An analyst (or a model) doing creative analysis per deal produces output that is impressive in isolation and useless in aggregate. ==The schema is the discipline; the schema applied is the deliverable.==

3. **Lender matching is constraint satisfaction, not ranking.** There are roughly 30 to 60 active lenders for any given asset class in any regional market. Each has a rate sheet, an LTV ceiling, an asset-class preference, a recent deal history, and a counterparty-trust posture. Matching a specific deal to the right counterparty list is a constraint-satisfaction problem (does this deal fit inside each lender's constraints?), then a ranking problem (across the lenders that pass, which is most likely to fund at acceptable terms?). Neither step is well-served by general-purpose LLM reasoning; both are well-served by an LLM working over structured data.

The Mosaic feasibility workflow is shaped by these three constraints in order.

---

## The system, such as it is

There is no application. There is no deployed service. The system is:

- **The Standard Underwriting Schema v2.0**, a documented framework that defines the four required output dimensions (NOI dual-scenario, DSCR, creative structures, lender matching) and the inputs each requires.
- **A Claude prompt suite** I have iterated over several deals, encoded in a Markdown document that I paste into a Claude conversation at the start of each feasibility engagement. The prompt loads the schema, defines the output format, and locks the voice and the framework discipline.
- **A set of reference Mosaic feasibility studies** (Wilmington corridor multifamily, Sandcastle/Indigo hospitality, Mulberry Creek multifamily-to-mixed, Caroline County data center site, Langston Lane multifamily, 3126 16th St NW DC mixed-use) that I attach as few-shot examples so the model produces output that matches the format and the depth my counterparties expect.
- **A discipline of validating every numeric output against a separate calculator.** Every NOI number, every DSCR number, every cap-rate-derived value, gets re-computed by hand in a spreadsheet before the study ships. The Claude pass is the writer; the spreadsheet is the auditor.

That is the entire stack. There is no Cloudflare, no Supabase, no database. The state lives in a Claude conversation and the audit lives in Excel.

---

## The prompt structure

The prompt loaded at the start of every feasibility engagement looks roughly like this:

```
SYSTEM: You are Mosaic's underwriter. Apply Standard Underwriting Schema v2.0.

DEAL: {address, asset_class, sqft, price, vintage, units_or_keys, market}
ECONOMICS: {rent_roll, opex_breakdown, capex_planned, financing_assumed}
COMPARABLES: {within-corridor sales last 24 months, with notes}

OUTPUT (JSON, strict):
  noi_base, noi_stress (-15% revenue, +8% opex),
  dscr_at_offer, dscr_at_walk,
  structures: [seller_note, earnout, jv_lp, master_lease],
  lender_probability: {bank, credit_union, debt_fund}
```

That structure is the entire piece of intellectual property in the prompt suite. Several things to call out about it:

**The schema is encoded as JSON.** Claude produces structured output, not narrative. The narrative analysis comes downstream from the structured output, not the other way around. This is the same architectural pattern as Marketing Bot v2's pass contracts: the structured payload is the source of truth. Any human-readable rendering is a downstream view of that payload.

**The stress case is fixed, not learned.** Revenue down 15 percent and opex up 8 percent is the Mosaic standard stress. It is not the "right" stress in every market. It is the standard I apply across every Mosaic engagement so the outputs are comparable across deals. ==Consistency of the framework matters more than per-deal optimization of the framework. This is the same discipline as a credit-rating agency: the discipline of applying the same lens is the source of the lens's value.==

**Lender probability is structured, not narrative.** The output is a probability score per counterparty type (bank, credit union, debt fund) with sub-scores per named lender within each type. The named lenders come from a corridor-specific list I maintain by hand. That list is the part of the workflow most ripe for replacement when the system becomes deployed software in Q3.

**Four creative structures, always.** Seller note, earnout, JV/LP, master lease. Every feasibility study evaluates all four, even when the base-case cash deal is feasible. The reason is that the structures are options on the deal that change the sponsor's downside. A feasibility study that does not evaluate them has failed at its job.

---

## The few-shot pattern

Each new feasibility engagement starts with the schema prompt plus 2 to 3 reference studies attached as few-shot examples. I anonymize the examples when necessary. Principals never appear in public artifacts. I reference corridors and asset classes. The model produces output that matches the depth, the voice, and the structural completeness of the references.

This pattern is the single highest-leverage decision in the workflow. The model alone produces feasibility-shaped output that is 70 percent of what I need. The model with the schema prompt and 3 references produces output that is 95 percent of what I need. The remaining 5 percent is the validation pass.

==Few-shot examples are not a hack; they are the cheapest way to encode domain discipline into a model that has not been trained on your firm's discipline.==

---

## The validation pass

I re-compute every numeric output by hand in a spreadsheet. I check NOI against the rent roll and the opex assumptions. I check DSCR against the financing assumptions and the noi_base / noi_stress outputs. I check the walk-DSCR price by solving the lender's covenant inequality for price. I check the creative structures for arithmetic consistency. A seller note at 6 percent for 7 years has a specific payment. The model has occasionally rounded it wrong on first generation.

The validation pass takes 30 to 45 minutes per study. It is the single most important step in the workflow.

==The architectural principle: any LLM-produced numeric claim that goes to a counterparty must pass a separate deterministic check before it ships. The model is the writer. The spreadsheet is the auditor. The auditor never gets fired.==

---

## What this looks like as deployed software

The Q3 2026 roadmap version of the system is not a chat interface around the existing prompt. It is a structured application with the following shape:

- **A deal-entry form** that captures the structured inputs (address, asset class, financials, comparables) as typed data, not as paste-into-chat narrative.
- **A schema-loaded LLM pass** that produces the JSON output, same as the current prompt suite, but with stricter validation on every numeric field and a citation pointer back to the input data on every claim.
- **A deterministic validation layer** that re-computes every numeric output and surfaces discrepancies before the study renders.
- **A lender database** that replaces my hand-maintained corridor list with a structured table of lenders, their rate sheets, their LTV ceilings, their asset-class preferences, and their recent deal history scraped from public filings. The lender-probability output becomes a database query plus a ranking pass, not an LLM hallucination over an LLM-recalled list.
- **A rendered output** in the format Mosaic counterparties already expect (PDF, with the firm's branding), generated from the JSON payload via a deterministic composer (same pattern as Marketing Bot v2).

The architecture for this is small. The product is built in 4 to 6 weeks. The discipline of the workflow is the IP. The software is the leverage.

---

## Cost economics

Today, in prompt-suite form:

- **Per feasibility study (LLM cost):** $0.50 to $1.50 in Claude tokens, depending on the size of the rent roll and the number of comparables loaded.
- **Per study (my time):** 60 to 90 minutes for the prompt-driven generation, plus 30 to 45 minutes for the validation pass, plus the variable time to fetch comparables. Total: 2 to 3 hours of my time per study.
- **Per study cost basis (without the workflow):** 20 to 40 hours of senior-analyst time. At the rate Mosaic engagements support, this is the difference between a low-margin and a high-margin practice.

==The workflow does not save money on tokens. It saves time. The token cost is rounding error compared to the labor cost it displaces.==

Forecast at Q3 software-tier deployment:

- **Per study (software cost):** $1 to $3 in LLM tokens (more passes, structured validation, lender database calls), plus $0.10 in database and infrastructure.
- **Per study (operator time):** 15 to 30 minutes for deal entry plus 15 minutes for validation review. About one third of the current workflow time.
- **Pricing tier supported:** the same study that takes a senior analyst 30 hours can be productized as a $1,500 to $3,500 per-study product or a $500 to $1,500 per-month subscription with N studies included. The math works because the unit cost is $3 in software and 30 minutes of operator time.

---

## What I would change starting over

The workflow as a prompt suite has been iterated across roughly two dozen feasibility studies. Three changes are queued for the deployed version:

1. **Replace the hand-maintained lender list with a database.** This is the highest-leverage change. Lender preferences shift every quarter. My hand-list goes stale on a 6-month rolling basis. A scraped, structured lender database with quarterly refresh is the right answer.

2. **Add citation pointers on every numeric claim.** The current prompt produces numbers without traceable derivation. The validation pass catches the wrong ones. The deployed version should attach a derivation tree (this NOI is computed from this rent roll line, this opex assumption, this stress case) so validation becomes a click-through audit instead of a separate spreadsheet.

3. **Bring the four creative structures into a structured-modeling pass instead of an LLM pass.** The arithmetic on a seller note or an earnout is exact. An LLM occasionally rounds wrong. The deployed version should compute structures deterministically and use the LLM only for the narrative framing of when each structure is the right choice.

---

## Closing

The Mosaic feasibility workflow is the system in my portfolio that most directly proves the FDAA value proposition: I do my own domain's work with AI, at a quality bar my counterparties accept, at a cost basis that changes the economics of the practice. The workflow is not deployed software, and that honesty is the post's point. ==The discipline of running a careful, schema-loaded LLM pass with deterministic validation, every time, is what makes the workflow work; the discipline is portable to any high-stakes low-volume domain where consistency of framework beats per-case creativity.==

If you are bringing a system like this into a regulated finance practice (LIHTC syndication, lender QA, deal underwriting at a regional bank, family-office acquisition diligence), the questions worth asking are: how do you encode framework discipline into a prompt suite without depending on the model to know your firm's standards; how do you validate numeric outputs deterministically before they leave the system; and what does the path look like from a prompt suite the senior partner runs by hand to a deployed software product the firm sells.

That is the path Mosaic is on. The Q3 software ship will be the first post in this series that points at a deployed URL.

---

Russ
