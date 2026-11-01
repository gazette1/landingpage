---
title: "Inside Double Double Bot: buying edge instead of favorites in a Yes-only prop market"
slug: inside-double-double-bot
archetype: thesis
date: 2026-11-01
project: double-double
version: paper trade / 2026
status: published
tags: [nba, player-props, lightgbm, calibration, closing-line-value, walk-forward, paper-trading, evaluation]
summary: Double Double Bot estimates each NBA player's double-double probability from ten seasons of box scores and picks by edge against de-vigged two-way prices, not by likelihood, because FanDuel prices the favorites above their realized rates. It runs on free data and a laptop, on paper stakes, until 100 picks show positive fair closing line value.
---

# Inside Double Double Bot: buying edge instead of favorites in a Yes-only prop market

By Russ. Paper trade, 2026.

---

## What this post is

Double Double Bot estimates the probability that each available NBA player records a double-double tonight (10 or more in two stat categories) and picks only where that probability beats a de-vigged two-way price by more than FanDuel's margin. It has run on paper stakes since 2026-10-29. No live bet has been placed, and none will be until at least 100 picks show positive fair closing line value. The daily output is a five-name post to the StrikeOut Bot Discord at 3 PM Eastern.

The design answers the strikeout bot's season: 383-95 at its posted alternate line with no price logged on any of 492 picks, 54.7 percent at the market line, and a market line that beat the model (mean absolute error 1.90 against 2.04). So this bot measures the price outside the book that sells it, ranks by edge, and lets the closing line decide.

This post is for engineers and architects working where a price already encodes most of what a model knows. The edge selector, the lift test and the gate are the parts that transfer.

---

## The problem

Three properties of this market shape everything downstream.

1. **FanDuel lists a Yes side only.** FanDuel and DraftKings post Yes prices on about nine players a game and no No side, so the margin is invisible where the bet is placed and must be measured against books quoting both sides. On the first slate FanDuel sat 0.13 above the two-way fair probability on Domantas Sabonis and about zero at +600 and longer: the margin lives on the favorites. The de-vig method matters as much. One quote puts Nikola Jokic at 86.5 percent under multiplicative de-vig and 90.2 under power. So every edge is computed against an outside price, twice.

2. **Every model picks the same favorites, and FanDuel prices them above what they deliver.** The model and a plain season rate put the same names on top (Sabonis, Jokic, Giannis Antetokounmpo, Anthony Davis, Karl-Anthony Towns, Joel Embiid), and both hit about 77, 72 and 68 percent with their top one, two and three picks. FanDuel prices those players at -700 to -1100, or 87.5 to 91.7 percent. No high-volume player has delivered that over the last two seasons; the closest was Sabonis at 87.1 percent in 2024-25. "The most likely double-doubles," the product I set out to build, is a negative expected value product however good the model is.

3. **Minutes carry the news; per-minute rates carry the skill.** Rebound rate holds year to year at r 0.95 and assist rate at 0.91 ([Medvedovsky 2020](https://kmedved.com/2020/08/06/nba-stabilization-rates-and-the-padding-approach/)), while role half-lives run one to three games ([DARKO](https://www.darko.app/about)). A player's points, rebounds and assists correlate at 0.12 to 0.27, almost entirely through shared minutes; holding minutes fixed, the partial correlations are 0.08, -0.05 and 0.07. That rules in features that read minutes news, such as the injury report and teammate absences, and rules out treating the stats as independent.

Double Double Bot is shaped by the three constraints in order.

---

## System overview

- **Data:** ESPN box scores through the sportsdataverse hoopR files, 2017-18 onward, and ESPN's public JSON for the slate, injuries and rosters.
- **Prices:** The Odds API `player_double_double` market, one credit per game per call, with FanDuel, DraftKings and the two-way books billed as one region.
- **Dataset:** 239,334 player-games and 155 point-in-time features (rolling and weighted rates, minutes trend, role, teammate absences, opponent context), with leakage checked three ways.
- **Model:** LightGBM, Platt-calibrated on the last 15 percent of training rows by date, walk-forward by season over four test seasons (2022-23 to 2025-26). This is v1, in production; v2 tested a minutes model, a simulation and a stack.
- **Pipeline:** a 3 PM Eastern chain (grade yesterday, run today, post), a 6:40 PM pre-tip snapshot, a ledger and a weekly retrain.

Everything above is free, and the stack choices were cost-driven.

---

## The modeling layer

### Why box scores, not the tracking and matchup layer

I expected motion data to matter, so I built it: stats.nba.com tracking and hustle stats since 2023-24 (rebound chances, potential assists, box outs) and who-guarded-whom matchups, joined through a crosswalk that mapped 99.998 percent of tracking rows, into 113 features. Boosted as a residual on the v1 log-odds, where zero trees reproduces v1, they moved pooled calibrated log loss by -0.00014 (bootstrap interval -0.00033 to +0.00007), about one percent of v1's 0.0118 lead over the season rate, and the matchup group alone made it worse. The layer stays out, and so does a daily dependency on a site that hangs requests for 30 to 45 minutes.

### Why Platt, not isotonic

v1's isotonic calibration lied in its top bin: 0.961 predicted, 0.840 realized on 119 rows, exactly where FanDuel's -700 prices live. Refit on the same holdouts, pooled test log loss was 0.1892 raw, 0.1899 isotonic, 0.1892 Platt and 0.1892 beta, and under Platt the [0.8, 0.9) bin reads 0.836 against 0.832 realized. Isotonic is a step function whose top step was fit on a thin slice of near-locks; Platt has two parameters and cannot invent that step.

### Why rank by edge, not by probability

Inside the posted range (proxy price at least 0.20; 1,961 picks over 654 nights), the three highest-probability picks each night hit 68.6 percent at a mean implied price of 73.3 percent and returned -4.7 percent per unit. The three highest-edge picks hit 42.7 percent at a mean price of 37.6 percent and returned +16 percent, positive in all four test seasons (the v2 stack's figures; the production model returns +14 percent). The price is an assumption, 1.08 times the season rate and softer than a book, so +16 is the ceiling of the model's information advantage over a season rate, not an expected return. ==The information lives between plus money and modest minus prices, nowhere near -700.==

### Why 155 features, not 160

Pre-game game-state proxies (expected margin, total and pace from trailing team box scores) were the first group to clear its interval: -0.00022 (-0.00045 to -0.00001). I approved folding them in. The production build matched the prototype at correlations of 0.998 to 0.9999, but the before-swap check, which fits both sets on the same rows, holdout and seed, found no holdout gain, and the four-season retest read -0.00006 with the interval crossing zero. Three near-identical runs gave -0.00022, -0.00006 and -0.00017 against intervals about 0.0002 wide, an effect the size of its own noise. Production stays on 155 until a real market spread can be tested.

---

## The edge selector

The signature component builds the fair price FanDuel does not show, sets a bar from FanDuel's margin that night, and picks only where the edge clears it under both de-vig methods. The fair price averages each two-way book's quote, de-vigged two ways:

```python
# Simplified from tools/paper_common.py; inputs are implied probabilities
def devig(q_yes, q_no):
    mult = q_yes / (q_yes + q_no)          # multiplicative: rescale to sum to one
    lo, hi = 0.05, 60.0                    # power: solve q_yes**k + q_no**k == 1
    for _ in range(200):
        k = (lo + hi) / 2
        lo, hi = (k, hi) if q_yes**k + q_no**k > 1 else (lo, k)
    return mult, q_yes**k
```

Power de-vig takes more of the margin from the longshot side, so the methods disagree most on lopsided quotes; requiring both keeps a pick from resting on one assumption. The bar is FanDuel's margin that night, measured where it lives (fair at least 0.20) and floored at 0.03:

```python
# Simplified from select_picks() in tools/daily_run.py; edges are probability points
def select(board, max_picks=3):
    priced = board[board.fair_mult >= 0.20]
    bar = max((priced.fd_implied - priced.fair_mult).median(), 0.03)
    b = board.assign(bar=bar + 0.03 * (board.team_game_num <= 5),   # early season
                     edge_mult=board.p_cal - board.fair_mult,
                     edge_power=board.p_cal - board.fair_power,
                     book_edge=board.p_cal - board.book_implied)    # FanDuel if quoted
    b.loc[(b.p_cal >= 0.80) & (b.spread.abs() >= 10), "bar"] *= 2   # near-locks, big spreads
    ok = ((b.p_cal >= 0.35) & (b.edge_mult >= b.bar) & (b.edge_power >= b.bar)
          & (b.book_edge >= 0.02))
    return b[ok].sort_values("edge_mult", ascending=False).head(max_picks)
```

The 0.02 price edge is a model-error buffer; the model overshoots by about 0.04 when it sits more than 10 points above the season rate. The 0.35 floor is a design choice and an open question, since the only positive edges on the first night belonged to players the model put at 0.30 and 0.31.

On 2026-10-30 (ten games, bar at the 0.03 floor) the selector took Alperen Sengun at +108 (model 0.53, fair 0.43 and 0.42) and Yaxel Lendeborg at +235 (model 0.35, fair 0.27 and 0.24), and passed on Jokic at -900, whom the model put at 0.79 and the two-way market at 0.82.

Fair closing line value is the fair closing probability minus the implied probability of the price taken. That price carries FanDuel's margin, so a positive mean says the picks were worth more at the close than they cost, margin included. The gate is a positive mean under both methods over at least 100 picks at logged prices; proving a 2-point edge at -300 from results alone would take about 3,600 bets.

---

## Held-out performance

Pooled over 103,009 regular-season test rows, calibrated log loss is 0.2009 for the season-rate proxy, 0.1981 for a logistic regression, and 0.1899 for the model under isotonic or 0.1892 under Platt. The model wins all four seasons, and its AUC is 0.895 against 0.869. Its nightly top-N hit rates (0.774, 0.717, 0.677 against the proxy's 0.778, 0.726, 0.685) sit inside one season's noise. At the top of the board the model knows what the season rate knows.

It knows more in the mid-tier (proxy 0.25 to 0.65, n 8,371): log loss 0.6437 against 0.6527, AUC 0.645 against 0.624. Where the model sits 5 or more points above the proxy price, realized rates beat the price in every band up to 0.80 (0.40 to 0.42 against 0.34, 0.59 to 0.61 against 0.55, 0.73 to 0.76 against 0.72). From 0.80 to 0.97 the edge does not survive: 0.78 to 0.85 against 0.88.

The honest paragraph: every return here is measured against a proxy price, because historical double-double prices are paid data, and a proxy built from the season rate the model beats makes positive returns expected by construction. ==Calibration makes an edge measurable. Only the closing line says whether it exists.== The live price log is the only thing that settles it.

---

## The eval rig

**Offline,** every change runs the same walk-forward. **Every new idea** gets the controlled lift test: identical rows, hyperparameters, seed, holdout and calibration, a block bootstrap by game date on the log-loss difference, and adoption only if the interval clears zero and the gain reproduces in production form. Each idea below had a plausible story, several of them mine; none was adopted.

| Idea | Change in pooled calibrated log loss (bootstrap interval) |
|---|---|
| Tracking and matchup layer | -0.00014 (-0.00033 to +0.00007) |
| Recency weighting, three-season half-life | -0.00006 (-0.00031 to +0.00018) |
| Coaching staffs, 35 features | +0.00005 (-0.00020 to +0.00031) |
| Open-look shot features | +0.00007 and +0.00006 in two test designs |
| Foul trouble and minutes volatility | -0.00015, interval crossing zero |
| Game-state proxies | -0.00022, then -0.00006 and -0.00017 in production form |
| v2 minutes model and simulation, stacked | -0.00014 under the same calibration |

Negative is better, and the largest gain listed is about 2 percent of the model's lead over the season rate. **Online,** the ledger is the source of truth: every pick at its logged open and close, with fair closing line value.

---

## Cost economics

- **Data:** free. ESPN needs no key, and ten seasons of hoopR files are about 9 MB.
- **Prices:** The Odds API free tier, 500 credits a month. A night costs a credit per game plus one per picked game, roughly 10 to 15 in full season, so the free tier runs out in the second half of a month.
- **Time:** stats.nba.com is free and costs time instead: the open-look pull took 3.5 hours for 1,004 requests.
- **Compute:** a laptop. Four walk-forward folds train in about a minute, and a daily run takes 8 to 19 seconds.
- **With more budget:** one month of the $59 plan for the price history from May 2023 ([The Odds API](https://the-odds-api.com/liveapi/guides/v4/)), before the $30 plan that lifts the credit cap, because only the history turns the proxy figures into a backtest at FanDuel prices. That buys the data that can prove this model wrong, not a better model.

---

## Monitoring

1. **Pipeline health.** Every run logs one line (games, players scored, picks, margin, bar, credits, run time) and writes the board: every scored or priced player with the rule that blocked him.
2. **Pre-tip and grading.** At 6:40 PM the picked games are re-priced and a pick ruled out becomes void. The next day's chain grades from the box scores under FanDuel's rule (the bet stands once the player takes the court) and pays each pick at the open and the close.
3. **The five-name post.** I asked for five names on the phone, the way the strikeout bot sends them. The 3 PM post lists the five most likely double-doubles with the model's percent, the FanDuel price, a green mark where the model sits above FanDuel's implied probability, and the edge-rule value play underneath. That ranking is the product this post argues against, so it is graded at the FanDuel price in its own ledger, with expected hits and a running z-score. The first two graded nights went 4-1 (a 2026-10-28 backfill without prices) and 0-5 (2026-10-29, minus 5.0 units against 2.33 expected hits): 4-6 against 5.7 expected, not a sample. Only the edge-rule picks underneath count toward the 100-pick gate, and that count stands at zero as of November 1: the 2026-10-28 night was a backfill without prices, 2026-10-29 had no play, and the two 2026-10-30 picks have no logged close yet.
4. **The schedule.** A GitHub Action is written to fire at 19:00 and 20:00 UTC for the 3 PM chain and at 22:40 and 23:40 UTC for the pre-tip snapshot. A guard maps the New York hour to the step, so the post holds at 3 PM Eastern across the clock change on 2026-11-01, and each run commits its outputs, so git is the ledger. The Action waits on the GitHub repository, and on 2026-10-30 the laptop slept through 3 PM and the post went out at 5:44 PM from a fallback run.

In credit, a loan is not performing because it closed; it performs when it pays. A pick is good if it beat the close, not because it hit. I run Double Double Bot the same way.

---

## What I would change starting over

1. **Create the repository before writing the schedule.** The strikeout season's reliability came from moving the job into a cloud action. This one was written on the first evening and still waits on a repository, and a sleeping laptop has already delayed one 3 PM post.
2. **Buy the price history before the feature tests.** Every test above was judged by log loss and by returns at a proxy price, because no real prices existed. A feature that leaves log loss flat could still move the mid-tier edge, which $59 of real prices would have tested.
3. **Design the phone output with the selection rule.** The edge-rule summary was confusing on a phone, and its replacement ranks by probability, the ordering the selector exists to avoid. The ledger exposes that tension; a post designed around the edge would not need it.

---

## Closing

Double Double Bot is a plain classifier inside rules that keep it from being sold at the wrong price. Most of what I built to make the model smarter was measured and left out, and the one result I adopted came back out when it failed to reproduce.

If I were hiring someone to build this shape in another market, I would ask: can you see the margin you pay; does your ranking pick the same names as the dumbest baseline, and if so, what are you selling; what would take a feature back out; and what result, at what sample size, lets real money follow. Those are the questions this post is meant to answer. The first season produces information, not income.

For the system this one learned from, see [Inside StrikeOut Bot](inside-strikeout-bot.html); for the season that taught the price lesson, see [the season field note](field-strikeout-season-2026.html).

Personal project. Nothing here is advice on what to bet.

---

Russ

Washington, DC, 2026
