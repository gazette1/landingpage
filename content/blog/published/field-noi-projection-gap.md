---
title: "Field Note: the NOI projection gap and why hospitality sponsors systematically over-promise"
slug: field-noi-projection-gap
archetype: field-note
date: 2026-05-19
project: null
version: null
status: published
tags: [hospitality, noi-projection, appraisal, sponsor-bias, underwriting, ai-architecture, fdaa]
summary: A coastal hospitality asset has an appraisal-stabilized NOI of $2.23M and a sponsor pro forma at $2.61M. Both numbers are produced by experienced people working in good faith. The 17 percent gap is structural, not adversarial. This Field Note walks where the gap comes from, why neither number is wrong on its own, and what an AI architect would do to surface the gap honestly before a credit committee has to.
---

# Field Note: the NOI projection gap and why hospitality sponsors systematically over-promise

By Russ. Field Note, 2026.

---

## The existing approach

Every hospitality acquisition involves two NOI numbers and a structural disagreement between them.

The first number comes from an MAI appraisal. The appraiser is an arms-length, regulated professional working under USPAP standards. The appraisal includes a stabilized NOI projection that is, by professional discipline, conservative. Stabilized occupancy assumptions cluster in the mid-50s for transient hospitality in non-trophy markets. ADR assumptions track recent comp performance with a modest forward growth rate. Operating expense assumptions are benchmarked against industry surveys (HOST, STR, comparable property operating data).

The second number comes from the sponsor's pro forma. The sponsor is an experienced operator, or an emerging operator with operator support. The sponsor has done the diligence on this specific asset. They have a renovation plan they believe will drive ADR uplift. They have a brand-affiliation thesis or an independent-positioning thesis they believe will lift occupancy. And they have expense-management levers they believe the appraisal cannot see.

For a typical $20M to $30M coastal hospitality acquisition, the two numbers diverge by 10 to 20 percent. On a $25M asset, that is $200K to $500K of annual NOI difference. Valued at a 7 cap, that is $3M to $7M of valuation difference. The credit committee has to decide which number to underwrite to, and the answer determines whether the deal closes.

## Where it works

The disagreement is structurally honest. The appraiser is constrained by professional standards to project against observable comp performance. The sponsor is allowed and expected to underwrite against their specific business plan. That plan is by definition not yet observable in the market. Both numbers can be right.

The disagreement works as a check on sponsor optimism when the credit committee is sophisticated enough to evaluate the gap. A 5 percent gap is normal. A 25 percent gap is a red flag. A 50 percent gap means one party is wrong.

## Where it breaks

The break is that **no one in the conventional underwriting workflow decomposes the gap**. The credit committee sees two numbers and a difference. The sponsor has a story for the difference. The committee either believes the story or does not.

The gap actually decomposes into four separate components:

1. **Occupancy uplift**. The sponsor projects higher stabilized occupancy than the appraisal. The right question: what specifically drives the uplift (brand affiliation, renovation, market positioning), and what is the historical conversion of that lever on comparable assets?
2. **ADR growth**. The sponsor projects ADR growing faster than the appraisal's stabilized rate. The right question: how much of the projected ADR is inflation, how much is brand uplift, how much is renovation-driven repositioning, and what proof of each component exists?
3. **Expense efficiency**. The sponsor projects lower opex than the appraisal. The right question: is this management-fee structure savings (real, repeatable), one-time deferred-maintenance backlog clearance (real but non-recurring), or hoped-for efficiency claims (often the largest single source of overstated NOI)?
4. **Top-line monetization**. The sponsor may project ancillary revenue (F&B, parking, resort fees) that the appraisal does not credit at full value. The right question: what is the realized capture rate of each ancillary stream on comparable assets, and what is the sponsor's specific plan to lift it?

Decomposing the gap is the work. Most credit-committee conversations skip the decomposition and end up arguing about the headline NOI instead.

## What an AI architect would change

The current workflow on a hospitality acquisition produces two pro formas (appraisal and sponsor) and a credit memo that compares them at the top line. An AI-architected version produces a third artifact: a **gap decomposition**. It attributes the NOI delta to its four components, with comp-based reference rates for each.

The architecture is straightforward:

**A structured input layer.** The appraisal NOI line items and the sponsor pro forma line items get parsed into a common schema: occupancy, ADR, RevPAR, ancillary revenue per occupied room, departmental expenses, fixed expenses. The schema is the comparison key.

**A comp-rate database.** For each component (occupancy uplift from brand affiliation, ADR growth from renovation, opex efficiency from management change), a database of realized rates on comparable assets in comparable markets. Sources: STR data where licensed, hotel transaction announcements, REIT 10-K supplemental disclosures, brand-franchisor disclosures. This is data engineering work.

**A decomposition pass.** Given the two input pro formas, decompose the gap into the four components. Produce a per-component delta in dollars and a comp-based reference rate for what that delta historically looks like across realized comparable transactions.

**A narrative pass.** For each component, produce a structured assessment: is the sponsor's projected delta within the realized range, above the 75th percentile, or outside the comparable distribution? An ADR growth claim that sits at the 95th percentile is not wrong. But the sponsor should defend it on the specific drivers, not wave it through.

The output is a one-page artifact a credit committee reads in five minutes that decomposes the gap with comp-anchored reference rates. The committee then has a conversation about the components that look hoped-for, not about whether to "trust the sponsor" at the top line.

## What it would cost

The compute cost is rounding error. The data-engineering cost on the comp-rate database is the real investment: a few weeks of work to scrape and normalize public hospitality transaction data, plus a quarterly refresh discipline. The LLM cost per deal is a few dollars in tokens for the structured decomposition and narrative passes.

The value is the credit-committee conversation it enables. A 20-minute gap-decomposition review is materially more valuable than a 60-minute argument about the headline NOI. ==The decomposition does not change the credit committee's decision-making authority; it changes what the committee gets to decide on.==

## What would not change

The credit committee still makes the final call. The sponsor's domain expertise still drives the business-plan story. The appraisal still anchors the conservative case. The AI architect does not adjudicate between the two; it surfaces the structure of the disagreement.

The committee that wants to underwrite to a sponsor-optimistic NOI still can. The committee that wants to underwrite to the appraisal still can. The difference is that both decisions are now made with explicit per-component evidence about where the gap sits, not just with the top-line argument.

==The architectural principle: an AI system that decomposes a disputed claim into its components and anchors each component against comp-based reference rates does not resolve the dispute; it changes the dispute into a more productive conversation. That conversation shift is the value.==

## Closing

Hospitality is the asset class where the NOI projection gap is most pronounced because the business plan is most variable. The same pattern shows up in multifamily (rent growth assumptions), in industrial (lease renewal probability), in retail (tenant credit underwriting), and in office (return-to-work assumptions). Every asset class has its version of the appraisal-vs-sponsor disagreement. Decomposing the gap addresses each one more productively than debating the headline.

If you are a credit committee, an LP underwriter, a debt-fund analyst, or a sponsor evaluating how to systematize the gap-decomposition workflow, the questions worth asking are: how do you parse the appraisal and the sponsor pro forma into a common schema; how do you maintain the comp-rate database against quarterly refresh requirements; how do you produce per-component narrative that the credit committee can read and the sponsor can defend; and how do you avoid the temptation to use the decomposition to "win" the disagreement rather than to structure it.

Those are the questions this Field Note is meant to answer.

For the customer-facing constraint-then-rank discipline this pattern echoes, see [Field Note: matching a $25M hospitality deal to five lenders](/blog/field-debt-sizing.html). For the prompt-suite workflow that produces structured CRE underwriting outputs, see [Inside the Mosaic feasibility workflow](/blog/inside-cre-feasibility.html).

---

Russ
