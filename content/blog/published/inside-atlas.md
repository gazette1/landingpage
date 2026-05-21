---
title: "Inside Atlas: a 19-signal composition scorer for off-market real estate"
slug: inside-atlas
archetype: thesis
date: 2026-05-19
project: atlas
version: POC / 2026
status: published
tags: [signal-composition, half-life-decay, vision-llm, gemma-3-27b, street-view, attom, real-estate, public-records, cost-economics]
summary: Atlas surfaces off-market real estate leads by composing 19 distinct signal types (13 from public records, 6 from vision) across 568,135 parcels in Wake and Durham counties, each signal weighted with an exponential half-life decay calibrated to how fast that signal stales. Vision signals come from Google Street View and satellite image pairs scored by Gemma 3 27B (vision-capable). Same model generates the outreach letter. Total POC spend across all paid APIs is $54. This post walks the signal pipeline, the scoring engine, and the cost-architecture decisions that make pre-list lead surfacing work without licensing fees dominating the unit economics.
---

# Inside Atlas: a 19-signal composition scorer for off-market real estate

By Russ. POC build, 2026. Originated as Gazette in 2023 (probate plus newspaper scanning), rebuilt and rebranded as Atlas after the signal composition layer became the architectural center of the system.

---

## What this post is

Atlas is a multi-signal distressed-property sourcing tool for Wake and Durham Counties, North Carolina. It is currently at POC stage, internal to a single wholesale operator team. The system tracks 568,135 parcels (Wake: 435,296, Durham: 132,839), generates active signals from county records, court filings, and computer-vision-scored imagery, and ranks parcels by a composition score that weights each signal type by an exponential half-life calibrated to how fast that signal stales. The current snapshot: 15,818 active signals, 7,348 scored leads, 214 leads at score ≥ 70, 122 demo-eligible leads with both ATTOM property enrichment and a vision-scored image. Total POC spend across all paid APIs is $54.

The system originated as **Gazette** in 2023, a probate plus local-newspaper scanner. Gazette worked, but the listed-distress signals it surfaced were the same signals every other operator already had. The architectural turn that produced Atlas was realizing the scoring layer is the product, not the source list. Once 19 signals across multiple source classes can be composed deterministically with half-life decay and explicit combination bonuses, the operator gets parcels other operators do not have, because the ranking criterion is not "appears on this list" but "fires on multiple time-weighted signals that this rule set says compound."

This post is for engineers and architects evaluating whether a similar composition-scoring shape applies to a different domain. The signal-composition discipline, the half-life decay design, the vision-LLM extraction pattern, the dual-imagery pairing for vision scoring, and the cost economics are the parts most likely to transfer. The off-market real estate framing is the vehicle.

---

## The problem

Off-market real estate has been a list-driven business for thirty years. Cash buyers, fix-and-flippers, and rental aggregators pull from the same vendors: tax delinquency, code violations, probate, divorce, absentee owners. By the time a parcel hits a vendor list, it has been mailed thirty times.

Three properties of this domain shape every architectural decision in Atlas:

1. **Composition beats source-pulling.** A parcel that appears on a tax-delinquency list is interesting. A parcel that appears on a tax-delinquency list, has an active code violation, has an absentee owner, sits in a high-vacancy census tract, and visually presents as neglected from Street View is not just five times as interesting; it is qualitatively a different lead. The architecture that wins is the one that detects composition, not the one that pulls a longer list. ==The scoring engine is the product. The sources are inputs.==

2. **Signal aging is not linear.** A foreclosure filing fresh today is a hot lead; the same filing 24 months ago is a different signal, because the parcel either resolved or transferred. A probate filing 12 months old is still actionable; a tax-delinquent flag 12 months old is half as actionable. Signal weights have to decay, and the decay rate has to be calibrated per signal type. Linear aging loses information; ignoring aging is worse.

3. **Per-unit economics are determined by the enrichment pipeline, not the source layer.** Public records (county tax, court filings, code violations) are free to ingest. The cost stack is dominated by ATTOM owner-and-property enrichment ($0.10 per parcel), Google Street View ($0.007 per image), Google Static Maps satellite ($0.002 per image), and Gemma 3 27B vision inference ($0.005 per call). The architecture that ships profitably at small operator volume is the one that enriches only the parcels the scoring layer has already ranked, not the one that enriches every parcel in coverage. ==Top-of-funnel public records are free; bottom-of-funnel enrichment is paid; the architecture is the rule that decides which parcels cross the line.==

Atlas is shaped by these three constraints in order.

---

## System overview

The actual stack at POC:

- **Next.js 15 (App Router), TypeScript strict, React 19** for the application and the operator dashboard.
- **Drizzle ORM on Supabase Postgres** as the parcel-keyed data store, signal log, scoring breakdown cache, and CRM state.
- **Ollama Cloud running Gemma 3 27B (vision-capable)**, accessed via the OpenAI SDK pointed at `https://ollama.com/v1`. Same model serves vision scoring AND outreach letter generation; one model boundary, two jobs.
- **Vercel deploy plus Vercel Cron** for source scheduling.
- **Sentry** for error tracking across the stack.
- **County-direct scrapers** under `lib/sources/wake/` and `lib/sources/durham/` for tax delinquency, tax foreclosure listings, code violations, recorded deeds.
- **NC eCourts scrapers** under `lib/sources/ecourts/` for probate, lis pendens, foreclosure notices, mechanic liens, executor and trustee deeds.
- **PACER federal court** under `lib/sources/pacer/` for bankruptcy filings.
- **Enrichment layer** under `lib/enrichment/` for ATTOM (owner, property, AVM), Google Street View, Google Static Maps satellite, vision scoring via Gemma, NC Secretary of State (for LLC member walking), and Census ACS B25002 for tract-level vacancy rates.
- **Scoring engine** under `lib/scoring/` implementing the 19-signal composition score with exponential half-life decay, explicit combination bonuses, standing-condition bonuses, raw-land suppression rules, and a 0-100 cap.
- **Personalization layer** under `lib/personalization/` for Gemma-generated outreach letters with parse-time voice validation.
- **Cost telemetry** under `lib/telemetry/` writing every paid API call to an `api_calls` table with `cost_usd`. Non-negotiable.

The stack runs on a single repo. Production is on Vercel. Letters are generated by Atlas and mailed manually by the operator team; outbound mail is not yet automated at POC.

---

## The signal pipeline

19 signal types, grouped by source class.

### Public-records signals (13 types, deterministic extraction from public sources)

Each signal type has a base weight and a half-life in months. The half-life is calibrated to how fast the signal stales as actionable intelligence.

| Signal | Base | Half-life | Source |
|---|---|---|---|
| `tax_delinquent` | 25 (+5 if high-equity) | 24 mo | County tax records |
| `probate_filed` | 30 | 12 mo | NC eCourts |
| `foreclosure_filed` | 30 | 6 mo | County tax foreclosure |
| `foreclosure_notice` | 25 | 4 mo | Court records |
| `lis_pendens` | 20 | 12 mo | Court records |
| `mechanic_lien` | 10 | 18 mo | Court records |
| `executor_deed` | 15 | 6 mo | County deed records |
| `trustee_deed` | 5 | 6 mo | County deed records |
| `deed_in_lieu` | 25 | 6 mo | County deed records |
| `quitclaim` | 8 | 12 mo | County deed records |
| `code_violation` | 12 | 18 mo | County code enforcement |
| `expired_permit` | 8 | 24 mo | County permit office |
| `bankruptcy_filed` | 25 | 12 mo | PACER (federal court) |

The half-life shape is exponential: `decayedWeight = base * 0.5 ^ (ageMonths / halfLife)`. A 6-month half-life means the signal contributes half its base weight 6 months after firing. ==The half-life-per-signal design is the central scoring discipline. A tax-delinquency that surfaced last month is not the same lead as a tax-delinquency that surfaced two years ago; the score has to reflect that, and it has to reflect it differently for each signal type.==

Half-life calibration was joint between me and the operator over multiple POC iterations. We did not train these weights; we set them, then surfaced the resulting top-band leads to the operator, then adjusted based on the operator's review of which leads converted and which did not.

### Vision signals (6 types, extracted by Gemma 3 27B from Street View plus satellite pairs)

| Signal | Base | Half-life | Threshold |
|---|---|---|---|
| `visual_neglect_high` | 20 | 24 mo | Aggregate score ≥ 70 |
| `visual_neglect_medium` | 10 | 24 mo | Aggregate score 50-69 |
| `visual_roof_distress` | 12 | 24 mo | Component score ≥ 70 |
| `visual_yard_distress` | 6 | 18 mo | Component score ≥ 70 |
| `visual_structural_distress` | 18 | 36 mo | Component score ≥ 70 |
| `visual_likely_vacant` | 15 | 12 mo | `no_vehicles` + `occupancy_signal=likely_vacant` |

Vision signals come from a Gemma 3 27B pass over a per-parcel image pair: one Google Street View image taken from the street, one Google Static Maps satellite image looking down on the parcel. The two views are sent to the vision model with separate prompts. The model produces sub-scores (0-100) for overall neglect plus component scores for roof, yard, structure, and occupancy. The 16 vision tags the model uses are explicitly enumerated (`overgrown_yard`, `debris`, `broken_window`, `peeling_paint`, `missing_roof_section`, `boarded_window`, `no_vehicles`, `multiple_vehicles`, `well_maintained`, `recently_painted`, `vacant_indicators`, `occupied_indicators`, `fire_damage`, `water_damage`, `graffiti`, `trash_on_lawn`).

The prompt is conservative on purpose: ==score 70+ should be reserved for properties with multiple visible defects. A merely modest or older home is not neglected. Do not infer beyond what is visible.== The model is told this in the system prompt. The conservatism is the discipline that prevents the vision signal from polluting the scoring layer with false positives at the top band.

**Why Gemma 3 27B and not a custom CNN.** A vision LLM with a tight prompt and a strict output schema produces vision signals that are 90 to 95 percent of the quality of a domain-trained CNN at 5 to 20 percent of the engineering cost to ship. At 181 image pairs (current vision coverage), the engineering investment in a custom CNN would not have paid back. At 10× the scale or 2× the precision requirement, the math flips. The architecture supports the swap; the eval rig would catch the moment it makes sense.

**Why one model for both vision and generation.** Gemma 3 27B handles both the vision scoring and the outreach letter generation. The model boundary is the same; the prompts are different. Operational simplicity is real value: one model to monitor, one set of credentials, one cost line. The cost per vision call is $0.005, the cost per letter generation is $0.005, both via Ollama Cloud.

### Standing-condition modifiers (not signals; ambient context)

- **`is_absentee`** (+5): owner mailing address differs from parcel address.
- **`long_tenure`** (+6): owner has held the property for 20+ years or sale date is unknown.
- **`adjacent_distress_count`** (+2 per neighbor with score ≥ 50, capped at +8): the parcel's neighborhood is itself trending distressed.
- **`tract_vacancy_rate`** (+6 if ≥ 20%, +3 if ≥ 10%): census-tract residential vacancy rate from ACS B25002.
- **`is_raw_land`** (-25, plus visual signals suppressed): no structure on the parcel.

The raw-land handling is worth calling out. ==Vision signals like `visual_roof_distress` are nonsensical on a vacant lot. Before raw-land suppression shipped, the vision model was producing false-positives on 94 percent of the top band against parcels with no structure. The suppression is a deterministic gate, not a model fix.== Suppressed vision signals are counted in the scoring breakdown so they can be audited.

### Combination bonuses (the composition layer)

Three explicit combos in the current scoring engine:

- `probate_filed` + `tax_delinquent`: **+10**. The inheritance-then-stalled-tax pattern.
- `foreclosure_filed` + `visual_neglect_high`: **+8**. Active foreclosure plus visible neglect; the property is being abandoned by the owner.
- `tax_delinquent` + `code_violation` + `is_absentee`: **+12**. The three-signal absentee-distress pattern that historically converts best at this operator's funnel.

The combos are deterministic. They were added one at a time as the operator and I reviewed the realized lead-to-deal data and identified composition patterns that the linear sum was undervaluing. ==The architectural principle: combinations are explicit rules, not learned interactions. When the operator can read the combo and predict the conversion lift, the system is doing its job.==

The final score is capped at 100 and floored at 0.

---

## Owner resolution

A high-scored parcel is worthless if the operator cannot identify and reach the decision-maker. Two failure modes dominate at this layer.

**LLC ownership.** A parcel owned by "Triangle Holdings LLC" tells the operator nothing about who to reach. Resolution walks from the LLC to its members via NC Secretary of State data (`lib/enrichment/nc-sos-import.ts`), then resolves multi-LLC patterns where the same individuals control several entities in the same corridor. The walking is deterministic, logged, and confidence-scored.

**Multi-parcel portfolios.** A single individual or couple may own 8 parcels across 3 LLCs. The operator does not want 8 separate letters; they want one portfolio-level conversation. ATTOM enrichment surfaces the owner across parcels and the Drizzle schema rolls multi-parcel ownership up to a portfolio key.

==Owner resolution is database joining with confidence scoring, not LLM extraction.== The LLM is good at named-entity reconciliation in low-stakes contexts. It is not good at deciding whether two LLCs share a controlling member based on partial registered-agent and address overlap. That is a graph problem with explicit disambiguation rules, and it is the right shape for a deterministic pipeline.

---

## The outreach layer

Once a parcel scores into the actionable band, the operator can trigger a personalized outreach letter. Gemma 3 27B (the same model serving vision) generates the letter against the parcel's full feature payload: owner name, situation context derived from the firing signals, parcel specifics, and the operator's voice rules.

The voice rules carry across the brand:
- No em-dashes.
- No exclamation points.
- No "we buy houses" or close paraphrases.
- No urgency manipulation.
- Address the recipient by name, reference their specific situation in the first sentence.

The voice is enforced at parse time on every generated letter. Letters that violate any rule are rejected and regenerated. The retry budget is 3; failures beyond that surface to the operator for manual review. At current generation volume, manual review fires on under 1 percent of letters.

Cost per letter: $0.005 generation, $1.20 mailing-house all-in (print, postage, certified-delivery upgrade). ==The mailing-house is the cost ceiling on outreach, not the letter generation. AI is the cheap part of a customer-facing platform when the platform is shaped right.==

---

## Cost economics

The single most useful number to lead with: **total POC API spend across all paid services is $54.**

Per-parcel cost breakdown:
- **County records, court records, PACER, NC SOS, Census ACS**: $0. All free public sources, scraped with respect for ToS, no licensed-data dependencies.
- **ATTOM enrichment** (owner, property, AVM where wired): $0.10 per parcel, applied only to top-scored parcels. POC attempted 300 enrichments, hit 214 (71%), cost approximately $30.
- **Google Street View** image: $0.007 per parcel.
- **Google Static Maps** satellite image: $0.002 per parcel.
- **Gemma 3 27B vision** (via Ollama Cloud): $0.005 per image evaluated.
- **Gemma 3 27B letter generation**: $0.005 per letter.
- **Vision pipeline per parcel** (one Street View + one Static Maps + one vision call per image): approximately $0.024 per parcel. POC ran 181 pairs, cost approximately $5 of total spend.
- **Supabase, Vercel, Sentry**: free tier or rounding error at POC scale.

==The headline architectural decision is that everything upstream of the enrichment layer is free. Public records are free. Vision is the most expensive per-parcel call, and it runs only on parcels the scoring engine has already ranked. The composition score is the rule that decides which parcels cross the paid-enrichment threshold.== That is the architecture that makes the unit economics work.

**What I would change with more budget.** I would wire the ATTOM AVM endpoint into the standard enrichment path (currently the `propertyAvm()` client function exists in `lib/enrichment/attom.ts` but is not yet called from the live `enrichParcel` pipeline). I would re-enrich the existing 214 ATTOM parcels for AVM at approximately $0.10 per parcel (~$21 total) and surface the resulting equity estimate in the scoring layer. The decision is on a "to-go" status pending operator sign-off, not pending budget.

---

## The eval rig and operator workflow

The eval is the operator. There is no offline-held-out eval at this scale because the labels are the operator's realized conversions, and the operator works the leads in real time.

Three layers of feedback:

**Signal-layer telemetry.** Every paid API call writes to `api_calls` with cost. Every source run writes a `SourceRunResult` (success, signals created, parcels touched, error). The dashboard surfaces signal-source health weekly. A source that stops creating signals is either a scraper break or an upstream site change; both are caught at the next cron run.

**Score-layer review.** The operator reviews leads in score-desc order through a status workflow: `new → contacted → no_answer → not_interested → interested → under_contract`. Status transitions are logged with timestamps. The conversion ratio between top-band and bottom-band scored leads is the closest Atlas has to a real-world eval signal. At POC snapshot the top quartile converts at roughly 5:1 versus the bottom quartile; the goal at v1 is to push that to 8:1.

**Combo discovery.** New combo bonuses are added when the operator review surfaces consistent conversion lifts on signal compositions the linear sum does not already capture. The current 3 combos came from explicit review with the operator over the POC build. A future v2 might learn combos automatically; at POC scale, hand-coded combos with operator validation are the right call.

The status workflow is also the leading edge of what becomes a real CRM in v1. The current POC has the verbs; it does not yet have the contact-log shape with date/channel/outcome/operator. The schema for that is queued (`contact_events` table) but waiting on operator sign-off before shipping.

---

## What I would change starting over

Three things, in priority order.

1. **Treat the source registry as a packaging concept, not a folder convention.** The current sources are well-shaped (every source implements the same `Source` interface, returns a `SourceRunResult`, and writes to the same signal table). Promoting that to a versioned source-plugin model would let me ship Wake, Durham, Mecklenburg, Forsyth, and Buncombe as independent county packages with their own test fixtures, their own cron schedules, and their own deployment lifecycle. At one county pair, this is overkill. At five, it is the right architecture.

2. **Move the LLC member walker to a graph store.** Currently LLC-to-member-to-related-LLC walking lives as SQL joins with manual disambiguation rules. A graph store with explicit relationship typing (controls, member-of, shared-address-with) would make the resolution faster to extend, easier to audit, and naturally roll up to the multi-parcel portfolio view.

3. **Externalize the scoring engine as a versioned artifact.** The current scoring engine is TypeScript in `lib/scoring/index.ts`. The weights, half-lives, and combos live in the same module that computes the score. A cleaner v2 would serialize the scoring config as a versioned JSON artifact loaded at runtime, so weight updates can be versioned, A/B tested per outreach batch against operator conversion data, and rolled back if a tuning attempt degrades realized performance.

---

## Closing

Atlas is a 19-signal composition scorer with a vision-LLM extraction layer and a same-model generation tail, running on free public records plus a deliberately small enrichment layer, at $54 total POC spend across 568,135 parcels. The architectural choices that make it work are: half-life decay calibrated per signal type, explicit composition bonuses for the combos that historically convert, standing-condition modifiers that capture ambient context, raw-land suppression that prevents vision false-positives, and a cost architecture where the paid layer runs only on parcels the scoring engine has already ranked.

If you are building something similar in a different domain (insurance underwriting from imagery, vacancy detection at scale, commercial-property prospecting, infrastructure-asset condition monitoring, off-market lead generation in any high-volume low-conversion list-driven industry), the questions worth asking are: how do you compose multi-source signals into a single ranked score that the operator can read and trust; how do you calibrate signal aging per signal type rather than apply a single decay; how do you keep the paid-enrichment layer running only on the parcels the score has already ranked; how do you decide between a vision LLM and a custom CV pipeline at the volume and precision your domain requires; and how do you avoid false-positives from edge cases like raw land that look obvious in hindsight but tank the top-band quality before they are caught.

For the production-ML calibration discipline behind the score-review workflow, see [Inside TrialEdge](/blog/inside-trialedge.html). For the multi-pass orchestration counterpart, see Inside Marketing Bot v2 when it lands.

---

Russ
