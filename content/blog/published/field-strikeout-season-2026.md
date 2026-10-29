---
title: "Field Note: a season of strikeout picks that hit 80 percent on the alt line"
slug: field-strikeout-season-2026
archetype: field-note
date: 2026-10-29
project: strikeout
word_count: 1273
read_time_min: 6
---

# Field Note: a season of strikeout picks that hit 80 percent on the alt line

492 pitcher strikeout picks over 109 game days, 383-95 at the posted alt line, every one regraded against Statcast. How a conservative-floor strategy ran unattended all season, where the money came from, and the one upgrade for 2027.

By Russ. Field Note, 2026. Companion to [Inside StrikeOut Bot](inside-strikeout-bot.html), which describes the original 40-feature design. The system that ran this season is a leaner June rebuild: 12 features, three quantile models, no stacker. This note grades what the rebuild actually did on the field.

---

## The strategy

The play was never to out-forecast the sportsbook on the main line. The play was floors. Three LightGBM quantile models produce a 3rd percentile, a median, and a 97th percentile strikeout projection per starter. The bot ranks the day's starters by median, takes the market line from The Odds API, and posts a play two strikeouts under that line, so a 5.5 line becomes a 4-or-more play. The line tells you where the market expects the pitcher to land. The cushion is the bet.

That is an alternate line, priced accordingly, and the whole question of the season was whether the floors would hold at a rate that beats the alt-line price. They did.

---

## The record

| Measure | Result |
|---|---|
| Picks posted | 492 over 109 game days |
| Record at the posted play | 383-95, 80.1 percent |
| 95 percent confidence interval | 76 to 83 percent |
| Regular season | 348-84, 80.6 percent |
| Postseason | 35-11, 76.1 percent |
| Pushes and did-not-pitch | 2 and 12 |
| Mornings posted unattended | 108 of 109 |

The number that matters most is not the 80. It is that the 80 held every month. A strategy that hits 90 in July and 65 in September is a coin that got lucky. This one did not move.

| Month | Record | Hit rate |
|---|---|---|
| July | 100-23 | 81.3 percent |
| August | 126-28 | 81.8 percent |
| September | 112-32 | 77.8 percent |
| October | 35-11 | 76.1 percent |

By posted line it behaves the way a floor should. The lower the number the pitcher has to clear, the more often he clears it:

| Posted play | Record | Hit rate |
|---|---|---|
| Over 2.5 | 87-11 | 88.8 percent |
| Over 3.5 | 80-23 | 77.7 percent |
| Over 4.5 | 102-29 | 77.9 percent |
| Over 5.5 | 52-14 | 78.8 percent |
| Over 6.5 | 17-9 | 65.4 percent |

**An alt line priced at minus 250 breaks even at 71.4 percent. At minus 300 it breaks even at 75.0. A strategy that hits 80.1 percent with a floor of 76 clears both with room. At minus 400 the breakeven is 80.0, which this record sits on. The lines I was betting ran about minus 300 to minus 400, so the season returned roughly flat to plus 7 percent on flat stakes, and it closed in profit.**

---

## The receipts

Every grade in that table was checked after the season, not taken from the bot's own scorecard. I pulled Statcast for June through October, counted strikeouts for every pitcher who threw a pitch on each pick date, and regraded all 492 picks. Two things came out of that.

First, the bot's in-season grading was right. On the 439 picks it scored during the season, its strikeout counts matched Statcast 439 times. Second, it had been too generous to itself in one narrow way: a starter who recorded zero strikeouts never appeared in its strikeout map and was graded as did-not-pitch instead of a loss. Five of those hid as voids. The 383-95 above counts them as the losses they were. The record got slightly worse under audit, which is what an audit is for, and it stayed above 80.

---

## What ran, and how it stayed up

A GitHub Action fires at 13:00 UTC. It loads a 62 KB snapshot of pitcher and team state, pulls probable starters from the MLB Stats API, pulls strikeout lines from The Odds API, runs the three quantile models, posts the five plays to Discord, and the next morning grades yesterday, posts a scorecard, and commits the picks and results back to the repository. Git is the ledger. The whole season was reconstructed after the fact from 116 daily commits.

The 12 features are all computed from prior games only: career strikeout rate, swinging-strike and called-strike-plus-whiff rates, two-strike putaway rate, batters faced per start, strikeout rate over the last three starts, fastball velocity, days of rest, opponent strikeout rate overall and against the pitcher's hand, home flag, and prior start count. Training data is roughly 1.9MM Statcast pitches from 2024 through June 2026.

It missed one morning, July 18. Every other day without a post was an off-day. It ran through the All-Star break, a laptop that spent most of the summer asleep, and a stretch in August when two separate reviews declared it dead because they checked the laptop's copy of the repository instead of the remote. The remote had 96 commits they never fetched.

**The reliability came from one decision made on June 30: move the job off the laptop and into a scheduled cloud action that commits its own state. Everything that happened after that was the machine doing the same thing every morning.**

---

## What the losses were

Of 95 losses, 62 were starts of three strikeouts or fewer and five were zero. The median pitch count in a loss was 87 against 92 in a win, and only 13 of the 95 were outings under 60 pitches. The losses were not early hooks. They were full-length starts where the pitcher did not miss bats. The floor two strikeouts under the line absorbs an ordinary bad night; it does not absorb a pitcher who simply has nothing that day, and nothing in public data predicts that night in advance.

---

## What gets better in 2027

Three findings from the audit point at the upgrades, in order.

1. Log the price. The bot stored the market line on 460 of 492 picks and the price on none of them. The profit for the season lives in my own ledger, not in the bot's. In 2027 every pick carries the alt-line price at post time and the closing line at first pitch, so the return and the closing line value compute themselves.
2. Anchor to the line. On the model's own picks, the market line missed actual strikeouts by 1.90 and the model by 2.04. The model also ran 0.62 strikeouts low on average. The line is the strongest single input available at prediction time and the model never looked at it. Feeding it in and projecting the residual is the cheapest accuracy gain on the table.
3. Keep the state fresh. The snapshot the Action loads was generated June 28 and never regenerated, so from August on every pitcher's days-of-rest input sat at its cap. The record held anyway, which says something about how little of the edge depends on recent form. It will be regenerated weekly inside the same Action.

Also fixed: zero-strikeout starts grade as losses. Also noted: the 90 percent interval covered 85.4 percent of outcomes, the same under-coverage the walk-forward validation showed before the season, so the conformal recalibration that was on the roadmap stays on it.

---

## Six notes for anyone building similar

- Decide what the bet is before you decide what the model is. Here the bet was floors, and the model only had to be good at floors.
- Put the job in the cloud and let it commit its own state. The ledger that let this season be audited was a side effect of that decision.
- Audit the grader on cases that produce no event. Zero is a value, not an absence.
- Log the price next to the line. A hit rate is a story; a hit rate at a price is a return.
- Check the remote before you declare a cloud job dead. The local checkout is a cache of the past.
- If the market publishes a forecast of the thing you are predicting, it is a feature. Use it.

Personal project. Nothing here is advice on what to bet.
