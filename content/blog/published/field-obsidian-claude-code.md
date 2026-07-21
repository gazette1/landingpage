---
title: "Field Note: the Obsidian-Claude Code loop for project tracking and roadmaps"
slug: field-obsidian-claude-code
archetype: field-note
date: 2026-05-20
project: null
version: null
status: published
tags: [obsidian, claude-code, workflow, project-tracking, ai-architecture, fdaa]
summary: I run multiple AI projects with one personal stack: Obsidian as the human-facing planning and roadmap layer, Claude Code as the execution layer that reads the same files. The two share the same disk. This Field Note walks the conventions I use to keep the two in sync, where the workflow breaks, and what an AI architect would change if they were building it for a team.
---

# Field Note: the Obsidian-Claude Code loop for project tracking and roadmaps

By Russ. Field Note, 2026.

---

## The existing approach

Most engineers I have watched manage AI-assisted projects use three or four tools at the same time: Notion or Linear for the roadmap, Cursor or Claude Code for the actual editing, a separate chat (ChatGPT, Claude.ai, or Perplexity) for research, and Slack or email for the human handoff. Each tool has its own context. None of them read each other's state.

The cost is real. Switching tools loses context. The roadmap doc in Notion does not know what the AI just wrote in Cursor. The AI doing the writing does not know what the roadmap says is the current sprint goal. The research session does not remember which decision the roadmap was waiting on. Every transition is a chance for the wrong thing to ship.

I multi-task a lot across AI projects and a CRE underwriting practice. The conventional multi-tool setup would collapse under the context-switching tax in a week. The personal workflow I run instead is one stack with two surfaces: Obsidian for me, Claude Code for the model, and a shared file system underneath.

## Where it works

Three properties of my domain make this workflow shape work:

1. **Most of my projects are repository-shaped.** They live in a git repo with a CLAUDE.md at the root, a README, phase docs, source files, and a content folder. Obsidian is happy to treat any folder as a vault. Claude Code is happy to read any path. The two tools point at the same disk locations.

2. **My planning is markdown-first.** Every project roadmap, every phase plan, every decision log lives as a markdown file in the project's docs folder or in a sibling Obsidian vault. Both tools render markdown natively. There is no Notion-to-markdown export step, no Linear-to-markdown sync, no manual copy-paste.

3. **Decisions and code change at different cadences.** I plan in Obsidian (slow, deliberate, sometimes weeks of iteration on a roadmap). I execute in Claude Code (fast, granular, daily commits). The two cadences do not need to be synced because they reference the same files. When I update the roadmap in Obsidian, the next Claude Code session reads the update. When Claude Code lands a phase, I open the phase doc in Obsidian to review and edit.

This is the same architectural pattern Atlas uses for source registry: separate the planning (the source-of-truth schema) from the execution (the per-source scrapers). One tool plans, the other executes, both read from the same data layer.

## Where it breaks

Two failure modes show up consistently.

**Mode one: the Obsidian vault drifts from the live repo.** Say I edit a roadmap doc in Obsidian on my laptop. Meanwhile Claude Code or a git pull modifies the repo. The two views can now disagree. Obsidian does not refresh automatically when the underlying file changes externally. You have to close and reopen the file or hit the reload command. I have lost a few paragraphs of planning to this. The discipline is: do not edit the same file in Obsidian and Claude Code simultaneously, and always git pull before opening a roadmap doc.

**Mode two: Obsidian's links and tags do not translate to Claude Code's mental model.** Obsidian is great at backlinks (page A links to page B; the graph view shows the relationship). Claude Code reads files in sequence based on what is in context. It does not automatically follow Obsidian's `[[backlink]]` syntax. Linked planning in Obsidian becomes invisible to Claude Code unless I explicitly tell the model "also read X, which is linked from Y."

Both modes are tractable. Both are why a more rigorous workflow would use a single source of truth with a thin viewing layer per tool, instead of two tools sharing files directly.

## What I actually do

The vault structure mirrors the repo structure, with one extra subfolder:

```
project-root/
  CLAUDE.md
  docs/
    phase1.md
    phase2.md
    decision-log.md
  obsidian/         <- vault-only files, .gitignored
    daily/
      2026-05-20.md
    inbox/
      raw-ideas.md
```

The `docs/` folder is shared with the repo and committed to git. The `obsidian/` folder is vault-only and gitignored, used for daily notes, raw-idea capture, and freeform thinking that has not yet earned its place in a decision log.

The decision log is the single most important file in any project. Every architectural decision I make on a project gets an ADR-style entry: date, decision, alternatives considered, rejection reasoning. Both Obsidian (for human writing) and Claude Code (for model reading) treat the decision log as the source of truth for "why does this project look the way it does." When I start a new Claude Code session, the first thing I do is `@docs/decision-log.md` to load the context.

Roadmaps follow the same pattern: roadmap.md in the docs folder, with the current sprint goal in the first paragraph and a phase-by-phase plan below. Claude Code reads the roadmap at session start; I edit it in Obsidian between sessions. Every commit that lands work for a roadmap item updates the roadmap status inline. The roadmap is never stale because both tools touch it.

## What it would cost to do this for a team

The workflow is solo-shaped. Scaling it to a team would require three additions:

**A shared vault.** Obsidian Sync, or putting the vault in a shared dropbox/iCloud folder, lets multiple people view and edit. Conflict resolution is manual; Obsidian does not have real-time collaboration.

**A merge discipline.** When two people edit the same markdown doc, you need git merge or a manual reconciliation. For docs/ files, git handles it. For the obsidian/ vault-only files, you need a separate sync tool.

**A decision-log enforcement step.** Solo, I can rely on personal discipline to write every architectural decision into the log. On a team, the discipline has to be in the workflow: every PR that lands an architectural change requires a decision-log entry, enforced by a pre-merge check. This is the same pattern as voice validation in Atlas: enforce the discipline at the boundary, not at the call site.

The team version has three costs. An Obsidian Sync subscription per person ($4-8/month each). A couple of hours of setup. And a few weeks of teaching the discipline to people who have not done ADR-style decision logs before.

## What an AI architect would change

The honest answer is that the solo workflow is already at its rough optimum for one person managing multiple projects. Where an architecture rebuild would help is at three specific friction points:

**Auto-context loading.** Right now I manually `@docs/decision-log.md` and `@docs/roadmap.md` at the start of every Claude Code session. A small hook that reads the CLAUDE.md at session start and pre-loads the named context files would save 30 seconds per session. Over 200 sessions a year, that is real time.

**Bidirectional sync between the decision log and the commit log.** Every commit that introduces an architectural change should append a stub entry to the decision log. The model can write the rationale before the commit. The commit message references the decision log entry. This makes the decision log self-maintaining as code changes happen.

**A typed schema for roadmap status.** Currently the roadmap is freeform markdown. A YAML frontmatter block on each roadmap file (`current_phase: 3`, `next_milestone: 'TabPFN integration'`, `blocked_on: 'data ingestion'`) would let Claude Code parse the status programmatically. It could then offer status-aware suggestions ("you're on phase 3, this looks like phase 4 work").

None of these are heavy lifts. None are critical at solo scale.

## What would not change

The two-surface, one-disk pattern is the right shape for solo AI-assisted work. I have tried single-tool setups, everything in Claude Code, no Obsidian. They fail because the model is bad at the long-form reflective writing the human needs to do to plan well. I have tried single-source planning tools, everything in Notion synced to the repo. They fail because the sync is always behind the actual repo state.

The model writes code. I write plans. We meet at the markdown.

==The architectural principle: in any solo-AI workflow, separate the planning layer from the execution layer, but make them share the same file system. The human gets a tool optimized for thinking; the model gets a tool optimized for editing; both read the same docs. The friction at the boundary is the cost of the freedom on each side.==

## Closing

The Obsidian-Claude Code loop is the personal infrastructure underneath all six production AI projects on this site. Without it I do not run six in parallel; I drop to two and the rest stale.

If you are evaluating how to set up an AI-assisted personal stack, or how to onboard a junior engineer who needs both a planning surface and an execution surface, or how to scale solo-discipline patterns into team-discipline patterns, the questions worth asking are: how do you keep the planning layer and the execution layer reading from the same data without forcing them to use the same tool; how do you enforce decision-log discipline so the project's "why" survives staffing changes; and what is the smallest set of automation hooks that compress the per-session context-loading tax.

Those are the questions this Field Note is meant to answer.

For the multi-source data-fusion counterpart that runs the same shared-data, separate-tools pattern on parcel data, see [Inside Atlas](/blog/inside-atlas.html). For the prompt-suite workflow that produces structured outputs from the same kind of paired-tool discipline, see [Inside the Mosaic feasibility workflow](/blog/inside-cre-feasibility.html).

---

Russ
