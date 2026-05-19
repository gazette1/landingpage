---
description: Draft a Thesis-post blog (2000+ words, TrialEdge-tier) covering a system's architecture
argument-hint: <project-path> [topic-focus]
---

You are drafting a **Thesis post** for russh.work, the portfolio and blog of Russ, Forward Deployed AI Architect candidate.

A Thesis post is the deepest archetype on the site. Target 2,000 to 3,000 words. Mirrors the depth, structure, and voice of the existing TrialEdge architecture write-up at `content/blog/published/inside-trialedge.md` (if it exists yet). The Thesis post is the artifact that lands in a senior engineer's inbox and earns an interview.

## Inputs

`$ARGUMENTS` will look like one of:
- Just a project path: `C:\Users\harri\Documents\TrialEdge-ML`
- Project path plus a topic focus: `C:\Users\harri\Documents\TrialEdge-ML calibration-and-eval`

If no path is given, ask which project before continuing.

## Process

1. **Read the calibration gold standard.** First read `content/blog/published/inside-trialedge.md` if it exists. That post is the quality bar. Match its structure, its tone, its honesty, and its specificity. If it does not exist yet, use the post-structure template below.

2. **Inspect the project deeply.** Read:
   - `CLAUDE.md` for system context and constraints
   - `README.md`
   - All `PHASE*.md` / `PHASE*_RESULTS.md` files in order (these are the architectural record)
   - Key source files (the model module, the orchestration module, the eval module)
   - The current `pyproject.toml` / `package.json`
   - `docs/` if present
   - The full git log: `git -C "<project-path>" log --oneline -50` and key commit diffs

3. **Identify the three properties of the domain** that shape the architecture. This is the section that makes Thesis posts worth reading. Examples from TrialEdge:
   - Small N (rules out deep nets)
   - Asymmetric payoff (calibration beats raw accuracy)
   - Sparse biased signal (extraction quality matters more than model size)
   
   For each project, find the equivalent three. Name them. Tie every architectural choice back to them.

4. **Draft the post.** Use this structure exactly. Word count target 2,000 to 3,000.

```markdown
---
title: Inside <Project>: a <discipline> for <problem>
slug: inside-<project-slug>
archetype: thesis
date: <YYYY-MM-DD>
project: <atlas | odi | trialedge | mes | cre | decktrainer>
version: v<current version>
status: draft
tags: [<5-7 tags>]
summary: <one paragraph, 40-60 words, written in the voice of the post body. Names what the system does, what is calibrated against, the cost economics, and the FDAA-relevant takeaway>
---

# Inside <Project>: a <discipline> for <problem>

By Russ. Production version <v current>, deployed <year>.

---

## What this post is

One paragraph (4-6 sentences). Name the system, the production state, the key metric, and the cost. State the architecture's three operative principles in one phrase. Identify the FDAA audience: "If you are a Forward Deployed AI Architect, the parts I expect to be most useful are X, Y, and Z."

---

## The problem

Three to four paragraphs. Name the domain. Describe the three properties of the domain that shape every architectural choice. Be specific about why each property rules in or rules out certain architectures.

Three properties of this domain shape everything downstream:

1. **<Property 1>.** One paragraph.
2. **<Property 2>.** One paragraph.
3. **<Property 3>.** One paragraph.

End the section with a one-sentence framing: "<Project> is shaped by the three constraints in order."

---

## System overview

A bullet list of the stack components, each as a short labeled bullet. Then one paragraph naming the total monthly run cost and what dominates it. Then one short paragraph reserving "the stack choices were cost-driven, not capability-driven."

---

## Data ingestion (if applicable)

Two to four paragraphs. Describe the pipelines. Call out two things to watch:
- Where context windows or pipeline assumptions break.
- How attribution is preserved (citation pointers, audit trails, schema enforcement).

---

## The modeling layer (or the orchestration layer, depending on system)

The most important section. Subsections per architectural decision.

### Why <X>, not <Y>

One paragraph per major decision. Always name the alternative. Always explain why this won at this sample size, this domain, this cost.

### <Signature component name>

The named architectural piece that makes this system distinct. For TrialEdge it was CalibratedDebateScorer. For ODI it would be the 19-pass orchestration with citation enforcement. Each system has one. Name it. Describe its two or three jobs. Show a code snippet or schema if it carries the explanation.

### Held-out performance (or measured outcome)

The honest section. State the metric, state what the metric means, state what it does **not** mean. "Calibration is the product. Discrimination is the qualifier" is the model line. Find the equivalent for this system.

---

## The eval rig

The section that separates serious systems from demos. Three layers:

**Offline eval** runs on every code change. Name the held-out split discipline. Name the metrics. Name what catches the regressions other metrics miss.

**Online eval** runs continuously against production. Name the source of truth (editorial layer, real users, real outcomes). Name the rolling windows. Name what this catches that offline cannot.

**Drift detection** runs at the feature, input, or output level. Name the threshold. Name the times it has fired in production and what it caught.

### What I do not do, and why

Two or three short paragraphs naming things explicitly **not** done in this system (no automated retraining, no ensembling, no agentic loops, whatever the relevant choices are) and why they were rejected.

---

## Cost economics

Forward Deployed AI Architects get asked about per-unit economics. State them.

- **Per-<unit> cost (inference):** $<amount>, dominated by <which call>.
- **Per-<other unit> cost (ingestion):** $<amount>, scaling with <what>.
- **Total monthly run cost:** $<amount> at current volume. The cap is <what>.
- **What I would change with more budget:** name a specific routing or model decision. Defend it with eval-driven reasoning, not aspiration.

End the section with the line: "This is the discipline that separates 'we should use the better model' from 'we measured and decided.' The second answer is the one that lands in technical interviews."

---

## Monitoring and observability

The question every senior architect asks. Layered list:

1. **Pipeline health.** What logs, what alerts, what pages.
2. **Feature / input distribution drift.** The interesting failures are usually upstream.
3. **Output distribution monitoring.** Rolling shape of model outputs.
4. **Calibration tracking** (for ML systems) or **citation faithfulness** (for orchestration systems).
5. **Audit log.** Editorial or operator changes write to an append-only log.

Close with the credit-underwriting analogy: "In credit, you do not get to claim a deal is performing because you closed it; you have to defend it against the eventual realized outcomes. I run <Project> the same way."

---

## What I would change starting over

Two or three items, in priority order. Each item is one paragraph. Be honest about what is working that you would not change.

1. **<Item>.** Why it would be different, what the cost would be, what the gain would be.
2. **<Item>.** Same shape.

---

## Closing

One short closing paragraph. State the FDAA-relevant questions this post is meant to answer: "If I were hiring a Forward Deployed AI Architect to build something similar in a different domain, the questions I would ask are X, Y, Z. Those are the questions this post is meant to answer for <Project>."

Link to one related artifact (the case study, the deck, the next post in the series).

---

Russ
Founder, Mosaic Capital Solutions and <Project lockup>
<year>
```

5. **Audit the draft.** Before saving, scan for:
   - Any em-dash (`—` or `–`). Replace.
   - Any exclamation point. Replace or rephrase.
   - Any superlative ("amazing", "incredible", "world-class", "best in class", "robust", "seamless").
   - Any "AI-powered" without naming the model and the task.
   - Privacy violations (Atlas name, ODI client names, Mosaic principal names).

6. **Write the file.** Save to `content/blog/_drafts/<slug>.md`. If the file already exists, append `-v2` and warn Russ.

7. **Report back** with the draft path, a 3-line summary, and any `[TODO: confirm]` markers in the body that need Russ's input before publishing.

## Brand voice (override all defaults)

Carries from Atlas, ODI Bot, and TrialEdge:
- No em-dashes
- No exclamation points
- No superlatives
- No urgency manipulation
- Specific over general
- Acknowledge complexity without condescension
- Privacy posture per project

## Tone

Write as a senior architect explaining the system to a senior peer who has not seen it. The post should be useful to someone evaluating whether to adopt a similar shape in a different domain. It is **not** a sales pitch for the project.

Do not auto-publish. The draft stays in `_drafts/` until Russ runs `/publish <slug>`.
