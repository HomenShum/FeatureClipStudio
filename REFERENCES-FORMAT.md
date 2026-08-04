# Format analysis — two long-form codebase videos, read by Gemini

Produced by `analyze-reference.mjs`, which reads a YouTube URL directly (no
download) and is asked about **form, not content**: what is on screen, who talks
and how, how code is presented, what the sequence of moves is. Windowed rather
than whole-video, because format is stable inside a segment and a 53-minute video
is mostly redundant tokens.

    node analyze-reference.mjs --url <url> --windows 3:00-9:00,18:00-23:00 --label x

| reference | length | chapters | shape |
|---|---|---|---|
| [AI Coding Interview w/ Meta Staff Engineer](https://youtu.be/A1kX8fJx53c) — Hello Interview | **53.4 min** | 6 | Introduction · Choosing a Question · **Code Comprehension (2.5→17.6)** · Implementation · Optimization · Conclusion |
| [My New AI Workflow](https://youtu.be/Aie0nYktsNA) — ThePrimeagenHighlights | 25.1 min | none | uncut stream, webcam + chat overlay |

Full JSON in `out/hello-interview.format.json` and `out/primeagen.format.json`.

## The structure worth stealing

Hello Interview spends **15 minutes on "Code Comprehension" before writing a
line** — 28% of the video on understanding, and it is chapter three of six. That
is the whole answer to "how do you present a repo you had an agent build": the
form devotes its first third to demonstrating comprehension, which is exactly the
thing that decays when an agent writes faster than you can read.

## Transferable rules, each anchored to an observation

1. **Selection-as-pointer.** Highlight the line you are talking about while
   reading it aloud (Hello Interview 07:00). A caption cannot point; a highlight
   can.
2. **Ground it in raw data early.** Show the actual input files before the
   abstractions (03:32).
3. **Trace from the entry point down into imports** rather than touring files
   alphabetically (06:50).
4. **Run the baseline immediately**, during orientation, to establish what
   already works (06:54).
5. **Speak tradeoffs over the lines they concern**, not on a summary slide
   (Primeagen 03:58 — fixed vs dynamic array, said over that code).
6. **Anchor to PR/diff views** so added-vs-removed is visible rather than
   described (03:45).
7. **Show the CLI next to the IDE** when the workflow is agent-driven (07:35).
8. **Dwell 15–30 seconds per file.** Brisk on navigation, slow on decisions.

## What this pipeline cannot currently do, and why

Both references are **uncut, real-time recordings**. Hello Interview: *"No jump
cuts; natural pauses and real-time navigation survive."* Primeagen: *"uncut live
stream pacing with natural hesitations."* Both keep hesitations — "um", "like",
*"pro tip here, big pro tip"* — and both fill AI-generation pauses with
meta-commentary rather than cutting them out.

This studio composes **discrete captured states**: it screenshots a frame per
step and holds it while a TTS line plays. That produces a clean artifact and it
is structurally not the same form. Three gaps, in order of how hard they are:

| gap | status |
|---|---|
| Selection-as-pointer, jump-to-definition, diff views | **addressable** — `find` act added; `goto`/SCM views are more spec work |
| Dwell time and sequence (entry point → imports, baseline run first) | **addressable** — spec authoring, no tooling needed |
| Continuous motion, live typing, surviving pauses, a voice that hesitates | **not addressable here** — needs a screen recorder over a live session, not a state-machine capture |

The honest read: this pipeline can imitate the reference's *moves* and cannot
imitate its *texture*. A 40-minute uncut walkthrough is a recording, and
recording is a different tool than composing. What composing buys is that every
frame is reproducible from a spec — which the references' form cannot offer, and
which is why their videos cannot be regenerated when the code changes.

---

# Third reference: how to TALK ABOUT DESIGN

[26Agent, 16.1 min](https://www.youtube.com/watch?v=oBy94l_48CQ) — analysed with
the same tool plus two questions added for this purpose: `design_narration` (how
are choices verbalised — are alternatives named, tradeoffs quantified, is there a
stated way the choice could be wrong) and `evidence_style` (what backs a claim).

**Its screen is 100% slides.** No IDE, no terminal, no webcam. That is worth
stating plainly because it vindicates the deck format for design talk — the
decisions cut was the right vehicle and simply under-built. Design narration and
code walkthrough are two different videos, and trying to do both in one is why
the first attempt read as neither.

## What it does that the decisions deck did not

1. **Frames every choice as toy-demo assumption vs production reality.** Always-
   working APIs, low traffic, manual testing → network timeouts, hallucinations,
   high concurrency, fallback, human approval gates. The contrast IS the
   structure.
2. **Justifies design by FAILURE MODE, not by feature.** Choices are argued from
   what goes wrong — runaway API cost, context-window explosion — rather than
   from what the design achieves.
3. **Quantifies with real thresholds.** Task success >95%, error rate <0.1%, P99
   latency <500ms (10:52). Numbers, not "fast" and "reliable".
4. **Backs claims with diagrams, not prose**: colour-coded block diagrams,
   state-machine flowcharts with explicit suspend/wake triggers (05:20),
   comparison matrices, gauge meters.
5. **Draws on the slide live** — red marker annotation over a static diagram
   (08:18) to steer attention mid-explanation.
6. **Names a three-stage mechanism** rather than a principle: Intercept →
   Exponential Backoff Retry → Local Rule Downgrade.
7. **Cuts every vocal pause**, subtitles timed to slide transitions.

## What this repo already has for it, unused

The decisions deck asserted eight conclusions in prose. TrialScope's own
measurements are exactly the quantified, failure-mode-shaped evidence this format
runs on, and none of them are on a slide as a number:

| claim currently in prose | the number that belongs on the slide |
|---|---|
| tenancy fairness | Jain **0.139 → 0.150** under jitter, **→ 0.986** under FIFO ordering |
| per-tenant cache | closed a **31,377x** timing side-channel |
| single-flight | **8** concurrent calls collapse to **1** request |
| cache key correctness | **596,902 vs 2,917** when the key was wrong |
| the tests | **17 passed in 3.23s**, on camera |
| the trace | **37** probes, each re-issuable |

The gap between the decisions deck and this reference is not production polish —
it is that the reference puts a measured number and a named failure mode on every
slide, and the deck put a sentence.
