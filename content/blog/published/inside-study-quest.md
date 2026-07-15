---
title: "Inside Study Quest: five architectural decisions in a mastery-gated learning app"
slug: inside-study-quest
archetype: thesis
date: 2026-06-21
project: study-quest
version: v1 / 2026
status: published
tags: [pwa, supabase, rls, deepseek, provider-selection, human-in-the-loop, integrity, decision-analysis]
summary: Study Quest is a gamified, mastery-gated catch-up learning app I built for my son to close a grade level over one summer. Five architectural decisions shaped it: ship for the platform you can actually deploy from, pick the model on cost not brand, put the integrity boundary in the database, grade only what the model is reliably good at, and make the reward economy a config not a constant. This post walks each decision, the alternative I rejected, and what it teaches about building AI systems with a real human on the other end.
---

# Inside Study Quest: five architectural decisions in a mastery-gated learning app

By Russ. Built 2026.

---

## What this post is

Study Quest is a gamified, mastery-gated catch-up learning app I built for my 9th-grade son to get on pace in Math, English, and Spanish over a single summer. It is a real system with a real user I care about, which is a very different constraint than a portfolio demo. If it does not work, my kid does not catch up.

It is not a tutorial. It is a walk through five architectural decisions, each with the alternative I rejected, and what each teaches about building an AI system where the point is a measurable human outcome, not a model metric. If you are evaluating how a solutions architect makes tradeoffs under real constraints, the decisions are the artifact.

---

## The decision frame

A learning app for one motivated-but-behind teenager operates inside three conditions that shaped every choice.

1. **The outcome is mastery, not engagement.** Most ed-tech optimizes time-in-app. The goal here is the opposite: get the concept locked, then get out. That inverts the usual incentives and makes gating, not streaks, the core mechanic.

2. **The learner will try to game it.** Any system a teenager uses for a cash-equivalent reward will be probed for the shortcut. Integrity cannot be a UI nicety; it has to be structural, or the whole thing becomes a Robux dispenser.

3. **I am building solo, on Windows, on a deadline.** No team, no Mac, no runway to over-engineer. Every decision had to be the one I could actually ship before the school year restarted.

---

## Decision 1: ship for the platform you can actually deploy from

My son wanted "an iOS app." I am on Windows 11 with no Mac and no Xcode. A native iOS binary was simply not shippable by me, and pretending otherwise would have burned the summer on a toolchain I could not run.

The decision was to build a **PWA**: React, Vite, Tailwind, installable through Safari's Add to Home Screen. It gets an app icon on the phone, runs full-screen, and the camera works through `getUserMedia` on modern iOS PWAs, which mattered for one feature I will get to. I kept the code Capacitor-ready so a native wrap is possible later, but I refused to design around a native build step I cannot execute.

==The transferable lesson: ship for the platform you can actually deploy from, not the one the stakeholder named. A working PWA this summer beats a native app that never compiles.== The number of AI projects that die because the architect designed for infrastructure they did not actually control is large. This one shipped because I designed for the machine in front of me.

---

## Decision 2: pick the model on cost, not brand

I use Anthropic models across most of my other systems. For Study Quest I chose **DeepSeek** instead, specifically for cost.

The reasoning is unit economics. This app runs many small grading and hinting calls per study session, every day, for months. At that call volume the per-token price dominates, and the grading task (evaluate whether a typed explanation demonstrates understanding of a specific step) does not need frontier reasoning. DeepSeek's API is OpenAI-compatible, so the integration cost of switching was near zero, and the key lives in Supabase Edge Function secrets, never in the client.

==The transferable lesson: model selection is a cost-per-useful-output decision, not a loyalty decision. Match the model to the task and the volume.== The same discipline runs through every system I build: use the smallest model that clears the quality bar for that specific call. A solutions architect who defaults to the most capable model on every call is leaving the client's budget on the table.

---

## Decision 3: put the integrity boundary in the database

The core mechanic is mastery gating: you cannot advance to the next module until you have proven the current one, and you earn a cash-equivalent reward for each module mastered. That reward is exactly the incentive to cheat.

The naive place to enforce gating is the UI: hide the next button, disable the reward until a flag flips. That is trivially defeated by anyone who opens dev tools. The decision was to enforce the integrity boundary in the **database, via Supabase Row-Level Security**, across two real accounts: the learner and the mentor. The learner's account physically cannot write its own mastery flags or approve its own rewards; those rows are governed by policies the learner's token cannot satisfy. The mentor account settles the ledger with one-tap approval.

==The transferable lesson: if a boundary matters, it belongs at the layer that cannot be bypassed from the client. The integrity boundary is a database boundary, not a UI state.== This is the same architectural principle as parse-time validation in my other systems and RLS in any multi-tenant app: enforce the invariant where the untrusted party cannot reach it.

---

## Decision 4: grade only what the model is reliably good at

The strongest anti-cheat design in the app came from an honest assessment of what the model could not do. I wanted a "Prove mode" where the learner does real work on paper and the system verifies it. The obvious version is: photograph the handwritten work, have a vision model grade it.

DeepSeek's vision grading was not reliable enough to trust in mid-2026, and grading a teenager's math homework wrong in either direction is corrosive: a false fail demoralizes, a false pass defeats the purpose. So I did not build vision grading. Instead:

- The learner does the work on paper and photographs it. The photo is stored as **mentor-reviewed evidence**, not as an AI-graded artifact.
- The system captures **integrity signals** around it: timestamps, time-on-task.
- The model grades what it is reliably good at: a typed **explain-a-step-back** response, where the learner has to articulate the reasoning behind the step they just did. Understanding the why is hard to fake and is exactly the text-reasoning task the model handles well.

==The transferable lesson: grade what the model is reliably good at, and design the human into the loop for the rest. Do not ship a feature on a capability the model does not actually have.== Refusing to build the vision-grading feature was the most important decision in the app. The temptation to use the flashy capability is precisely where AI systems earn their users' distrust.

---

## Decision 5: make the reward economy a config, not a constant

The reward economy is the behavioral engine: a base payout per module mastered, a first-try bonus, a streak bonus for a five-active-day week, a weekly cap. The currency is Robux, because that is what my son actually spends, tracked as a cash-equivalent balance the mentor settles.

Every one of those numbers lives in editable settings, not hardcoded. The reason is that I do not know the right values yet. The correct base payout, the right cap, whether the first-try bonus should be twenty-five percent or forty, are empirical questions I will only answer by watching a real kid respond over weeks. Hardcoding them would mean a code change and redeploy every time I want to adjust the incentive, which at solo speed means I would simply not tune it.

==The transferable lesson: the parameters you cannot get right on day one belong in editable config, not in the code. The things you will tune are the things you will only tune if tuning is cheap.== The same applies to the pacing engine, which drives off an editable target date, because the real school calendar was not even published when I built it.

---

## What these decisions look like applied elsewhere

Compressed, the five lessons are:

1. **Ship for the platform you can actually deploy from.** Not the one the stakeholder named.
2. **Pick the model on cost per useful output.** Not on brand.
3. **Put integrity boundaries at the layer that cannot be bypassed.** The database, not the UI.
4. **Grade what the model is reliably good at; design the human in for the rest.** Do not ship on a capability the model lacks.
5. **Put the parameters you will tune into editable config.** Cheap tuning is the only tuning that happens.

These are the same tradeoffs that show up in any applied-AI build with a real user and a real budget: enterprise workflow tools, internal copilots, anything where the point is a human outcome rather than a benchmark. Build status as of this writing: all phases built locally, the PWA build passes, a full multi-subject curriculum is seeded and validated, and the remaining work is operational deployment.

---

## Closing

Study Quest is a small system with the highest stakes of anything on this site, because the user is my kid and the outcome is whether he starts the year on pace. The architecture is not fancy. It is a PWA I can actually ship, a cheap model matched to the task, an integrity boundary in the database, a human in the loop exactly where the model is weak, and a reward economy I can tune without a redeploy.

The through-line to the rest of my work is the discipline of building for the real constraint in front of you. If you are building an applied-AI system with a human on the other end, the questions worth asking are: can you actually deploy the platform you chose; is the model matched to the task and the volume; is the boundary that matters enforced where it cannot be bypassed; are you grading only what the model is good at; and are the numbers you will inevitably tune cheap to tune.

For the same cost-and-calibration discipline applied to production ML, see [Inside TrialEdge](/blog/inside-trialedge.html). For another deliberately scoped single-user build, see [Inside DeckTrainer](/blog/inside-decktrainer.html).

---

Russ
