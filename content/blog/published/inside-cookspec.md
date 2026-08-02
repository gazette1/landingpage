---
title: "Inside CookSpec: compiling any recipe into one merge table"
slug: inside-cookspec
archetype: thesis
date: 2026-08-02
project: cookspec
version: v1 / 2026
status: published
tags: [extraction, multimodal, gemini, deepseek, validation-loops, cloudflare-workers, supabase, schema-org]
summary: A recipe notation from 2004 that solved the format problem and was ignored for twenty years, rebuilt as an extraction pipeline. Any TikTok, Reel, article or photo compiles into one merge table with every unit normalized and checked against a density table.
---

# Inside CookSpec: compiling any recipe into one merge table

By Russ. Thesis, 2026.

---

## The inspiration

Someone posted a screenshot of a brownie recipe with the line, roughly: I cannot believe someone solved recipe design decades ago and everyone decided to ignore it.

The screenshot was Michael Chu's tabular notation from Cooking for Engineers, which he has been publishing at cookingforengineers.com since 2004. Ingredients run down the left edge. Operations sit in cells to the right, each one spanning the rows it consumes, merging column by column until a single cell on the far right holds the finished dish. It is a dependency graph rendered as a table.

The format answers the two questions a recipe page normally buries. What goes with what, and in what order. It never spread, because producing it by hand is real work. That work is now cheap. Reading an unstructured source and emitting a dependency graph is a task language models are genuinely suited to.

The thesis in one line: a format fails when the labor to produce it exceeds the value it delivers. Change the cost of the labor and the format becomes viable without changing anything about the format.

## What it does

CookSpec takes a recipe from wherever the user found it and returns one card. Inputs: TikTok links, Instagram Reels, YouTube videos, article URLs, pasted text, photos of a recipe or a cookbook page, photos of a finished dish, uploaded video.

It normalizes every quantity to grams where a density is known, and checks the source's own arithmetic. The brownie recipe that started this listed one third of a cup of cocoa as 80 grams; the label puts a third of a cup near 27. The card shows 27, strikes the 80, and states the reasoning. Every quantity carries a status: stated, converted, corrected, estimated, or researched. Nothing renders without one.

## Six decisions

1. Model the recipe as a tree, render the table from the tree. Keeping the structure separate from the presentation is what made the phone projection possible: one operation at a time, same data, different traversal.

2. The hard layout constraint belongs in code. The notation requires each operation's inputs to occupy contiguous rows. Because the graph is a tree, a depth-first walk emits every subtree's leaves consecutively, so a twelve-line function replaced a prompt instruction the model kept failing.

3. Cheap model plus a validation loop, not an expensive model. Structuring runs on a small fast model behind schema validation, tree validation, and a raw-staple check. Failures re-enter the loop with a specific message. About four tenths of a cent per compile.

4. Structured data first, prose second. Where schema.org Recipe markup exists the pipeline reads it directly, which also gives free ground truth for evaluation.

5. Media in one call, not two. The model takes the media and the structuring rules together and returns the tree. YouTube needs no scraper at all.

6. Deduplicate on the canonical URL. A viral video compiles once; repeats return in about sixty milliseconds at zero marginal cost.

## Where it runs

Next.js on Cloudflare Workers through the OpenNext adapter, Supabase with row-level security, Gemini for vision and fast structuring, DeepSeek as the reliability anchor. Deploys from GitHub Actions. The card is a real DOM table, never an image. Live at cookspec.xyz.

## What this project is actually about

The cooking is incidental. The transferable problem is turning unstructured multimodal sources into a strict schema that downstream code can render and validate, cheaply enough to run per request, with honest provenance on every field and a refusal path when the source does not contain what the user asked for. Same problem as lease terms, operating statements, and contract obligations. The domain here is forgiving, which is why it is a good place to develop the machinery.

The second half of the story is the Field Note on what a thousand real inputs found.
