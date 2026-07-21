---
title: "Inside DeckTrainer: a Simply-Piano-style coaching tool for the Hercules DJControl"
slug: inside-decktrainer
archetype: thesis
date: 2026-05-19
project: decktrainer
version: Phase 1 / 2026
status: published
tags: [hardware, midi, python, drill-engine, coaching-tool, hercules-djcontrol, scope-discipline]
summary: DeckTrainer is a learn-to-DJ coaching tool for the Hercules DJControl Starlight and Mix. It is not a live-performance DJ app; the scope discipline is the architectural point. The system reads MIDI from the controller, runs drills with deterministic scoring on timing, EQ work, and recovery, and logs sessions to a local SQLite. Six shippable phases; Phase 1 (MIDI sniffer and controller mapping) is live. This post walks the scoping discipline, the hardware constraints that shape the drill engine, and why "Simply-Piano-style" is the right framing for a solo practice tool.
---

# Inside DeckTrainer: a Simply-Piano-style coaching tool for the Hercules DJControl

By Russ. Phase 1 of 6, 2026. Targeting the Hercules DJControl Starlight and Mix.

---

## What this post is

DeckTrainer is a Python project that turns a Hercules DJControl Starlight or Mix into a scored drill machine. Plug in the controller, pick a drill, get scored on timing, EQ work, and recovery. The output is a session log over time so a learner can see their hard-cut timing improve, their blend smoothness improve, their bass swap recovery improve. Six phases planned; Phase 1 (MIDI sniffing plus controller mapping verification) is shipped and verified against the controller hardware.

The system is **not** a live-performance DJ app. That distinction is the most important architectural decision in the project. Stating it explicitly is the discipline. A live-performance DJ app needs a full audio engine, beat-grid sync, hot cues, loop control, sampler banks, FX chains, and a GUI you can operate while looking at a crowd. A coaching tool needs MIDI input, a small audio engine sufficient for two-deck playback with crossfading, a drill engine that can score the controller events against a beat grid, and a session log. The coaching tool is a strict subset of the performance app. Treating it as a subset rather than as a "smaller version of the same thing" is what keeps the scope tractable.

This post is for engineers and architects evaluating how to scope a solo project. The quality bar is clear: the user should improve at the skill being trained. What success looks like stays ambiguous: which drills are the right drills, which scoring functions are the right functions, what makes a session feel like progress. The scoping discipline, the hardware-constraint surfacing, the phased build plan, and the drill-spec-as-data pattern are the parts most likely to transfer. The DJ training framing is the vehicle.

---

## The problem

Beginner-to-intermediate DJs hit a learning ceiling because solo practice has no scoring. A new piano player can use Simply Piano: play the piece, the app scores you, you see your timing improve over weeks. A new DJ practicing alone in a bedroom has no equivalent. They press buttons, they think the mix sounded okay, they have no objective signal about whether their hard cuts were on the beat or 50 milliseconds late.

The professional path is "play gigs, get feedback from the crowd, iterate." That path requires gigs you cannot get without already being good. The amateur path is "watch YouTube tutorials, copy the moves, hope it transfers." That path has no scoring loop.

Three properties of this domain shape every architectural decision in DeckTrainer:

1. **The scoring loop is the product.** A drill that does not score the user is not a drill; it is a demo. The architecture has to put deterministic scoring at the center of every interaction, not as a feature added later. I define every drill in the system as a tuple of (target event, observed event, scoring function). The engine is the pipeline that runs that tuple. ==Without scoring, there is no coaching. Without coaching, the project is a controller hello-world.==

2. **The hardware shapes the scope.** The Hercules DJControl Starlight and Mix share firmware. They both have *one* EQ knob per deck (Bass), plus a filter knob. There is no mid or high EQ. This is the single most consequential constraint in the system. Every "bass swap" or "EQ work" drill must map to the one EQ band the hardware provides. A drill designed against a 3-band Pioneer DJM that gets imported wholesale produces UI that does not map to the controller. The user gets confused. The scope discipline is: design drills against the controller, not against a hypothetical perfect controller.

3. **Latency is the enemy.** A drill that scores "did you cut the deck on the 1" needs sub-50-millisecond MIDI-to-scoring latency, or the score is measuring the wrong thing. Bluetooth audio outputs add 100 to 300 ms of latency on most consumer setups and will silently destroy the scoring layer. The system explicitly requires wired audio output for the same reason a piano-coaching app requires the device's built-in audio. Introducing latency in the feedback path invalidates the score.

DeckTrainer is shaped by these three constraints in order.

---

## System overview

The stack:

- **Python 3.11+** with `uv` for dependency management. Windows-first (Hercules controller drivers are Windows-native and the developer's primary environment); macOS support planned for Phase 4+.
- **rtmidi** for MIDI input from the Hercules controller via USB. Bluetooth is explicitly not supported because of latency.
- **sounddevice** for audio output (Phase 2+).
- **librosa** for beat-grid analysis and pre-flight audio analysis (Phase 3+).
- **typer** for the CLI entry point. The project ships as `python -m decktrainer.cli <command>` and grows GUI later, not earlier.
- **SQLite** for session logs (Phase 4+). Local-only, no cloud sync at v1.
- **A `mapping.yaml` file** that defines every MIDI status/data1 byte for every control on the controller, sourced from the Mixxx mainline mapping definitions. This file is the single source of truth for "what is this MIDI event."

Repo layout:

```
src/decktrainer/
  cli.py              # typer entry point
  midi/               # rtmidi wrapper, mapping loader
  audio/              # sounddevice engine, deck state (Phase 2)
  library/            # librosa analysis + cache (Phase 3)
  drills/             # drill engine + types (Phase 4-5)
  scoring/            # pure scoring functions (Phase 4-5)
  session/            # SQLite log + reports (Phase 4-5)
drill_specs/          # JSON drill definitions (Phase 4-5)
mapping.yaml          # Hercules MIDI mapping
tests/
```

The folder layout is the architecture. Each subfolder is a self-contained module with a clean interface to the next one downstream: MIDI events flow into `drills`, drills emit observed-event tuples to `scoring`, scoring produces a numeric score that `session` persists.

---

## The mapping file is the contract with the hardware

`mapping.yaml` is the single point of contact between the system and the hardware. It defines every control on the Hercules controller as a `{status, data1, kind, deck}` tuple:

```yaml
deck_a_play:       {status: 0x91, data1: 0x07, kind: button, deck: a}
deck_a_cue:        {status: 0x91, data1: 0x06, kind: button, deck: a}
deck_a_volume:     {status: 0xB1, data1: 0x00, kind: fader,  deck: a}
deck_a_bass:       {status: 0xB1, data1: 0x02, kind: knob,   deck: a}
deck_a_filter:     {status: 0xB1, data1: 0x01, kind: knob,   deck: a}
```

Three things to call out about this layer:

**The mapping is sourced from the Mixxx community.** The Mixxx project has maintained MIDI mappings for hundreds of controllers for over a decade. The Hercules Starlight and Mix mappings are battle-tested. DeckTrainer's mapping references Mixxx as the source of truth and ships a verified-against-hardware version of those bytes. ==Rebuilding a MIDI mapping from scratch is a time sink that produces no end-user value; using a known-good community mapping is the correct architectural choice.==

**The mapping carries semantic labels.** A status byte of `0xB1` and a data1 of `0x02` is meaningless. The label `deck_a_bass` is meaningful. The drill engine reads the semantic labels and never touches raw MIDI bytes. The mapping layer is the translator.

**The mapping documents constraints.** A header comment in `mapping.yaml` explicitly states: "both controllers have only ONE EQ knob per deck ('Bass'/LOW) plus a filter knob. There is no MID or HIGH EQ. The Bass Swap drill (Phase 5) works as designed; any drill assuming a 3-band EQ needs to be re-specced." This is the hardware constraint surfaced at the file that owns the hardware contract. Any future drill designer reads this and knows the constraint without having to dig into a wiki.

---

## The phased build plan is the project

DeckTrainer ships in 6 phases, each independently demoable:

1. **Hello Hercules** (current). MIDI sniffer, controller mapping verified. The CLI commands `midi-sniff` (print every MIDI event) and `midi-ports` (list connected MIDI inputs) ship in this phase. The deliverable is "plug in the controller and see events flow."
2. **Two-deck playback with crossfader.** Add the audio engine. Two decks load tracks, play, can be crossfaded. No drills yet; just verify the audio path works at sub-50ms latency.
3. **Beat-grid analysis plus visual metronome.** Add the librosa beat-grid analysis. Tracks get pre-analyzed and cached. A visual metronome ticks on the screen synced to the playing deck.
4. **First drill: Hard Cut.** The first scored drill. Target: cut deck B on the 1, hard cut on the next downbeat. Scoring: cue offset in milliseconds, cut offset in milliseconds, recovery smoothness measured by monitor peak drop.
5. **Drills 2 and 3: Long Blend, Bass Swap.** Two more drills extending the engine. Bass Swap is the one that bumps against the 1-EQ-band constraint and shipped as designed for the controller's actual hardware.
6. **(Stretch) EQ DSP, filter DSP, GUI.** Beyond MVP. Adds software-side EQ and filter effects so drills can score against a richer audio output, plus a GUI to replace the CLI.

Phases are designed so each one ships an independently usable product. ==Phase 1 alone is useful: it gives any DJ a verified MIDI-event display for their Hercules controller, which is non-trivial to build on Windows. Phase 4 is the first phase where DeckTrainer becomes the product it intends to be: a scored drill machine.==

The phasing matters because solo projects fail when the "all features for v1" temptation produces a six-month build with no shippable interim. Each phase has its own commit history, its own test coverage, its own demoable artifact. If the project pauses after Phase 4, the user gets a one-drill scored coaching tool. That is still better than what they had.

---

## The drill engine, as it will exist at Phase 4

The drill engine is the heart of the project. The design is not yet shipped, but it is specified:

A drill is a JSON file in `drill_specs/`. It defines the target events (what the user should do), the timing window, the scoring weights, and the source track. Example shape:

```python
@drill(id="hard_cut_01", target_bpm=128)
def hard_cut(deck_a, deck_b, ctrl):
    """Cue deck B on the 1, hard cut on the next downbeat."""
    cue = ctrl.wait_for(BUTTON.CUE_B,      on=BEAT_01)
    cut = ctrl.wait_for(BUTTON.XFADE_END,  on=BEAT_02)
    return score(
        cue_offset_ms=cue.offset,
        cut_offset_ms=cut.offset,
        recovery_db=monitor.peak_drop_db(),
    )
```

Three architectural commitments are baked into this shape:

**Drills are data, not code (mostly).** A drill spec is a JSON file plus a small Python function. The user can add new drills without touching the engine code, as long as they conform to the spec schema.

**Scoring functions are pure.** The `score()` function takes the observed metrics and returns a number. It does not write to disk, it does not mutate state, it does not query the controller. This makes scoring testable in isolation and reproducible across sessions.

**The controller is an event source.** The drill function pulls events from the controller (`ctrl.wait_for(...)`) rather than the controller pushing events into the drill. This inversion lets the drill engine implement timeout, retry, and skip behaviors without each drill needing to handle them.

---

## What I am not building

The CLAUDE.md file in the project repo lists what is explicitly out of scope. It is worth reproducing because the negative list is half the value of the scope discipline:

- Real-time pitch-bend matching against a target track (could be Phase 7).
- Cloud session sync, leaderboards, social features.
- Phone or tablet apps.
- A track-recommendation engine.
- Beat-matched autoplay or auto-mix.
- A built-in DJ school curriculum.
- Live-performance features (real-time recording, broadcasting, OBS integration).

==The single most important sentence in the scope: "Not a live-performance DJ app, a coaching tool." Every feature request gets tested against that sentence. Anything that fails the test is logged for a possible v2 and not built into v1.==

---

## What I would change starting over

Three things, in priority order, even at Phase 1.

1. **Start with the mapping file before any audio code.** I did this, and it is the highest-leverage early decision in the project. Every minute spent verifying the mapping against the controller hardware pays back tenfold downstream. Every drill, every scoring function, every test fixture is grounded in known-good MIDI bytes. If I were doing it again I would spend even more time on the mapping in Phase 1.

2. **Treat drill specs as a first-class artifact.** The drill spec format is currently a sketch. It should be a versioned schema with explicit validation. Future contributors (mostly future me) will write drills against it. The schema is the contract that makes those drills durable.

3. **Resist the GUI temptation longer than feels natural.** The Stretch phase mentions GUI. The CLI is the right interface for the first five phases. A GUI is a vector for scope creep and a sink for engineering time that does not produce drill quality.

---

## Closing

DeckTrainer is a phased, scoped, hardware-constrained Python project that targets a Simply-Piano-shaped coaching gap in DJ training. The architectural choices that make it tractable are: a strict scope ("coaching tool, not performance app") restated at every architectural decision, a mapping.yaml file that owns the hardware contract and surfaces the 1-EQ-band constraint to every downstream consumer, a 6-phase plan where each phase ships a usable artifact, and a drill engine designed around deterministic scoring functions and event-source controllers.

If you are building something similar in a different domain (any hardware-dependent solo-practice tool with a deterministic scoring requirement, from piano coaching to climbing-route reading to physical-therapy compliance), the questions worth asking are: how do you scope a solo project so each phase ships a usable artifact; how do you surface hardware constraints into the file that owns the hardware contract so future contributors cannot miss them; how do you separate the drill-specification layer from the scoring engine so new drills can be added by users without engine changes; and what is the test discipline that verifies your scoring functions are pure and reproducible across sessions.

For the production-ML calibration discipline that shaped the eval philosophy across all my systems, see [Inside TrialEdge](/blog/inside-trialedge.html). For the customer-facing signal-composition counterpart, see [Inside Atlas](/blog/inside-atlas.html).

---

Russ
