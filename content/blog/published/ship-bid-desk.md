---
title: "Ship Note: Bid Desk v1, a public-contracts pipeline for a prime we have not formed yet"
slug: ship-bid-desk
archetype: ship-note
date: 2026-11-01
project: bid-desk
version: v1 / 2026
status: published
tags: [public-procurement, sam-gov, compliance, agent-workflows, cloudflare-workers, build-in-public]
summary: An agent sweeps SAM.gov and the DMV portals and grades every find, a hosted hub shows two partners the pipeline, and nothing gets bid until the company exists.
---

# Ship Note: Bid Desk v1, a public-contracts pipeline for a prime we have not formed yet

By Russ. 2026-11-01. Ship Note for Bid Desk.

---

## What shipped

I shipped Bid Desk v1 on 2026-10-11: a weekly-sweep procurement desk for a project-management prime that wins the contract, subs the labor and materials to vetted vendors, and manages schedule, quality and billing. Two partners, one in Washington DC and one in Raleigh NC, cover the DMV (DC, Maryland, Virginia) and the Research Triangle. An agent sweeps and grades against a written bidder profile; a hosted hub shows the partners the board. The company does not exist yet.

## What changed

- **Sweep.** One pass on 10/11 across SAM.gov and the DMV state and county portals. Every record carries a source link and read date; unconfirmed fields read "not found."
- **Grading.** Each find gets A or B (bid), C (watch) or Pass; every row has an "owner action needed" column. A second agent, in a fresh context, re-checks each A and B at the source.
- **Scope clusters.** Our 376 service categories, minus 79 consumer-only and 38 medical, roll up into 34 sweep clusters with NAICS and PSC codes, unverified until checked at census.gov and the SAM PSC manual.
- **Subcontracting gate.** A pure pass-through prime cannot win most set-aside work: federal set-aside services above $350,000 cap payments to subs that are not similarly situated at 50 percent (13 CFR 125.6), DC CBE preference awards require 35 percent self-performance (D.C. Code 2-218.46), and Montgomery County's reserve program 51 percent. No A or B is final until its record states the planned self-performed share.
- **Compliance roadmap.** 56 steps in five phases from no entity to national bidding; 52 cite sources, 46 are ours. The critical path, partly estimated, runs about 33 days to DMV bid-ready and 37 to an active SAM.gov registration.
- **Reference library.** 36 public awards, bid tabulations, rate schedules and guides, with observed prices. Two bids on one Montgomery College snow tabulation priced a dump truck with operator at $160.00 and $550.00 an hour, so rates get built from cost, not copied.
- **Hosted hub.** One Cloudflare Worker with a KV namespace at bids.trialedge.io: three logins (one held open) and an agent import endpoint. `build-data` assembles the files, `push-data` posts the result; partner edits to grade, stage and notes survive unless forced.
- **Portal memory.** One lesson per file: eMMA's bot check never clears for the agent, eVA hides detail pages behind reCAPTCHA, most DMV portals are JavaScript shells or logins, and SAM.gov service quote windows run 2 to 4 weeks.

## Why this, not the alternative

I replaced the first hub, a claude.ai artifact with a shared database, the same day with a Worker on my own domain behind logins I issue. The markdown files are the readable record and the hub is the live view; the agent writes both, so the hub is replaceable.

The agent researches and grades; a partner does every portal login, download approval and submission. Bot checks and CAPTCHAs draw part of that line; the agent logs each as an owner action. The rest is liability: misstating small-business status on a federal set-aside carries damages presumed at the full contract value (15 USC 632(w)).

## Measured impact

- Hub at first push: 44 opportunities, 12 owner actions, 15 subs, 56 roadmap steps, 34 clusters, 36 proposal references
- National SAM.gov sweep: 32 open in-scope notices, all due 10/12 to 11/6, short fuse without a UEI
- DMV sweep: 1 A (City of Fairfax grounds and snow, provisional), 3 B (Anne Arundel, Howard and Manassas Park snow), 7 C, 14 Pass
- Zeros: no entity, UEI, bonding or bid; two B deadlines have passed
- Cost: $0 on the Workers free tier

## What's next

The next moves are ours: form the LLC, get the EIN, register in SAM.gov and the state and county portals, and schedule the weekly sweep, which has not run since 10/11 or covered the Research Triangle. The first-bid candidate is Anne Arundel's roadway snow contract (target submit 12/15/2026), the one A or B row with time to get bid-ready.

---

Russ
Washington, DC, 2026
