---
title: "Inside StrikeOut Bot: quantile regression and beat-the-baseline discipline for MLB strikeout prediction"
slug: inside-strikeout-bot
archetype: thesis
date: 2026-06-24
project: strikeout
version: v1 / 2026
status: published
tags: [lightgbm, quantile-regression, stacking, calibration, walk-forward-cv, baseball, statcast, eval]
summary: StrikeOut Bot predicts how many batters a starting pitcher will strike out in his next start. Three LightGBM quantile regressors produce a median and a 90 percent interval, a Ridge meta-learner stacks them against a dumb baseline, and a blind test on unseen post-All-Star-Break data is the only gate that lets a model ship. This post walks the 40-feature pipeline, why quantile regression beats point prediction here, the baseline discipline that keeps the project honest, and the leakage prevention that makes the backtest trustworthy.
---

# Inside StrikeOut Bot: quantile regression and beat-the-baseline discipline for MLB strikeout prediction

By Russ. Built 2026.

---

## What this post is

StrikeOut Bot predicts how many batters a starting pitcher will strike out in his next start. The output is not a single number. It is a median prediction plus a 90 percent confidence interval, produced per pitcher per game, from a 40-feature matrix built out of Statcast pitch data, opponent profiles, ballpark factors, and battery effects.

The system is three LightGBM quantile regression models wrapped in a Ridge meta-learner, validated with walk-forward cross-validation, and gated by a blind test on data the model never touched during training. It is a personal project, so unlike some of the other systems on this site there is no competitive edge to protect. Everything here is exactly how it is built.

This post is for engineers and architects evaluating whether a similar shape applies to a different small-signal prediction problem. The quantile-interval design, the beat-the-dumb-baseline discipline, the walk-forward validation, and the leakage prevention are the parts most likely to transfer. Baseball is the vehicle.

---

## The problem

A strikeout prediction sounds like a regression problem and mostly is. A starter faces a lineup, throws his repertoire, and records somewhere between zero and roughly fifteen strikeouts. The naive approach is to predict the mean and move on.

Three properties of this domain make the naive approach wrong.

1. **The useful output is an interval, not a point.** A prediction of "7 strikeouts" is far less useful than "median 7, with a 90 percent interval of 4 to 10." The interval is what tells you whether a game is a coin flip or a strong lean. A point estimate throws away the single most decision-relevant piece of information: how confident the model actually is on this specific pitcher against this specific lineup. ==Calibration of the interval is the product. The point estimate is the qualifier.==

2. **A dumb baseline is already good.** Strikeouts per nine innings times innings per start gets you most of the way there. Any model that does not clearly beat that baseline is not worth the maintenance cost. This is the central honesty constraint: every gain has to be measured against the dumbest reasonable predictor, not against zero.

3. **Leakage is trivially easy and fatally common.** Baseball data is a time series. Season-to-date stats, rolling averages, and opponent profiles all update after every game. It is extremely easy to accidentally build a feature that includes information from the game you are trying to predict. That produces a backtest that looks brilliant and a live model that is worthless. The architecture has to make leakage structurally hard, not rely on remembering to avoid it.

StrikeOut Bot is shaped by these three constraints in order.

---

## System overview

The stack is deliberately boring.

- **Python** with **LightGBM** for the models, **Ridge** (scikit-learn) for the stacker, **Optuna** for hyperparameter tuning, **SHAP** for feature attribution.
- **Parquet** feature matrices and staging tables on disk. No cloud database; the whole thing runs locally and on a daily cron.
- **Statcast and FanGraphs** as the upstream data sources, pulled into staging tables (`pitches.parquet`, `games.parquet`) plus lineup, weather, umpire, and schedule data.
- A **daily pipeline** that resolves probable starters, builds the feature matrix, runs inference, and logs predictions for later scoring against actual outcomes.

LightGBM was the obvious modeling choice: it handles missing values natively (baseball data has plenty), trains fast enough to retune whenever features change, and produces inspectable trees. The interesting decisions are all in the wrapper around it.

---

## The feature pipeline

The feature layer turns staging tables into a fixed 40-column matrix, one row per probable starter. Features are organized into five groups, each in its own module, orchestrated by a single feature pipeline.

| Group | Features | What it captures |
|---|---|---|
| Pitcher Ability | 1 to 14 | Swinging-strike rate, called+swinging strike rate, whiff rates, vertical approach angle, induced vertical and horizontal break, spin, tunneling, putaway rate |
| Recent Form | 15 to 18 | Recency-weighted rolling performance, exponentially weighted means |
| Opponent Profile | 19 to 31 | Lineup chase rate, in-zone contact rate, strikeout tendency, chase-versus-velocity-band behavior |
| Contextual | 32 to 36 | Ballpark strikeout factor, umpire tendencies, weather, schedule, days rest |
| Battery Effects | 37 to 40 | Catcher framing and the specific pitcher-catcher pairing |

Two things about this layer matter architecturally.

**Ordering is a dependency, not a convenience.** Pitcher Ability runs first, because it extracts the pitcher's primary velocity. That velocity then feeds an Opponent Profile feature that measures how the opposing lineup chases against that specific velocity band. The orchestrator enforces the order. The pipeline wraps a failing feature group in try/except and NaN-fills it rather than crashing the whole matrix. League-average fallbacks impute the missing values downstream.

**The metadata and the target are never in the feature slice.** The matrix carries the 40 features plus four metadata columns (pitcher id, game date, game id, opponent) plus, at training time, the target (actual strikeouts). The model inputs structurally exclude the metadata and the target. Dedicated leakage-prevention tests verify that exclusion. This is the first line of defense against the leakage failure mode.

---

## The modeling layer

The model is where the interval-first design lives.

### Why quantile regression, not point prediction

Instead of training one model to predict the mean strikeout count, StrikeOut Bot trains three LightGBM models with a quantile objective: one at the 5th percentile, one at the median, one at the 95th percentile. The median is the headline prediction. The 5th and 95th together form a 90 percent confidence interval.

This is the architectural decision that makes the output useful. A point model tells you "7." The quantile stack tells you "median 7, interval 4 to 10." On a different pitcher where the model is genuinely more confident, it can tell you "median 7, interval 6 to 8." The width of the interval is signal. Quantile regression is how you get it directly out of the model rather than bolting on a variance estimate after the fact.

The honesty check on this is interval calibration: across many predictions, roughly 90 percent of actual outcomes should fall inside the 90 percent interval. If only 70 percent do, the intervals are lying and the model is overconfident. Calibration at 90 is a first-class metric in every evaluation report.

### The Ridge stacker

The three quantile models produce a median. That median is not the final prediction. It is one input to a Ridge meta-learner that stacks three signals: the model's median prediction, the dumb baseline (strikeouts per nine times innings per start), and days of rest.

The stacker exists for a specific reason. The LightGBM median is strong but occasionally drifts on edge cases. The baseline is weak but almost never catastrophically wrong. Days of rest carries a small real effect the tree model under-weights. A Ridge regression with light regularization blends the three into a prediction that is more robust than any of them alone. The stacker clamps the final output to a sane range and forces it to respect its own interval bounds. So the stacked prediction can never fall outside the lower and upper quantiles.

==The pattern is the same one behind TrialEdge's CalibratedDebateScorer: the base model produces a signal, and a thin, inspectable wrapper turns that signal into something you can actually make a decision on.==

### Hyperparameters

Tuned with Optuna's tree-structured Parzen estimator, then frozen: 63 leaves, learning rate 0.05, up to 1000 estimators with early stopping, feature and bagging fractions at 0.8, light L1 and L2 regularization, fixed seed, deterministic mode on. Deterministic training matters more than it sounds. It means a retrain on the same data produces the same model. So when a metric moves, I know it moved because the data changed, not because the RNG did.

---

## Baseline discipline

Three baselines exist, and every model is scored head-to-head against all three.

- **B1**: strikeouts per nine divided by nine, times innings per start. The dumbest reasonable predictor, and also the baseline fed into the Ridge stacker.
- **B2**: a Vegas proxy that scales B1 by team average innings and the ballpark strikeout factor. This loosely mimics how a sportsbook would set a strikeout line, so beating it is the closest thing to beating the market.
- **B3**: the pitcher's last-five-start average.

The rule is simple and non-negotiable. ==A complex model that barely beats strikeouts-per-nine-times-innings is not worth maintaining. Baselines keep the project honest: every point of improvement is measured against the dumbest predictor that works, not against zero.== This is the discipline that most personal ML projects skip, and skipping it is why most personal ML projects quietly do not work.

---

## The eval rig

Two layers, and a model has to pass both to ship.

### Walk-forward cross-validation

Baseball is a time series, so the validation is a time series. Train on the past, test on the future, roll the window forward. No random shuffling, because a random split would let the model train on August to predict July, which is leakage wearing a lab coat. Walk-forward validation is the only honest way to estimate how the model will do on games that have not happened yet.

Within the training pipeline itself, the split is strict: train on everything before the last four weeks, validate on the last four weeks, early-stop on the validation set.

### The blind test

The final gate is a blind test on data the model has never seen in any form: 2024 post-All-Star-Break starts. The test does three things that make it trustworthy.

1. It filters to a clean temporal hold-out (games after the All-Star Break split point).
2. It **stratified-samples 5,000 starts across strikeout tiers** (low, medium, high), so the evaluation is not dominated by average pitchers. The model has to perform on the low-strikeout control artists and the high-strikeout aces, not just the fat middle of the distribution.
3. It scores the model head-to-head against all three baselines on the same sample, reporting MAE, RMSE, over-under accuracy at common strikeout lines, and interval calibration.

If the model cannot beat the baselines on truly unseen data with honest intervals, it does not ship. That is the whole rule.

### The metrics that matter

Mean absolute error is the headline: the average strikeout miss. But the report also breaks MAE down by strikeout tier. A model can have a good overall MAE while failing badly on aces or on low-strikeout arms. That segmented failure is exactly the kind of thing an aggregate number hides. Over-under accuracy against lines of 5.5, 6.5, 7.5, and 8.5 is the practical, decision-relevant metric. Calibration at 90 is the honesty metric. All four flow into a model-degradation alert that fires when rolling MAE drifts above the baseline in production.

---

## Leakage prevention

Because leakage is the domain's defining failure mode, it gets its own defense in depth.

- The metadata columns and the target are structurally excluded from the feature slice, verified by tests.
- Rolling and season-to-date features are computed as-of the prediction date, never including the game being predicted.
- Validation is strictly temporal, never random.
- The blind test uses a hold-out period that no training run has ever seen.

None of these is clever. All of them are the kind of discipline that separates a backtest you can trust from a backtest that flatters you. The clever part is making them structural, so a future change cannot reintroduce leakage without a test going red.

---

## What I would change starting over

Three things.

1. **Model the pitch-level distribution, not just the start-level count.** Predicting total strikeouts is coarse. A richer version would predict the outcome distribution pitch by pitch and aggregate up. That would produce naturally calibrated intervals and let the model reason about pitch counts and times-through-the-order effects explicitly.

2. **Add an explicit opponent-lineup model.** Opponent profile is currently a set of team-level aggregate features. The real signal is the specific nine hitters likely to be in the lineup and how each matches up against this pitcher's repertoire. That is a bigger data-engineering lift but it is where the remaining accuracy lives.

3. **Externalize the baseline comparison into continuous production monitoring.** The baseline comparison currently runs in the blind test and in periodic scoring. It should run every single day against the previous day's realized outcomes, so baseline-relative performance is a live dashboard, not a periodic check.

---

## Closing

StrikeOut Bot is a small, honest ML system that solves a narrow prediction problem with calibrated intervals, a dumb-baseline honesty constraint, and a leakage-resistant eval rig. The architecture is not novel. The discipline is what makes the numbers trustworthy: quantile regression so the interval is real, a stacker so the prediction is robust, walk-forward validation and a stratified blind test so the backtest is not a lie.

The through-line to the rest of my work is the same one that runs through TrialEdge and the MES trading model: at small signal and high noise, calibration beats raw accuracy. The model that honestly says "I do not know" on the hard cases is worth more than the one that confidently guesses. If you are building something similar in a different small-signal domain, the questions worth asking are: is your useful output a point or an interval; what is the dumbest baseline you have to beat; is your validation actually temporal; and can a future code change reintroduce leakage without a test catching it.

For the production-ML calibration discipline that shaped this project, see [Inside TrialEdge](/blog/inside-trialedge.html). For the same anti-lookahead and beat-the-baseline discipline applied to markets, see [Inside MES Open](/blog/inside-mes-open.html).

---

Russ
