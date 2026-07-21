---
title: "Inside Marketing Bot v2: five architectural decisions in a multi-pass orchestration system"
slug: inside-marketing-bot
archetype: thesis
date: 2026-05-19
project: odi
version: v2.0
status: published
tags: [multi-provider, orchestration, decision-analysis, citation-enforcement, fdaa, judgment]
summary: Marketing Bot v2 is a multi-pass orchestration system that produces senior-strategist-tier marketing deliverables in minutes at software-tier per-deliverable cost. This post is not a walkthrough of the modules or a copy of the pass graph. It is a walk through five architectural decisions I made while building it, the alternatives I rejected, and what each decision teaches about Forward Deployed AI Architect judgment in a high-quality-bar long-context generation domain. The implementation is mine. The reasoning is portable.
---

# Inside Marketing Bot v2: five architectural decisions in a multi-pass orchestration system

By Russ. Production version v2.0, 2026. Originated as a 19-pass orchestration in 2024-2025 under the working name Alchemical Growth Engine.

---

## What this post is

Marketing Bot v2 is a multi-pass orchestration system I built. It turns a sector and an audience description into a senior-strategist-tier marketing deliverable in minutes. The per-deliverable token cost is a small fraction of what a human strategist charges. The system runs across multiple model providers (Anthropic Claude with web search, OpenAI image generation, plus structured-data services for search-volume validation and reference scraping). It ships a flagship long-form deliverable plus several module-scoped outputs that can be used standalone.

This post is **not** a walkthrough of the modules. It is not the pass graph, it is not the prompt library, and it is not the schema for the structured outputs the orchestrator hands between passes. Those are the intellectual property that produces the per-deliverable cost-quality ratio the system achieves, and I am not handing them to a competitor.

What is portable, and what this post is actually about, is the **architectural judgment** I applied while building it. Five decisions, each with alternatives I considered and rejected, each with a transferable lesson about Forward Deployed AI Architect work in a high-quality-bar long-context generation domain. If you are reading this as a hiring manager or a peer evaluating how I think, the decisions are the artifact. If you are reading this hoping to reconstruct the system, you are in the wrong post.

---

## The decision frame

A system that produces strategist-tier deliverables at software-tier cost operates inside three conditions that shape every other choice:

1. **Synthesis is the hard part, generation is cheap.** Modern frontier models are excellent at fluent writing on a constrained brief. What they are bad at, in a single call, is multi-step research, cross-source integration, and disciplined application of an explicit framework. A deliverable produced in one prompt collapses to surface-level output even with a long-context model. Quality emerges from the orchestration, not from the model.

2. **Citations are the difference between strategy and assertion.** A deliverable that asserts a recommendation without sourceable evidence is an essay. The same deliverable with traceable citations on every claim is a defensible recommendation. The architecture has to force evidence at the claim level, not at the document level. Most deliverables that look impressive at first read fall apart when a senior reviewer asks "how do you know that?" The system has to survive that question on every claim.

3. **Cost-per-deliverable determines what tier of business the system serves.** At a low per-deliverable token cost, the deliverable is a high-margin product at consumer pricing tiers. At a higher cost, the same deliverable is still profitable but the customer-acquisition math changes. The architecture decisions that compress token cost without sacrificing quality are the choices that determine which markets the system can serve. This is FDAA-relevant in a specific way. Clients ask about unit economics in the first conversation. The answer they get determines whether the engagement is worth their budget.

Those three conditions are the lens for every decision below.

---

## Decision 1: pass granularity, one long prompt versus many bounded passes

The first decision was the orchestration's basic shape. The candidates:

- A single long prompt to a frontier model with the full context of the deliverable, asking for the complete output in one call.
- A graph of bounded passes, each with a defined scope, structured inputs, structured outputs, and an explicit handoff to the next pass.

Single-prompt was the default option, especially as model context windows expanded into the hundreds of thousands of tokens. The argument for it is operational simplicity: one call, one model, one billing line.

The argument against it, which I judged decisive, is **quality stability across the deliverable**. Single-prompt output on a long, multi-section deliverable degrades meaningfully past the first few sections. The model produces strong opening sections, weaker middle sections, and surface-level closing sections. This is not a hypothesis. It is a reproducible failure mode I observed across multiple model families before I committed to the multi-pass architecture.

A graph of bounded passes solves this. Every section gets the model's full attention on a tight scope, with the prior section's structured output as part of its input. Cost is roughly comparable in tokens. Quality on the back half of the deliverable is meaningfully higher.

==The transferable lesson: when a single-prompt call produces quality that degrades across the output, the architecture wants to be a graph of smaller passes, not a longer single prompt. Context-window length is a red herring; attention-allocation across a long generation is the real constraint.==

The same lesson applies anywhere a long-form deliverable has section-by-section quality requirements: due-diligence reports, audit findings, technical-design documents, legal briefs.

---

## Decision 2: structured I/O contracts with explicit failure handling

Each pass in the orchestration has a defined contract: structured inputs the previous pass produced, structured outputs the next pass will consume, an explicit validation rule that runs on the output before the pass is considered complete.

The decision was not whether to use structured I/O. It was how to handle the failure modes that structured I/O introduces in long-context generation.

Two failure modes dominate, and the architecture has to handle both explicitly:

**Schema-violation failure.** The model produces output that does not parse against the expected schema. The naive response is to retry the pass. The better response is to first attempt a fallback parser that extracts the structured payload from a markdown-wrapped block, a partial response with truncation markers, or a re-prompt with a tightened schema. Only after the fallback fails does the system retry.

**Truncation failure.** The model produces output that ends with the model's "out of tokens" signal. A pass that hits truncation has, by definition, produced incomplete output. The naive response is to use what the model produced and move on. The honest response is to detect the truncation explicitly, drop the partial output, and re-run the pass with tightened input scope so the output fits.

The architectural commitment underneath both failure modes is: **production orchestration cannot fail open**. A pass that returns malformed output must either succeed via fallback or surface as a failure for review. It cannot silently degrade to "best effort" and pass partial output downstream, because downstream passes will then operate on poisoned input.

==The transferable lesson: silent failure is the most common production-LLM failure mode and the hardest to debug. Every pass needs an explicit failure handler with explicit retry and surface-for-review behavior. "Try, fall back, retry, surface" is the four-stage discipline.==

This is the same architectural pattern as voice validation in Atlas (parse-time gate, retry, surface for manual review) and the same pattern I would apply to any LLM-in-the-loop system where downstream consumers depend on the previous step's output being well-formed.

---

## Decision 3: citation enforcement at the claim level

Every claim in the deliverable has to be supported by a source the orchestrator can trace. The decision was where in the architecture to enforce this.

The candidates:

- **At the document level.** Require N citations across the document. Easiest to enforce; allows the model to put all the citations in one section and leave others unsupported.
- **At the section level.** Require N citations per section. Better; still allows the model to cluster citations on easy claims and skip hard ones.
- **At the claim level.** Every assertion the model produces is tagged with a source and a confidence score. Claims without sources are either demoted to soft framing or rejected by the pass validator.

Claim-level enforcement is the only one that produces a defensible deliverable. The other two produce deliverables that pass surface review and fail under questioning.

The implementation overhead is real. Every pass that produces a claim has to attach a source pointer. Every claim has to be checkable against the cited source. The orchestrator has to enforce the gate before the claim ships downstream. The overhead is paid in token cost (more structured output per call) and in engineering cost (the citation infrastructure is non-trivial).

It is worth it. The deliverable that survives a senior reviewer's "how do you know that?" on every claim is the deliverable a client actually pays for.

==The transferable lesson: in any LLM-in-the-loop system that produces claims-as-output, enforce citations at the claim level, not at the document level. Document-level enforcement looks like it works and quietly fails the production bar.==

This is the same discipline a credit-rating agency or a regulated underwriter applies to its work product. The trick is to encode it in the architecture so the model cannot quietly skip it.

---

## Decision 4: cost-architecture by deliverable tier, not by capability

A multi-provider orchestration touches multiple models and multiple paid services. The decision was how to route calls across model sizes and providers.

The naive approach is to use the strongest available model for every pass on the theory that quality matters most. The decisive approach is to **size the model to the pass**.

Some passes are tight: strict schema, well-defined transformation, low ambiguity. A smaller model handles these passes equivalently to a larger model at a fraction of the cost. Some passes are loose: open-ended synthesis, research-driven framing, cross-source integration. A larger model with web-search tooling produces meaningfully better output and is worth the cost.

The architecture supports per-pass model overrides as a first-class feature, not an afterthought. The per-pass model selection is part of the pass contract, not buried in the prompt.

The cost outcome at the flagship deliverable tier is low. The token cost is a small fraction of what the same deliverable would cost if every pass ran on the largest model. The quality outcome is indistinguishable in side-by-side reviews. The two together are the cost-architecture that makes the system economically viable at the price points it targets.

==The transferable lesson: in any multi-provider orchestration, the cost-per-deliverable economics are determined by per-pass model selection, not by global model selection. The architecture has to support per-pass overrides as a first-class concept.==

The same lesson generalizes to any agentic system, any RAG pipeline, any multi-step tool-use chain. The naive approach picks one model and uses it for everything. The disciplined approach picks the smallest model that produces equivalent quality on each step.

---

## Decision 5: separate the composer from the orchestration

The orchestration produces a structured payload. The composer turns that payload into the final rendered deliverable (a branded long-form document, in this case). The decision was whether to fuse the composition into the orchestration or to separate them.

Fused architecture treats the model's output as the final document and renders it directly. Separated architecture treats the model's output as a structured intermediate representation and runs a deterministic composer to produce the final document.

Separated wins on three criteria:

**Re-rendering is free.** Once the structured payload exists, producing the same deliverable with different branding, different layout, or different language is a composer-only operation. No model calls, no token cost. For a productized service that ships under multiple brands, this is a material economic advantage.

**The composer is testable.** A deterministic composer with a known schema is testable in isolation, against fixtures, without model calls. The orchestration is harder to test because LLM outputs are non-deterministic. Separating the composer means most of the test surface is deterministic.

**The composer is portable across deliverable types.** A separated composer can render the same payload into different formats (PDF, slide deck, email sequence, dashboard) without re-running the orchestration. The orchestration's IP stays in the orchestration; the composer is a render layer.

==The transferable lesson: in any system where the LLM produces structured output that gets rendered, separate the rendering from the generation. The rendering is deterministic, testable, and free to re-run. Fusing them costs you those three properties.==

The same lesson applies to any document-generation pipeline, any report-builder, any structured-output-to-presentation flow.

---

## What these decisions look like applied elsewhere

If you are looking at how the Marketing Bot decisions translate to a different domain, the five lessons compress to:

1. **Multi-pass orchestration beats single-prompt generation on quality-stable long deliverables.** Attention allocation, not context-window length, is the real constraint.
2. **Production LLM orchestration must handle structured-output failure modes explicitly.** Try, fall back, retry, surface. Silent failure is the default and the most dangerous.
3. **Citation enforcement belongs at the claim level, not the document level.** Document-level enforcement fails the production bar.
4. **Cost-per-deliverable economics depend on per-pass model selection.** The architecture has to support per-pass overrides as a first-class concept.
5. **Separate the composer from the orchestration.** Re-rendering becomes free, testing becomes possible, and the deliverable becomes portable across formats.

These five are the architectural patterns I would apply to any document-generation system, any agentic research pipeline, any RAG-driven report builder, any multi-step LLM-in-the-loop workflow that has to produce defensible, production-quality output at a competitive per-deliverable cost. They are the closest thing I have to a portable methodology for this class of system.

---

## What this post does not contain

For the record: this post does not contain the pass graph, the prompt library, the structured-output schemas, the per-pass model assignments, the citation-score computation, or the composer's renderer library. Those are the IP that produces the system's cost-quality ratio. The decisions and the reasoning are the artifact; the implementation is mine.

If you are a hiring committee and you want a walkthrough of the orchestration with the prompts and schemas intact, that is what an on-site technical conversation is for, not what a public blog post is for.

---

## Closing

Marketing Bot v2 is the project in my portfolio that most directly shows how I make architectural decisions in a high-quality-bar long-context generation domain. In that domain the deliverable has to survive senior review. The per-deliverable economics determine which markets the system can serve.

If you are building something similar in a different domain (regulated white-paper generation, financial research synthesis, due-diligence reports, audit findings, technical-design documents at scale), the questions worth asking are: how do you pick between single-prompt and multi-pass generation for a long deliverable; how do you handle structured-output failure modes without falling open; how do you enforce citations at the claim level without burying the model in instructions; how do you route calls across model sizes to compress per-deliverable cost; and how do you separate the rendering layer from the orchestration so the deliverable is portable across formats.

Those are the questions this post is meant to answer for Marketing Bot v2.

For the production-ML calibration discipline that shaped my eval philosophy across projects, see [Inside TrialEdge](/blog/inside-trialedge.html). For the customer-facing signal-composition counterpart, see [Inside Atlas](/blog/inside-atlas.html). For the algorithmic-trading decision-analysis counterpart, see Inside MES Open when it lands.

---

Russ
