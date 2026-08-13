# Structure — what is where, and which files you can ignore

Almost every program lives in the repository root as a `.mjs` file. That is unusual
and it is deliberate: each one is a command, and `node <name>.mjs` is the whole
interface. The trade-off is that the root listing is long, so this page groups it.

## The four groups

### 1. Capture — drives a live app and photographs it (needs your app running)

| File | Drives | Writes | Script |
|---|---|---|---|
| `walkthrough.mjs` | one pane, any app | `public/wt/<id>/`, `src/walkthrough.data.js` | `npm run capture` |
| `walkthrough.collab.mjs` | two or more panes at once, for live-collaboration demos | `public/wt-collab/<id>/`, `src/walkthrough.collab.data.js` | `npm run capture:collab` |
| `walkthrough.roomos.mjs` | a four-up version grid (V0→V3 comparison) | `public/wt-roomos/`, `src/walkthrough.roomos.data.js` | `npm run capture:roomos` |
| `walkthrough.visual.mjs` | one pane, "visual labs" variant | `public/wt/`, `src/walkthrough.visual.data.js` | `npm run capture:visual` |
| `walkthrough.solo-founder.mjs` | one pane, a React SPA with hash routes | `public/wt/` | `npm run capture:solo` |

The `*.specs.mjs` files are **data, not programs**: `walkthrough.specs.mjs`,
`walkthrough.collab.specs.mjs`, `walkthrough.noderoom.specs.mjs`,
`walkthrough.visual.specs.mjs`, `walkthrough.solo-founder.specs.mjs`,
`walkthrough.trialscope*.specs.mjs`. Each exports an array of demo scripts for one
target application. Reading one is the fastest way to understand the op vocabulary.

### 2. Render — turns captures into video frames (needs no app)

    src/index.js              entry: registerRoot(RemotionRoot)
    src/Root.jsx              registry: one <Composition> per captured walkthrough
    src/Walkthrough.jsx       single-pane renderer  (ids WT-*)
    src/Walkthrough2up.jsx    two-pane renderer     (ids WTC-*)
    src/roomos-index.js       second entry, for the grid
    src/RoomOsRoot.jsx        grid registry
    src/WalkthroughGrid.jsx   four-up grid renderer (ids WTG-*)

    src/walkthrough.data.js          GENERATED — do not edit by hand
    src/walkthrough.collab.data.js   GENERATED
    src/walkthrough.roomos.data.js   GENERATED
    src/walkthrough.visual.data.js   GENERATED

Those four generated files hold 3,774 of the repository's ~10,100 source lines. They
are committed on purpose: it is what makes `npm run render:example` work on a clone
with no app running. Do not read them for understanding and do not hand-edit them —
the capture script overwrites them whole.

### 3. Encode, narrate, score — audio and final assets

    clip.mjs         `npm run clip`       the whole loop: fit holds -> render -> voice -> mux -> judge
    narrate.mjs                           text -> speech (python piper), and hold-fitting maths
    voice.mjs        `npm run voice`      voice model selection / synthesis
    score.mjs                             music bed construction and ffmpeg mux (imported by clip.mjs)
    score-cli.mjs    `npm run score`      the score front end
    retime.mjs       `npm run retime`     adjust step holds after the fact
    apply-captions.mjs `npm run captions` overwrite captions on a captured walkthrough
    readability.mjs  `npm run readability` caption legibility checks over generated data

A second audio module, `soundtrack.mjs`, was deleted on 2026-08-13: it duplicated
`score.mjs`'s loudness measurement and mux, and nothing imported it. `git show
341fd20:soundtrack.mjs` if you need it.

### 4. Judge and calibrate — is the video any good?

    judge-video.mjs   `npm run judge`               MP4 -> Gemini -> craft + comprehension scores
    comprehension-rubric.mjs                        the comprehension half, as data
    rubric.mjs                                      craft rubric definitions (imported by judge-rubric)
    judge-rubric.mjs  `npm run judge:rubric`        rubric-only judging front end
    iterate.mjs       `npm run iterate`             render -> judge -> revise; writes a brief, exits 1
    analyze-reference.mjs `npm run references:analyze`  reads a reference video's FORMAT
    find-references.mjs   `npm run references:find`     finds and downloads them (yt-dlp)
    calibration/                                    a known-good and known-bad video with scorecards

### Gates

    check.mjs                `npm run check` — parses every JS file (see TESTING.md)
    probe-opening-frame.mjs  `npm run probe:opening` — renders and diffs real frames

## Directories

| Path | What it holds | Read it? |
|---|---|---|
| `public/wt*/` | 689 committed PNG captures | no — binary evidence |
| `assets/` | the rendered GIFs and MP4s the README shows | no |
| `promotion/` | the PROMOTION-gate scorecard, journeys and evidence | **yes** — `promotion/PRODUCT_GOAL.md` is the honest current state |
| `docs/` | this packet | yes |
| `.tours/` | CodeTour walkthroughs of the same paths as `docs/START_HERE.md` | yes, in an editor with the CodeTour extension |
| `examples/collab-demo/` | a zero-dependency two-pane app to capture against | yes if you want to run the collab path |
| `examples/convex-reference/` | a Vite/React/Convex sample app | only as a target |
| `argo-demos/` | a separate npm project using a third-party video tool | no — see CONCERNS.md |
| `references/`, `decks/`, `calibration/`, `fixtures/` | rubric source material, HTML decks, judge calibration media, upload fixtures | as needed |

## Root markdown, and which of it is current

`README.md` is 1,373 lines and is the product pitch plus the full option surface.
`SKILL.md`, `STACK_GUIDELINES.md`, `STORYBOARD.md`, `TTS.md`, `NODE-LOOPS.md`,
`REFERENCES*.md` are method and reference notes. `JOURNEYS.md` is a July 2026 journey
map **of two other products** that were filmed with this tool — it is provenance for
the shipped GIFs, not a description of this repository.
