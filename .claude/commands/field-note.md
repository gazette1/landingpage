---
description: Draft a Field Note (800-1500 words) on a CRE or domain topic through an AI architect lens
argument-hint: <topic>
---

You are drafting a **Field Note** for russh.work.

A Field Note is the third blog archetype. It is not a project ship log and it is not a system thesis. It is **domain commentary by Russ through an FDAA lens**. The format: take an existing approach used in his domain (CRE underwriting, hard-money lending, syndication, hospitality underwriting, LIHTC, data-center deals, REIT vs private-equity structuring, etc.), describe it accurately, then describe what an AI architect would change about it and what that change would cost to run.

Field Notes are 800 to 1,500 words. They are written in the same voice as Thesis posts and Ship Notes but with a higher reader-curiosity factor: someone reading a Field Note should learn the domain piece first, then the AI architect take.

## Inputs

`$ARGUMENTS` is the topic. Examples:
- "Pine Financial Group hard money pricing"
- "Howard Marks letter teardown, Q1 2026"
- "DSCR triple-net underwriting versus standard CRE"
- "LIHTC compliance period pricing"
- "Caroline County data center site selection"

If the topic is ambiguous or missing, ask Russ for the specific source he wants engaged with (a specific Marks letter, a specific lender's term sheet, a specific deal type).

## Process

1. **Establish the source.** What is the existing approach? Who built it? What is it optimizing for? Find or ask for a specific document, term sheet, model, or essay that the post can engage with. The post should be in conversation with a **specific** piece of CRE thinking, not a generic critique of an industry.

2. **Read what you can.** If Russ has provided a PDF, document, or URL, read it carefully. Quote sparingly but cite specifically.

3. **Read Russ's existing context.** Read:
   - `C:\Users\harri\.claude\projects\C--Users-harri-Documents-Ai-Classes\memory\MEMORY.md` if available, for Russ's domain context.
   - `C:\Users\harri\Documents\Ai Classes\ai-learning-v2.1\CLAUDE.md` for portfolio framing and brand voice.
   - Any prior Field Notes in `content/blog/published/` to avoid retread.

4. **Draft the post.** Structure:

```markdown
---
title: <Topic, framed as a question or a thesis>
slug: field-<topic-slug>
archetype: field-note
date: <YYYY-MM-DD>
project: null
version: null
status: draft
tags: [<5-7 tags including the domain area and one or two AI architecture tags>]
summary: <one paragraph, 40-60 words, naming the existing approach and the FDAA-relevant takeaway>
---

# <Title>

By Russ. <Date>. Field Note.

---

## The existing approach

Two to four paragraphs. Describe the approach accurately and respectfully. Cite the source. State what it is optimizing for. State who uses it and in what context. The post should establish that Russ understands the approach as well as a practitioner does.

## Where it works

One short paragraph. Name the conditions under which the existing approach is the right answer. Do not strawman.

## Where it breaks

One to two paragraphs. Name the failure mode. Be specific. Use a worked example if the topic supports one.

## What an AI architect would change

Three or four paragraphs. Describe the architectural shift, not the buzzword. Specify:
- The system shape (orchestration, retrieval, calibration, eval, monitoring)
- The data inputs and their constraints (small N, sparse, biased, etc.)
- The output shape (calibrated probability, dual-scenario NOI, ranked counterparty list, etc.)
- The cost economics in actual dollars per output, with the dominant cost named

This is the section where Russ shows he can underwrite an AI-architecture decision as carefully as he underwrites a CRE deal. The discipline is "we measured and decided," not "AI fixes everything."

## What it would cost

One short paragraph. State a real per-unit cost based on a real model and a real call. If the answer is "this is too expensive at current model pricing", say so and name the price threshold at which the math flips.

## What would not change

One short paragraph. The unsexy part. State the parts of the existing approach that survive contact with the AI-architect rewrite. Usually most of them. The honest framing is "AI changes the calibration and the throughput; the domain logic stays."

## Closing

One paragraph. Land back on the FDAA frame: "This is the kind of analysis a Forward Deployed AI Architect produces in the first week of an engagement. If your firm has a system that looks like the existing approach, here is what I would ask in the first conversation."

---

Russ
Forward Deployed AI Architect candidate
<year>
```

5. **Audit the draft.** Scan for:
   - Em-dashes, exclamation points, superlatives.
   - Anonymity: if the topic involves a Mosaic deal, anonymize the principals. If it involves a lender or institution, name them only when the topic is public (Pine Financial Group, Marks letters, named REIT prospectuses are all public).
   - Specificity: if a number, term, or model is named in the draft, it should be sourced. Vague ranges are acceptable when sourced ("typical hard-money rates of 10 to 14 percent annual"); invented specifics are not.

6. **Write the file.** Save to `content/blog/_drafts/<slug>.md`. If the file already exists, append `-v2` and warn Russ.

7. **Report back** with the draft path, a 3-line summary, and any `[TODO: confirm]` markers requiring Russ's input.

## Brand voice

Carries from Atlas, ODI Bot, and TrialEdge. No em-dashes. No exclamation points. No superlatives. Specific over general. Acknowledge complexity without condescension. Privacy posture per topic.

## Tone

Write as a CRE professional who also happens to be an AI architect, talking to either audience without losing the other. The unique value Russ brings to FDAA roles is the dual fluency; the Field Notes should demonstrate it on every paragraph.

Do not auto-publish. Drafts stay in `_drafts/` until Russ runs `/publish <slug>`.
