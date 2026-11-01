---
title: "Field Note: matching a $25M hospitality deal to five lenders in thirty minutes"
slug: field-debt-sizing
archetype: field-note
date: 2026-05-19
project: null
version: null
status: published
tags: [hospitality, debt-sizing, lender-matching, cre, constraint-satisfaction, ai-architecture, fdaa]
summary: An oceanfront condo-hotel acquisition in the Carolinas needs $18M to $20M of senior debt. The sponsor is an emerging operator. The asset class is the hardest hospitality structure to finance. The conventional workflow to identify, rank, and engage probable lenders takes a junior analyst a week. An AI-architected version produces a defensible ranked list, with match scores and concern notes, in under thirty minutes. This Field Note walks the constraint-satisfaction shape of the problem and the architecture that compresses it.
---

# Field Note: matching a $25M hospitality deal to five lenders in thirty minutes

By Russ. Field Note, 2026.

---

## The existing approach

Hospitality debt sourcing in 2026 looks the same as it has looked for thirty years. A sponsor with a deal under contract calls a mortgage broker. The broker sends a one-page deal teaser to a list of 15 to 50 lenders the broker has worked with in the past. Some lenders pass quickly. Some come back with indicative term sheets. The sponsor and the broker triangulate the best terms and pick the one or two lenders worth taking to formal underwriting.

The process works. It also leaks several days at every stage. Each lender on the broker's list has private lending criteria: asset class preference, geographic preference, sponsor experience threshold, loan size minimum and maximum, LTV ceiling, DSCR floor, recourse posture. The broker holds those criteria in their head and applies them imperfectly. The "list of 50" is really "the broker's relationships," which is a subset of the lenders capable of doing the deal.

For an oceanfront condo-hotel acquisition in the Carolinas at the $20M to $25M all-in basis with an emerging sponsor, the lender universe that can credibly do the deal is much smaller than the broker's relationship list. The optimal lender is rarely the broker's first call. The naive process leaves money on the table on rate, on covenants, and on capital partner alignment.

## Where it works

The broker-relationship model works when the broker has a long history with the right small set of lenders for the asset class, the sponsor profile, and the deal size. A senior broker on their fiftieth Myrtle Beach hospitality deal will know which three or four lenders will close at competitive terms. The broker's intuition is a real signal and a real moat.

The model breaks at the edges. A sponsor doing their first hospitality deal does not have a senior broker relationship. The broker doing their first condo-hotel structure does not have intuition tuned to the HOA and special-assessment concerns that the structure carries. The sponsor on a non-coastal asset working through a coastal-specialist broker pays the cost of mismatched intuition.

The model also fails on coverage. A broker working from their twenty-relationship list is missing the seventy other lenders who could competitively price the deal. Most of those seventy are reachable. Most of them are findable in public data: lender websites, recent transaction announcements, league tables published by the trade press, sponsor LinkedIn searches for prior deals.

## Where it breaks

The break is specifically in the **constraint-satisfaction stage** of the lender match. Pricing a hotel deal against a lender's criteria is not a ranking problem first. It is a constraint problem.

Step one is determining which lenders can credibly do the deal at all. A lender with a $50M minimum loan size cannot do a $20M senior facility regardless of rate. A lender that does not touch condo-hotel structures will not move on this deal regardless of sponsor strength. A lender with a 1.5x DSCR floor will not size to a 1.4x deal regardless of how good the comps look. The first cut is yes/no on each lender's hard constraints.

Step two is ranking the lenders that pass step one against soft preferences. Asset-class affinity, geographic familiarity, sponsor profile fit, current portfolio concentration, recent deal flow in the corridor. These move match probability from "could close" to "likely to close at competitive terms."

The broker model conflates step one and step two. The AI-architected model does not.

## What an AI architect would change

The current Mosaic workflow on a new hospitality acquisition starts with a deal summary: all-in basis, NOI base case and stress case, sponsor profile, asset class. It produces a ranked list of probable debt and equity partners with explicit match scores, structural recommendations per lender, expected concerns each lender will raise, and recourse expectations. The output is a defensible artifact the sponsor takes into broker conversations rather than relying on broker intuition alone.

An AI architect would build this as a structured pipeline:

**A structured lender database.** One row per lender, with columns for asset-class preferences, geographic preferences, loan size band, LTV ceiling, DSCR floor, recourse posture, sponsor experience threshold, and recent deal history. Sources: lender websites scraped quarterly, trade-press deal announcements ingested continuously, SEC filings for lenders with public reporting, league tables from CRE publications. This is data engineering work, not LLM work.

**A constraint-satisfaction filter.** Given the deal inputs (loan size, asset class, geography, sponsor profile, target DSCR), the filter returns the subset of lenders whose hard constraints the deal satisfies. This is a SQL query, not an LLM call. The query produces the set of "could credibly do this deal" lenders.

**A ranking pass on the constrained set.** Match scoring against the soft preferences, with explicit weights per signal (recent deal in this corridor, prior deals with sponsors of this profile, current portfolio concentration in this asset class). Output: a 0-200 match score per lender, with the contributing signals explicit.

**A per-lender narrative pass** that, for each top-N lender, produces the expected term sheet structure, the concerns the lender is likely to raise (sponsor experience, HOA structure, renovation execution risk), and the recourse posture. This is the LLM-suitable part: structured narrative output keyed to the lender profile and the deal specifics.

The architecture is not novel. It is the same constraint-then-rank pattern that powers lender matching in the Mosaic CRE feasibility workflow, applied at higher fidelity with a real lender database.

## What it would cost

Per-deal LLM cost is a few dollars in tokens at current pricing. The structured lender database is a one-time engineering investment: a few weeks of work to scrape and normalize the initial sources. It then needs a quarterly maintenance pass to refresh the database. Hosting is rounding error.

The labor cost is the real economics. A week of junior-analyst time per deal compresses to thirty minutes of operator review on the AI-produced ranked list. For a sponsor doing four to twelve hospitality deals a year, that compression is the difference between needing a full-time analyst and not.

The compression also unlocks **deals the broker model leaves on the table**. Say a sponsor's AI-architected workflow surfaces a lender outside the broker's relationship list. That lender prices the deal 50 basis points tighter than the broker's first call. The sponsor has paid back the entire AI infrastructure on a single deal.

## What would not change

The senior broker relationship is still the right tool for the final negotiation. An AI-architected lender match produces the list. A human broker (or a sponsor with deep lender relationships) takes the list into the negotiation. The AI does not replace the broker. It replaces the broker's research time and expands the broker's coverage.

The credit committee at each lender still makes the final decision based on full underwriting, not on the deal teaser. The AI's match score is a probability estimate, not a commitment. Sponsors who treat the match list as the answer rather than the starting point lose deals.

==The architectural principle: an AI system that automates the constraint-satisfaction step in any matching problem (lender-to-deal, deal-to-investor, candidate-to-job, drug-to-trial) frees the human to spend their time on the relationship work that determines whether the match closes. The matching is the algorithm; the closing is the human.==

## Closing

The hospitality debt market is one of the most relationship-driven sub-markets in CRE. It is also one of the easiest to architect around. The lender universe is finite, the criteria are knowable, and the constraint-satisfaction shape of the problem is well-defined. The AI-architected match pipeline does not replace the broker. It gives the sponsor a defensible artifact to bring to the broker, and it gives the broker coverage they did not have before.

If you are a sponsor evaluating an acquisition where the lender universe is partially-known and the optimal counterparty is unclear, the questions worth asking are: how do you maintain the structured lender database against quarterly refresh requirements; how do you separate the hard-constraint filter from the soft-preference ranking so the two can be tuned independently; how do you produce per-lender narrative output that the sponsor can read and the broker can defend; and how much of the per-deal labor cost does the AI-architected workflow displace.

Those are the questions this Field Note is meant to answer.

For the multi-pass orchestration discipline that produces structured narrative outputs in the same shape, see [Inside Marketing Bot v2](/blog/inside-marketing-bot.html). For the prompt-suite workflow that produces Mosaic CRE feasibility studies in 90 minutes including lender probability matching, see [Inside the Mosaic feasibility workflow](/blog/inside-cre-feasibility.html). For the algorithmic decision-analysis discipline applied to a different domain, see [Inside MES Open](/blog/inside-mes-open.html).

---

## Update, November 2026

The lender match now runs as a standing job, Hermes, and building it changed one claim. I wrote that the constraint filter is a SQL query, not an LLM call. The query exists, but it returns a call list, not a qualified list. A lender qualifies for outreach only when pages fetched in that session state its product type, a size range covering the request, its asset type and its geography. Missing any one puts the firm in exclusions, with the reason.

The database is one workbook: about 4,174 firms and 7,100 contacts after consolidating source files, including 605 family offices. Agents work in two waves. Wave 1 screens stated criteria and returns a verdict per firm; wave 2 goes back for each firm's thesis in its own words, observed deals, a buy box inferred from those deals, and named contacts. Both waves write JSONL that a merge script folds into the workbook, so no agent touches the file. A typed-model pass (TypeSafe Jev) then ran the whole table, reading each firm's own pages or list notes: about $0.25 in total, a median 350 ms per firm. After that pass, 3,227 of 4,174 rows were filter-ready, and a filter needs no model call.

Any address derived from a pattern or a list file goes through Hunter; a catch-all or unknown result becomes a gap, never a draft. Drafts land in Gmail Drafts, and I send by hand.

The first deal was a US$13MM construction bridge in the Caribbean. The database screen covered 480 firms across two waves; every one failed or only partly passed on geography, and the two lenders that qualified came from the open-web pass the day before. A later multifamily bridge benchmark applied the pattern to terms: 56 lenders' marketed rate, fee and closing language, quoted verbatim.

**Still not built.** The table has no LTV ceiling, DSCR floor, recourse posture or sponsor-experience columns, so this post's DSCR-floor cut cannot run as a filter. There is no quarterly refresh; each row carries a last-enriched date the job checks before re-researching. Ranking is a deterministic pre-filter on fit signals, not the 0 to 200 weighted score. The per-lender narrative pass (expected term sheet, likely concerns, recourse posture) does not exist; each draft's lender-specific content is an opener citing the firm's own program or closing.

---

Russ
