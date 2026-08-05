---
title: What it took to make an AI demand map safe to sell
slug: field-hardening-a-demand-map
archetype: field-note
date: 2026-08-02
project: ODI Bot
version: v9.3
status: draft
tags: [demand-research, local-services, llm-pipelines, data-quality, fail-loud, provider-routing, odi]
summary: A demand heat map that worked in demo mode met funded API accounts and real clients. Five defects surfaced in two weeks, every one caught by a gate before shipping. Field notes on what broke, what the fixes cost, and why the guardrails were the product.
---

# What it took to make an AI demand map safe to sell

By Russ. 2026-08-02. Field Note.

---

## The existing approach

The ODI Bot demand heat map is a research deliverable for local service businesses. It maps a market's search demand onto a 40-cell grid: eight steps of the customer's job to be done against five levels of buying awareness. Every cell carries real Google Ads search volume, localized to the client's service area, with every keyword auditable down to its classification rationale. The deliverable ends in a positioning read: which cells the client owns, which cells competitors own, and what to say to capture the empty ones.

The pipeline is a chain of API calls and model passes. A scrape establishes what the business is and where it operates. A keyword-ideas index expands seed queries into the market's real search universe. A classifier buckets each keyword by awareness level. A SERP pass names who actually holds each cell. A reasoning model writes the positioning analysis. In mock mode, running on fixtures, this pipeline had been stable for weeks. Demos looked clean. Tests were green.

Then the data accounts got funded and real businesses went through the pipe. This note is the record of what happened next, because the gap between a working demo and a sellable data product turned out to be exactly five defects wide, and every one of them is a category, not a one-off.

## Where the demo-grade version works

A fixture-driven pipeline is the right tool while the product is being shaped. Deterministic inputs make renderer changes reviewable, keep iteration free, and let the sales narrative develop against stable numbers. Nothing in this note argues against mock mode. The argument is about what mock mode cannot surface.

## Where it breaks

The first funded run returned 4 keywords and 40 searches a month for a junk removal operator whose market we knew carried thousands. The pipeline had resolved the client's county to a county with the same name in the wrong state, then honestly reported that rural demand elsewhere was near zero. The geo matcher had no concept of state. Nothing errored. The numbers were simply wrong in a way only a human who knew the market would catch.

The second class of defect was silent starvation. Seed queries longer than six words return zero results from the keyword-ideas index, so a long category name quietly killed entire steps of the job map. A classifier timeout set inside the model's normal latency band killed chunks of keywords at the buzzer, and the dropped keywords vanished from the books instead of landing in the audit trail. None of this threw. Coverage just shrank.

The third class was identity leakage, and it is the one worth the most attention. The product has a hard rule: the client is never named on the board, because boards live at unlisted URLs and the no-name rule is what makes that safe. The rule held for weeks because the first test subject was a business nobody searches for. The first client who actually ranks broke it three ways in two runs. Their name entered the payload through their own map-pack listing, because pack entries are names rather than domains. It entered through their branded keywords, because the keyword index correctly reports that people search the brand, and the keyword string is the name. It entered through the positioning prose, because the reasoning model absorbed the name from the client's own site copy. A payload guard refused to ship both builds. Both refusals were correct.

## What an AI architect would change

The fixes themselves were small. The architecture that made them findable is the point.

First, every invariant is a gate that refuses to ship, not a warning that scrolls past. The books must balance to the API total. The payload must not contain the client's name. Every cell must carry either auditable volume or a written recommendation. A live build that violates any of these throws. The refund conversation this occasionally costs is cheaper than one prospect auditing a wrong number on a sales call.

Second, probe before rerunning. A full build costs about a dollar and ten minutes. A targeted probe costs cents and seconds. Wrong-state geo, the six-word seed limit, county support per endpoint, and a provider's default reasoning mode were each established by a probe that turned a guess into a fact before the next build spent real money on it.

Third, counting rules over redaction hacks. The branded-keyword leak could have been patched by masking strings. The correct fix changed the counting: branded keywords leave the map before the matrix and survive as a count and a volume with no strings attached. The books still balance, the board can still say the brand is searched N times a month, and the identity rule holds structurally instead of cosmetically.

Fourth, provider choices are bench results, not preferences. The classifier had been producing truncated JSON at chunk scale. We ran the production rubric with 123 real keywords against the incumbent and a challenger, twice. The incumbent failed both runs with unparseable output at 33 seconds. The challenger classified everything in 13 with valid JSON both times, at roughly half the token price, before a context-cache discount that applies because the rubric is identical across chunks. The router flipped that day. The bench script stays in the repo so the next challenger gets the same trial.

## What it would cost

The hardened board costs about fifty cents to produce against a hundred-dollar price: volume data in cents, one SERP per lit cell at two tenths of a cent each, a classifier pass that now rides cached input at fractions of a cent, and one reasoning-model call for the positioning read. The two weeks of hardening consumed roughly three rebuilt boards and a few dollars of probes. The dominant cost of the whole exercise was model wall time on rebuilds, which is exactly the cost the probe discipline exists to avoid.

## What would not change

The domain logic survived untouched. The job map, the awareness rows, the honest-counting rules, the positioning framework, and the sales narrative are the same ones the mock pipeline ran. Localization got more truthful and the totals got smaller, which improved the product, because a number that survives an audit beats a bigger one that does not. AI changed the throughput and the unit cost. The research method was never the bottleneck.

## Closing

This is the kind of work a Forward Deployed AI Architect does in the unglamorous middle of an engagement: not choosing the model, but building the gates that catch the model and the data being confidently wrong, and pricing every fix in dollars and minutes. If your firm ships numbers to clients through an LLM pipeline, the first question I would ask is which of your invariants can fail without throwing. The honest answer is usually the roadmap.

---

Russ
Forward Deployed AI Architect candidate
2026
