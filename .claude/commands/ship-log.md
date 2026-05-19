---
description: Draft a Ship Note blog post (300-700 words) from a project's recent git activity
argument-hint: <project-path> [version-tag]
---

You are drafting a **Ship Note** for russh.work, the portfolio and blog of Russ, Forward Deployed AI Architect candidate.

A Ship Note is a 300-700 word, dated, version-tagged blog post written in the voice of a senior architect logging what shipped, why, and what was measured. It is the running record of how a system evolves. It is **not** marketing copy.

## Inputs

`$ARGUMENTS` will look like one of:
- A project path: `C:\Users\harri\Documents\TrialEdge-ML`
- A project path plus version tag: `C:\Users\harri\Documents\TrialEdge-ML v1.6`

If no path is given, ask which project before continuing.

## Process

1. **Inspect the project.** Read these files in the target project, in order:
   - `CLAUDE.md` (for system context and brand voice carry-over)
   - `README.md` (for stack, version, current state)
   - `pyproject.toml`, `package.json`, or equivalent (for version)
   - Any `PHASE*.md`, `PHASE*_RESULTS.md`, or release notes files (TrialEdge-ML and Bot use this convention)

2. **Read recent activity.** Run:
   - `git -C "<project-path>" log --oneline -30`
   - `git -C "<project-path>" log --stat -10`
   - `git -C "<project-path>" diff <previous-tag>..HEAD --stat` if a previous version tag is available
   - Identify the "what shipped" window: usually the most recent commit cluster or the diff since the previous version tag.

3. **Identify the version.** Extract the new version from the project's manifest, the latest tag, or the most recent PHASE doc. If unclear, ask Russ.

4. **Draft the post.** Use this exact structure, in markdown. Word count target 400-700.

```markdown
---
title: <Project name> v<version>: <what shipped, one phrase>
slug: <project-slug>-v<version>-ship-note
archetype: ship-note
date: <YYYY-MM-DD>
project: <atlas | odi | trialedge | mes | cre | decktrainer>
version: v<version>
status: draft
tags: [<3-5 tags>]
summary: <one-sentence summary, no more than 30 words, written in the voice of the post body>
---

# <Project name> v<version>: <what shipped>

By Russ. <Date>. Ship Note for <Project>.

---

## What shipped

One paragraph. Version number, date, one-sentence summary of the change. State the version bump explicitly (v1.5 to v1.6, Phase 14 to Phase 15, etc.).

## What changed

Bullet list of substantive changes. Each bullet should be a real architectural or code change, not a marketing claim. Use the git commit messages as the spine but rewrite each bullet for an architect audience. Aim for 4 to 8 bullets.

- **<Change name>.** One sentence on what changed, one sentence on why.
- **<Change name>.** Same shape.

## Why this, not the alternative

One short paragraph (2-4 sentences). Name the alternative considered (a different model, a different stack, a heavier solution) and explain in one or two sentences why this approach won. The discipline is "we measured and decided," not "we should use the better thing."

## Measured impact

If there are numbers, give them. If there are no numbers yet, name the eval that will measure the change and when results are expected. Bullet list, mono-feeling, exact values:

- <Metric>: <value> (<before -> after if available>)
- <Metric>: eval pending, expected <date>

## What's next

One sentence on the next version. If the next version is already planned in the project's roadmap, name it. If not, say so honestly.

---

Russ
Forward Deployed AI Architect candidate
<year>
```

5. **Write the file.** Save to `content/blog/_drafts/<slug>.md` (where slug matches the frontmatter slug). If the file already exists, append a `-v2` suffix and warn Russ.

6. **Report the path** of the drafted file back to Russ in your final response so he can open and review.

## Brand voice rules (override all defaults)

- **No em-dashes.** Use commas, parentheses, semicolons, or colons. Search the draft for `—` and `–` before saving.
- **No exclamation points.** Anywhere, including alt text and code comments.
- **No superlatives.** No "amazing", "incredible", "world-class", "revolutionary", "best in class", "robust", "seamless".
- **No urgency manipulation.** No "limited time", "before it's too late".
- **Specific over general.** "AUC 0.686 on a 208-outcome held-out set" beats "high predictive accuracy".
- **Acknowledge complexity without condescension.**
- **Privacy posture.** Atlas: "a wholesale operator in Wake+Durham, NC". ODI Bot: "real brand engagements". Mosaic/CRE: anonymize parties.

## Tone

Write as a senior architect explaining a recent decision to a peer who is technically literate but does not know the system. Confident, specific, willing to name limits. Receipts, not promises.

## After saving

Tell Russ:
1. The exact draft path.
2. Two or three lines summarizing what the draft covers.
3. Any ambiguities you flagged in the draft as `[TODO: confirm]` so he can resolve before publishing.

Do **not** auto-publish. Drafts stay in `_drafts/` until Russ runs `/publish <slug>`.
