---
title: "Field Note: a season of strikeout picks, graded against the market"
slug: field-strikeout-season-2026
archetype: field-note
date: 2026-10-26
project: strikeout
tags: [baseball, statcast, lightgbm, market-lines, calibration, evaluation, github-actions, clv]
word_count: 1394
read_time_min: 7
---

# Field Note: a season of strikeout picks, graded against the market

492 picks over 109 game days, every one regraded against Statcast after the season. The posted record is 80 percent. The honest record is 55 percent, and the sportsbook's line forecast strikeouts better than the model did. What the cushion hid, what the operations got right, and the one thing that was never logged.

By Russ. Field Note, 2026. Companion to [Inside StrikeOut Bot](inside-strikeout-bot.html), with one correction up front: that post describes a 40-feature design with a stacked meta-learner. The system that ran this season is a June rebuild with 12 features and no stacker. The original pipeline never produced a model. The rebuild did, and this note grades what it actually did.

---

## What ran

A GitHub Action fires at 13:00 UTC. It loads a 62 KB snapshot of pitcher and team state, pulls the day's probable starters from the MLB Stats API, pulls pitcher strikeout over/under lines from The Odds API, and runs three LightGBM quantile models (3rd, 50th, and 97th percentile) trained on roughly 1.9MM Statcast pitches from 2024 through June 2026. The 12 features are all computed from prior games only: career strikeout rate, swinging-strike and called-strike-plus-whiff rates, two-strike putaway rate, batters faced per start, strikeout rate over the last three starts, fastball velocity, days of rest, opponent strikeout rate overall and against the pitcher's hand, home flag, and prior start count.

It posts the five highest projections to a Discord channel with the market line beside each one and a conservative play two strikeouts under it, so a 5.5 line becomes a 4-or-more play. The next morning it grades yesterday against Statcast, posts a scorecard, and commits the picks and results back to the repository. Git is the ledger.

It did that 108 times out of 109 game days. One run was missed, on July 18. Every other day without a post was an off-day. Grading matched Statcast on 439 of 439 picks that the pipeline scored during the season.

---

## The record, three ways

| Measure | Result | 95 percent interval |
|---|---|---|
| At the posted play (market line minus 2) | 383-95, 80.1 percent | 76 to 83 |
| Same picks, over at the market line | 206-244, 45.8 percent | 41 to 50 |
| Model direction at the market line | 246-204, 54.7 percent | 50 to 59 |
| Model forecast error | 2.04 strikeouts |  |
| Market line forecast error | 1.90 strikeouts |  |
| 90 percent interval coverage | 85.4 percent | target 90 |

Three different stories from one set of picks. The first row is what the Discord channel saw. The second is what those same pitchers did against the number a sportsbook actually posted. The third is the only one that tests whether the model knows anything the market does not: bet over when the projection sits at or above the line, under when it sits below.

---

## The 80 percent is the cushion

Every posted play was two strikeouts below the market line. That cushion, not the model, produced the record. Hit rate falls as the posted line rises, exactly as it would for any forecast:

| Posted play | Record | Hit rate |
|---|---|---|
| Over 2.5 | 87-11 | 88.8 percent |
| Over 3.5 | 80-23 | 77.7 percent |
| Over 4.5 | 102-29 | 77.9 percent |
| Over 5.5 | 52-14 | 78.8 percent |
| Over 6.5 | 17-9 | 65.4 percent |

A line two strikeouts under the market is an alternate line, and alternate lines are priced for it. At minus 250 the breakeven is 71.4 percent. At minus 300 it is 75.0. At minus 400 it is 80.0, which is where this record sits. The season's return is somewhere between plus 12 percent and minus 2 percent depending on the price paid, and the price paid is unknown, because the bot stored the line on 460 of 492 picks and the price on zero of them.

**A hit rate without a price is not a result. The two cheapest fields the system could have logged, the price at post time and the closing line at first pitch, were the only two that would have answered whether the season made money. Neither was built. That is the finding that outranks every other number here.**

---

## The market beat the model

On the model's own picks, the posted market line missed actual strikeouts by 1.90 on average and the model missed by 2.04. The market was also unbiased, within a tenth of a strikeout. The model projected 0.62 strikeouts too low on average, and that bias was already present in June and July with a fresh state snapshot, so it is a property of the model on the high-strikeout pitchers it selects, not an artifact of stale inputs.

The direction signal has one interesting corner. The model said under on 318 of 450 lined picks and was right 56.3 percent of the time, interval 51 to 62. It said over on 132 and was right 50.8 percent. Whatever edge existed this season lived in the under lean, and it is not statistically clear of the 52.4 percent breakeven at standard juice, let alone the 54.5 percent that prop pricing usually demands.

**When the market line is available at prediction time, it is the strongest single feature you can have, and the model never looked at it. The cheapest upgrade is not another Statcast feature. It is anchoring the projection to the line and modeling the residual.**

---

## What the losses were

Of 95 losses at the posted play, 62 were starts of three strikeouts or fewer, and five were zero. The median pitch count in a loss was 87 against 92 in a win, and only 13 of the 95 losses were outings under 60 pitches. An earlier mid-season read, on 39 picks, had called the losses innings losses, pitchers pulled early. At season scale that did not hold. Most losses were normal-length starts with low strikeout totals. The pitcher stayed in and did not miss bats.

The 90 percent interval covered 85.4 percent of outcomes, the same under-coverage the walk-forward validation showed before the season. The conservative play was sold as a floor. The floor was leakier than advertised, by about the margin the backtest had already said it would be.

---

## Operations, graded

The reliability was real. 108 of 109 game days, no dependence on a laptop being awake, grading that matched the ground truth on every pick it touched, and a git history that let the whole season be reconstructed after the fact from 116 daily commits.

Four things were wrong, and three of them are the kind that never throw.

- The grader built its strikeout map from strikeout events, so a starter who recorded zero was absent from the map and graded as did-not-pitch instead of a loss. Five losses hid as voids all season.
- The state snapshot was generated on June 28 and never regenerated. From August on, every pitcher's days-of-rest input sat at the 30-day cap and recent form was four months old. A weekly refresh was proposed on June 30 and never scheduled.
- No price, no closing line. Covered above.
- Two review sessions in August declared the pipeline dead because the laptop's copy of the repository stopped at July 19. The remote had 96 commits they never fetched. The system was running fine; the reviewers checked the wrong machine.

**Before you declare a cloud job dead, fetch the remote. The local checkout is a cache of the past, not a status page.**

---

## What changes for 2027

1. Store the price at post time and the closing line at first pitch on every pick. Closing line value is the only edge metric that resolves on a sample this size.
2. Grade a zero-strikeout start as a loss.
3. Regenerate the state snapshot weekly, in the same Action.
4. Feed the market line into the model and project the residual.
5. Re-test the under lean at real prices.
6. Size nothing above a flat unit until 100 picks show positive closing line value. The season produced no evidence either way on profit, and the correct response to no evidence is not a bigger stake.

---

## Six notes for anyone building similar

- Grade against the market, not against your own posted number. A cushion will flatter any forecast.
- If a line exists at prediction time, log the price next to it. A hit rate without a price is a story, not a result.
- The market line is a feature. If your model cannot beat it on forecast error, use it.
- Audit the grader on the edge cases that produce no event. Zero is a value, not an absence.
- Anything generated once and loaded daily will go stale silently. Put the regeneration in the same scheduled job as the consumer.
- A thesis post describes a design. A field note grades a system. Publish both, and let the second correct the first.

Personal project. Nothing here is advice on what to bet.
