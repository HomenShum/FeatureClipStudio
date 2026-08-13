# Architecture

## The shape, in one sentence

Three programs that never meet, connected by files on disk: a robot browser
photographs your app, a video renderer draws those photographs with a pointer and a
caption over them, and a media encoder turns the result into an MP4 or GIF.

```
  your running app                                            you
        │                                                      ▲
        │ Playwright drives + screenshots                      │ MP4 / GIF
        ▼                                                      │
  walkthrough.mjs ──► public/wt/<id>/NN.png ──┐                 │
        │                                     │                │
        └──────────► src/walkthrough.data.js ─┴──► src/Root.jsx ──► src/Walkthrough.jsx
                     (generated; THE SEAM)         (registry)       (one frame at a time)
                                                                       │
                                                        remotion render │
                                                                       ▼
                                                                  out/*.mp4
                                                                       │
                                     clip.mjs ── ffmpeg ── narrate/score ─┘
                                          │
                                          └──► judge-video.mjs ──► Gemini ──► *.judge.md
```

## The one boundary that matters

**`src/walkthrough.data.js` is the entire contract between capture and render.**
Capture writes it; render reads it; nothing else crosses. Two consequences follow,
and both are the reason the design is worth keeping:

1. **Rendering is offline and reproducible.** The PNGs and the generated data are
   committed, so `npm run render:example` works on a fresh clone with no app, no
   network and no credentials. That is what makes the repository demonstrable at all.
2. **A capture failure cannot be hidden by the renderer.** If the robot photographed
   a blank page, the renderer will faithfully draw a blank page. Correctness has to be
   enforced on the capture side — which is why the capture script throws on an unknown
   op and on a scroll target that does not exist, instead of continuing quietly.

## The invariant this repository is built around

> **A caption may only describe what its frame actually shows.**

It is a product invariant, not a code one, and it has no automated enforcement — which
is precisely why it is written at the top of `walkthrough.specs.mjs` and repeated
here. The first cut shipped captions reading "the brief drives the deck" over a
picture of an empty composer. No deck had ever been on screen. In an artifact most
people only skim, that is a fabricated claim.

The code changes that came out of that failure are all of the same kind — **refuse to
produce evidence about something you did not observe**:

- `walkthrough.mjs:108` — an unrecognised `act` throws. It used to be a silent no-op,
  which produced four captioned steps over one frozen viewport.
- `walkthrough.mjs:95` — `scrollEl` throws when nothing matches. It used to be
  swallowed, so a mistyped selector captured the *previous* position under a *new*
  caption.
- `walkthrough.mjs:124` (inside `openHarness`) — a spec's `ready` string must appear
  before any capture. Presence before capture: if the app never rendered, fail here
  rather than emit frames of a blank page.
- `walkthrough.mjs:32` (`notRunning`) — presence before negative assertion. "The
  spinner is gone" passes vacuously on a page that never rendered, so the panel must
  be visible first.

## Data model

A **spec** is `{ id, title, accent, url, ready, chromeUrl, scales?, retries?, steps[] }`.
A step is one of two shapes:

```js
{ cap: "caption text", cursor?: "<selector>", click?: true, hold?: 60 }   // photograph
{ act: "click" | "fill" | "scrollEl" | ... , sel?, value?, ms? }          // do something
```

A **captured walkthrough** — what the generator writes — is the same object with
`steps[]` replaced by resolved captures:

```js
{ img: "wt/NodeRoom/03.png", caption: "...", cursor: { x: 640, y: 312 },
  click: true, hold: 78 }
```

`hold` is in frames at 30 fps, so `hold: 78` is 2.6 seconds. `cursor` is in the
capture viewport's CSS pixels (1280×800) and `src/Walkthrough.jsx:12` scales it to
displayed-image pixels — that `SX`/`SY` pair is the only coordinate conversion in the
system.

A **burst** step is a capture that holds a *sequence* of frames rather than one
(`{ imgs: [...], burst: true }`), used to show real motion during a loading or
streaming state. `src/Walkthrough.jsx:49` (`burstFrame`) plays it once over ~72% of the
hold and then rests on the last frame.

## Rendering model

Remotion calls the component once per frame with a frame number. Everything the
component draws is a pure function of that number: which step is active
(`steps.findIndex` over cumulative `hold`s), how far the camera has eased
(`interpolate(lf, [6, 26], ...)`), where the pointer has glided to (a `spring` with
stiffness 400 / damping 45, chosen so it accelerates and settles like a hand rather
than tweening symmetrically), and how full the progress bar is. No state, no effects,
no data fetching. That purity is what lets `probe-opening-frame.mjs` render frame 0 and
frame 4 independently and compare them.

## Three renderers, three id prefixes

| Renderer | Composition ids | Entry | Registry |
|---|---|---|---|
| `src/Walkthrough.jsx` | `WT-*` | `src/index.js` | `src/Root.jsx` |
| `src/Walkthrough2up.jsx` | `WTC-*` | `src/index.js` | `src/Root.jsx` |
| `src/WalkthroughGrid.jsx` | `WTG-*` | `src/roomos-index.js` | `src/RoomOsRoot.jsx` |

Remotion composition ids may not contain `_`. All three share the same cross-fade
between steps, which is why one bug in it (the opening white flash, defect D2) hit all
three at once and why `probe-opening-frame.mjs` covers one composition per renderer
rather than all twelve compositions.

## What this architecture deliberately does not have

- **No agent in the product path.** Nothing is inferred, generated or summarised on
  the way from your app to a video. The only model call is the critic that scores the
  finished video, and it never edits the storyboard — `iterate.mjs` writes a revision
  brief and exits non-zero, because a loop that applies its own critic's notes
  converges on what the critic likes.
- **No database, no server, no session.** Recovery is re-running the failed stage,
  because every stage's output is a file.
- **No build step for the toolkit.** What you read is what runs.
