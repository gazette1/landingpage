---
title: "Field Note: what 1,000 inputs found in an extraction pipeline"
slug: field-cookspec-eval
archetype: field-note
date: 2026-08-02
project: cookspec
version: v1 / 2026
status: published
tags: [evaluation, llm-as-judge, validation-gates, extraction, measurement, fdaa]
summary: One user report became a 2,000-compile evaluation across five channels. It surfaced two bugs in my own metrics before it surfaced any in the product, the worst defect never threw an error, and the fix that mattered was moving a rule out of the prompt into code that can fail.
---

# Field Note: what 1,000 inputs found in an extraction pipeline

By Russ. Field Note, 2026. Companion to Inside CookSpec.

---

## The report

Someone compiled a mango sticky rice recipe and got a card that assumed the rice and the mango were already prepared. The phrasing in the report was precise: it should start from boiling the rice.

The card came back with three operations. Warm the coconut milk. Pour it over the rice. Plate with mango. Not one of them cooks rice. The same dish compiled from a full article was correct, so this was specific to terse sources.

The generalization is the part worth keeping. An extraction system reproduces its source's frame, including the source's omissions. The creator wrote from a stocked kitchen and the model preserved that assumption faithfully. Faithfulness to the source and usefulness to the user are different objectives, and nothing in the pipeline was expressing the second one.

## Building the measurement before the fix

The corpus is 1,003 items across five channels. Articles sampled from sitemaps across twenty domains with robots.txt honored per domain. Video from YouTube channel RSS feeds plus bounded scraper sampling. And a derived stress set: public-domain government recipes degraded the way a caption degrades a recipe, with the original structured data retained as ground truth.

Grading runs in two layers. Deterministic checks on every item, costing nothing. Then a rubric judge on a sample, running on a model family that is not in the extraction path, because grading a model with its own family is not a measurement you can defend.

Two runner decisions paid for themselves: the judge samples at thirty-five percent because it is an order of magnitude slower than a compile, and every run stores the card it produced so metric changes re-score for free.

## Two of my own metrics were wrong

The first report claimed a 12.6 percent ingredient loss. Before writing it down I recompiled the worst offender and read the card. It was complete. My matcher was diluting real matches against parenthetical brand asides. Actual coverage is 99.3 percent. The second bad metric counted purchased prepared forms, toasted sesame oil and roasted red peppers, as failures.

Verify the instrument on a case you can read end to end before you report anything it produces. An eval that is wrong against you is worse than one wrong in your favor, because you will change working code to satisfy it.

## The worst defect never threw

Roundup pages and technique explainers were producing cards, and some of them were invented outright. The judge on one: the source is only a roundup blurb with no actual recipe, so nearly all quantities and steps are invented. Confident, well formatted, fabricated, and invisible in any error rate.

## Three fixes

Teach from raw, with a carve-out the eval forced. The first version replaced shredded rotisserie chicken with a whole chicken and forty-five minutes of roasting. Rotisserie chicken is a thing people buy. Teach the components a cook has to produce, keep the ones people purchase in that form.

Prompt instructions are probabilistic, gates are deterministic. With the rule in the prompt, the model evaded twice: once by moving the word cooked into the quantity text, once by moving the cooking stage into a prep note. So the rule became a validation function. My first version of that gate matched warm inside "pour warm coconut mixture" and passed the exact card it existed to reject.

Refuse rather than invent. Extraction now returns a not-a-recipe signal with a reason. Narrowing mattered as much as adding: a recipe with a slow-cooker variant is still one recipe, and a thin caption is thin rather than absent.

## Results

999 items per run, five channels, judge on a thirty-five percent sample, about nine dollars total.

- Genuine compile failures: 4.4 to 2.3 percent
- Placeholder cards from non-recipe pages: 6.7 to 1.1 percent
- Judge, not cookable as written: 12.8 to 5.0 percent
- Judge, does not start from raw: 16.8 to 9.2 percent
- Judge completeness: 3.73 to 4.09 out of 5
- Ingredient coverage: 99.3 percent, unchanged

Raw compile rate fell from 95.6 to 82 percent. That entire gap is 157 correct refusals. A system that learned to say no should not look like a system that broke.

## What is next

YouTube is the weakest channel. Per-operation provenance is the honest next change, since the new rules add cooking steps the source never stated and only quantities carry provenance today. And the judge sample deserves calibration against a human-reviewed slice.
