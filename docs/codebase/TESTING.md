# Testing — what exists, and precisely what it proves

**There is no unit-test suite, no test framework, and no `npm test`.** Stating that
plainly is more useful than a page describing tests that are not there. What exists is
three gates, and each one proves strictly less than the next reader will assume.

## Gate 1 — `npm run check`

```
$ npm run check
[check] parsed 36/36 JavaScript files; 36/36 tour steps and 34/34 prose citations name a line that matches
$ echo $?
0
```

**File:** `check.mjs`. Two halves. The first walks the repository (skipping
`node_modules`, generated directories, and the two nested projects `examples/` and
`argo-demos/`) and runs `node --check` on every `.mjs`/`.js` file. The second reads
every citation in the guided-reading docs — each `.tours/*.tour` step, and every
`file:line` written in a tour description or in `docs/START_HERE.md` — opens the file
it names, and asserts that line contains the text the citation says it contains.

**Proves:** every JavaScript file this package ships parses, and no citation in the
docs a newcomer is told to follow points at the wrong line.
**Does not prove:** that any of it runs. `--check` does not import, execute, or resolve
a single dependency. A file that throws on its first line still passes.

**Why the second half reads the line instead of counting lines.** Until 2026-08-13 it
asserted `1 <= step.line <= lineCount` and nothing more. That proves an anchor is in
range, never that it is correct: insert twenty lines at the top of `walkthrough.mjs`
and all 36 tour steps still pass while every one of them points at the wrong symbol.
So a tour step now carries `pattern` — CodeTour's own field for associating a step
with line content rather than an ordinal — and prose carries its expectation inline as
``` `file:line` (`text on that line`) ```. Prose that cites a line without carrying
its expectation is reported as a problem rather than skipped: a citation the gate
cannot read is exactly how the unchecked citation came back. Repoint any step at a
neighbouring line to watch it fail; it names the line the pattern is actually on.

**Why it prints a count.** Until 2026-08-13 this gate was fifteen `node --check` calls
chained in `package.json`. The list was maintained by hand and had drifted to covering
15 of 45 files — including neither `walkthrough.collab.mjs` nor `walkthrough.roomos.mjs`,
two of the four capture drivers. `nodekit.yaml` maps both `doctor` and `check` to this
command, so a green exit was answering "is the toolkit intact?" about a third of the
toolkit. The count exists so the gate cannot silently shrink again.

## Gate 2 — `npm run probe:opening`

```
$ npm run probe:opening
PASS  WT-NodeRoom        frame0=#15161a frame4=#15161a diff=0.0%
PASS  WTC-LiveSync       frame0=#0d1722 frame4=#0d1722 diff=0.0%
PASS  WTG-RoomOSV0123    frame0=#151824 frame4=#151824 diff=0.0%

PASS: wrote promotion/evidence/opening-frame.json
$ echo $?
0
```

**File:** `probe-opening-frame.mjs`. The only committed gate that runs the renderers
and fails on a property of the *rendered output* rather than of the source.

**What it does:** renders frame 0 and frame 4 of one composition per renderer with
`npx remotion still`, decodes both PNGs through ffmpeg to raw RGB at 192×108, and
asserts fewer than 5% of pixels differ by more than 12 per channel.

**Why frames 0 and 4 must match** — argued from the code, not assumed: within one
step, every camera ease starts at frame ≥ 5 (`[6,26]` in `Walkthrough.jsx` and
`Walkthrough2up.jsx`, `[5,30]` in `WalkthroughGrid.jsx`) and every caption ease at
frame 4, so all of them clamp to their start value across frames 0–4. The pointer's
opacity ramp and the progress bar are the only other movers and together cover well
under 1% of the canvas. So the two frames can differ only by the opening fade.

**Proves:** no clip opens on its container's backdrop instead of on the captured app
(defect D2 — every clip used to open on a 0.37-second white flash, and a looping
README GIF re-flashed on every loop). Confirmed failing before the fix, not only
passing after: `promotion/evidence/opening-frame.before.json` records exit 1 with
90.4% and 22.8% of pixels differing on two of the three renderers.

**Does not prove:** anything about frames 5 onward, captions, cursor accuracy, or
whether the captured app was the right app.

**Costs:** six Remotion stills plus six ffmpeg decodes — a couple of minutes. Needs
ffmpeg and Remotion's Chrome.

## Gate 3 — GitHub Actions

**File:** `.github/workflows/ci.yml`, on every push and pull request:

```yaml
- run: npm ci
- run: npm run check
- run: npm run probe:maxpath
- run: node run-remotion.mjs browser ensure
- run: node run-remotion.mjs render src/index.js WT-NodeRoom /tmp/wt-smoke.mp4 --frames=0-30 --concurrency=2
- run: test -s /tmp/wt-smoke.mp4 && stat -c '%s bytes' /tmp/wt-smoke.mp4
```

**Proves:** a clean `npm ci` from the committed lockfile works on Linux/Node 20, every
file parses, and the render pipeline reproduces a non-empty MP4 from the committed
walkthrough data alone. This is the only automated check that executes application
code, and the only one that exercises `src/Root.jsx` and `src/Walkthrough.jsx`.

**Deliberately excludes:** the Playwright capture step, which needs a live application
that CI does not have. `probe:opening` is also not in CI (it renders three
compositions and needs ffmpeg).

## What nothing proves, and how it is covered instead

| Untested | Covered by |
|---|---|
| capture against a real app produces correct frames | running it by hand; `zz-fail.png` forensics when it does not |
| a caption matches the frame under it | human review, plus `npm run judge` scoring the finished video |
| the narration says what the screen shows | `npm run clip` gate 2 — Moonshine speech-to-text against the storyboard |
| the audio is actually present in the mux | `npm run clip` gate 1 — ffmpeg `volumedetect` mean volume |
| the two- and four-pane renderers beyond frame 4 | nothing |

## Running the whole thing locally

```bash
npm ci                                   # ~185 packages
npx playwright install chromium
npm run check                            # seconds
npm run render:example                   # ~1 minute, writes out/example.mp4
npm run probe:opening                    # ~2 minutes, needs ffmpeg
```

If you are changing `src/Walkthrough.jsx`, `src/Walkthrough2up.jsx` or
`src/WalkthroughGrid.jsx`, run `probe:opening` before and after. It is the only thing
standing between the cross-fade and defect D2.
