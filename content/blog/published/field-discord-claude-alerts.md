---
title: "Field Note: Discord as the second screen for Claude Code activity"
slug: field-discord-claude-alerts
archetype: field-note
date: 2026-05-20
project: null
version: null
status: published
tags: [discord, claude-code, webhooks, alerts, ambient-notification, ai-architecture, fdaa]
summary: Long-running AI tasks have a coordination problem. You cannot stare at the terminal for fifteen minutes waiting for a build, but you also cannot afford to forget what was running. I route Claude Code activity to a private Discord server via webhooks: ship notifications, build failures, long-task completions, daily summaries. Discord becomes the second screen. This Field Note walks the hook architecture, the channel layout, and what an AI architect would change if they were building a team version.
---

# Field Note: Discord as the second screen for Claude Code activity

By Russ. Field Note, 2026.

---

## The existing approach

Most AI-assisted development workflows assume you are watching the terminal. The model emits a status line, you read it, you respond, the model continues. This works for tight, foreground tasks (writing a function, debugging an error). It fails for any task that runs more than a few minutes.

A long-running task in Claude Code (a backtest sweep, a multi-file refactor, a batch publish of blog posts) sits between two bad options. Option one: you watch the terminal for 15 minutes doing nothing, which is wasted attention. Option two: you switch to another task and forget to come back, which is wasted output. The model finished and is waiting for the next instruction, and you do not know.

The conventional fix is desktop notifications, which work but are noisy and easily dismissed. The fix I actually use is Discord webhooks routed to a private server.

## Where it works

Discord works as an alert channel for three reasons.

1. **It is already where I spend ambient attention.** I have Discord open on a side monitor for community participation. Routing AI alerts to a dedicated channel on that monitor means the notification lands in a context I already check. It does not land in a new context I have to remember to check.

2. **Webhooks are free, easy, and fast.** Every Discord channel can have a webhook URL that accepts a POST request and posts the body as a channel message. No bot registration, no OAuth, no rate-limit handling for low-volume use. A bash `curl -X POST` is the entire integration on the sender side.

3. **The channel structure becomes the project structure.** I have one channel per project (#atlas, #trialedge, #mes, #marketing-bot, etc.). Then #ship-log for all version bumps across projects, #failures for any task that errored, and #daily-summary for a once-a-day digest. The channel layout becomes the dashboard.

## Where it breaks

Two failure modes show up regularly.

**Mode one: the alert volume drowns the signal.** Early on I sent a webhook on every Claude Code session start, end, and tool call. The channels turned into log dumps that I stopped reading. The fix was a strict allowlist: alerts only fire on (a) a session that completed a meaningful task as judged by a Stop hook, (b) any error or unrecoverable failure, (c) any commit that pushed to a remote, (d) any scheduled task firing or missing its window. Everything else stays in the terminal.

**Mode two: the message format matters more than I thought.** A raw text dump from Claude Code is unreadable in Discord. The format that actually gets read is: one-line summary in bold, three-line context block in monospace, link to the relevant commit or file. Discord's markdown rendering helps. The discipline of one-line-summary-first is what makes the alert actionable in a glance.

## What I actually do

The architecture is small.

**Claude Code hooks** trigger on Stop, on tool failures, on certain script completions. The hook is a tiny bash script that constructs a JSON payload and POSTs to a per-project webhook URL stored in an environment variable.

**A shared library** of message formatters (one for ship notes, one for failures, one for daily summary) keeps the format consistent across projects. Adding a new project means adding a new webhook URL and pointing the existing formatters at it.

**A daily-summary cron** runs at 8 AM. It walks the previous day's git activity across all my projects, and posts a single message to #daily-summary with what shipped, what failed, what is queued. This is the message I actually read every morning while drinking coffee.

**A failures-only catch-all** sits at #failures. Anything that goes wrong in any project ends up here with the project name in the message. This is the closest thing I have to a pager.

The channels and the hooks together replace what would otherwise be a custom dashboard. I do not need a status page or a Grafana board; I have Discord.

## What it costs

The cost stack is rounding error.

**Discord:** free for personal use. The server I run for AI alerts has one user (me) and zero paid features. No bots, no Nitro, no premium tier.

**Hooks:** the bash scripts that POST to the webhooks are 20 to 50 lines each. They run as Claude Code Stop hooks (free), as cron jobs (free), or inline in build scripts (free).

**Time:** an hour to set up the webhooks per project, another hour to write the message formatters, ongoing maintenance is essentially zero.

The value is the recovered attention. Before this setup, I lost 10 to 20 minutes per day to checking terminals for completed tasks. Or worse, I forgot tasks finished and discovered them stale the next morning. Now the completions surface in Discord and I respond at my own pace.

## What an AI architect would change

If I were building the team version, three changes.

**A shared schema for alert messages.** Right now each formatter is hand-written. A typed message schema (severity, project, summary, context, action_url) would let the formatters be auto-generated from the schema. It would also let downstream tooling (filters, threading, escalation) work consistently.

**Threading by task.** Discord supports threads. A long-running task that emits multiple status updates should land them in a single thread, not as separate messages. This needs the hooks to maintain a task-id state, which is harder than it sounds because tasks span sessions.

**An "ack" loop.** Currently the alerts are one-way. For team use, you want to acknowledge an alert (so others know it has been seen) and convert it to a follow-up task. A Discord bot that accepts emoji reactions as ack and writes them back to a tracking system would close that loop. I have not built this because solo use does not need it.

None of these are critical. The current setup works at solo scale.

## What would not change

The pattern is right. Long-running tasks need ambient notification, not active monitoring. Channel-per-project is the right organizing principle because it matches how the work is already organized. The discipline of "only fire on meaningful events" is what keeps the channels readable.

==The architectural principle: in any system where humans coordinate with long-running AI tasks, the alerts should land in a channel the human already watches, in a format the human can read in one glance, with a strict allowlist for what fires. Volume is the enemy. Signal is the product.==

The same principle applies to monitoring pipelines for production AI systems, to ops alerts on infrastructure, to credit-committee escalation paths, to incident-response triage. Discord is the surface I happen to use. The pattern is portable.

## Closing

Discord as a second screen is the personal infrastructure that makes multi-tasking across AI projects sustainable. Without ambient notification, I forget tasks finished. Without channel-per-project structure, the alerts blur together. Without strict allowlisting, the channels turn into noise. All three disciplines together turn Discord into a real coordination layer for solo AI work.

If you are evaluating how to set up ambient notification for AI-assisted work, or how to scale solo-coordination patterns into team-coordination patterns, the questions worth asking are: which channel does your human already watch (Slack, Discord, SMS, email); what is the strict allowlist for events worth alerting on; how do you format the message so it is readable in one glance; and how do you keep the volume low enough that the channel stays signal.

Those are the questions this Field Note is meant to answer.

For the project-tracking counterpart that pairs Obsidian and Claude Code into a planning-and-execution loop, see [the Obsidian-Claude Code loop for project tracking](/blog/field-obsidian-claude-code.html). For the orchestration discipline behind structured outputs at scale, see [Inside Marketing Bot v2](/blog/inside-marketing-bot.html).

---

Russ
