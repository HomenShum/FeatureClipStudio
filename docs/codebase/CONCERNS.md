# Concerns — what is wrong, unproven, or awkward

Ordered by how likely it is to hurt you. Nothing here is speculative; each item names
the file or the measurement it comes from.

## P0 — open defects

### D1 · `npm run render:example` fails on Windows when the checkout path is too long — **the misleading error is FIXED; the path limit is not ours to remove**

The quickstart command — the first thing a new person runs — fails on Windows with:

```
Failed to launch the browser process! Error: spawn
  …\node_modules\.remotion\chrome-headless-shell\win64\chrome-headless-shell.exe ENOENT
```

`ENOENT` is "no such file", and the named executable is there: 202,939,392 bytes, and
running it yourself gives `Google Chrome for Testing 149.0.7790.0`, exit 0. That
contradiction is the whole defect, and it is not Remotion's: it is **Windows MAX_PATH**.
A path of 260 characters or more cannot be opened through the ANSI path APIs `spawn`
uses, so the launch fails with the error code for a missing file about a file that is
present. Remotion installs its browser inside the checkout, which adds 105 characters:

```
<your checkout>\node_modules\.remotion\chrome-headless-shell\win64\chrome-headless-shell-win64\chrome-headless-shell.exe
```

so any clone directory longer than about 154 characters puts the executable over the
line. It looked unreproducible because the two people who hit it had cloned into
different directories, and the failure depends on nothing except how long that
directory's name is.

**Measured 2026-08-13**, Windows 11 / Node 22, one 202,939,392-byte
`chrome-headless-shell.exe` hard-linked to five paths of different lengths and spawned
from Node with `--version`:

| path length | `existsSync` | `spawnSync` |
|---|---|---|
| 255 | true | exit 0 |
| 258 | true | exit 0 |
| 259 | true | exit 0 |
| 260 | true | **ENOENT** |
| 261 | true | **ENOENT** |
| 270 | true | **ENOENT** |

The boundary is exactly 260, `existsSync` is true on both sides of it — Node's `stat`
path and its `spawn` path do not agree — and the same file is reached in every row.
From a 153-character checkout the full quickstart then ran end to end: exit 0, a
5,777,972-byte `out/example.mp4`.

**Fix:** clone to a short path, e.g. `C:\src\fcs`. `docs/START_HERE.md` says so in the
quickstart. Asking Remotion to re-fetch the browser (`browser ensure`, which CI runs)
does **not** help — it puts the browser at the same long path.

**What changed on 2026-08-13 (Iteration 2).** The 260-character limit belongs to
Windows and this repository cannot lift it. What it *could* stop doing is naming the
wrong cause. Remotion is now started from one file, `run-remotion.mjs`, which on a
failed run checks the one thing Remotion's message does not — whether the browser it
named is present *and* past the limit — and if so prints a message that says MAX_PATH,
gives both numbers, and names the fix. Iteration 2 wired eight callers by hand and
missed a ninth, `iterate.mjs`; Iteration 3 wired that one, gave the wrapper the
captured-output mode that `clip.mjs` and `probe-opening-frame.mjs` had been spawning
Remotion themselves to get, and replaced the list-based wiring check with a scan.
Measured on a 172-character checkout, same machine, same command:

| `npm run render:example` | exit | occurrences of "MAX_PATH" in the output |
|---|---|---|
| before | 1 | **0** |
| after | 1 | **1** |

The exit code is deliberately unchanged: the render still cannot run from there, and a
command that failed must keep saying so. What changed is that the reader is now told
why, instead of being sent to re-download a browser they already have. Before/after
terminal output: `promotion/evidence/max-path/render-example.before.log` and
`…after.log`. Regression check: `npm run probe:maxpath`, which re-measures the boundary
on your machine rather than trusting the table above, and asserts that every command
that starts Remotion still reaches the explanation.

### D2 · opening white flash — **FIXED**, and guarded

Every clip used to open on the container's backdrop rather than the first captured
frame, because the per-step cross-fade had nothing to fade from at step 0. Fixed at
`src/Walkthrough.jsx:172` and its two siblings. `npm run probe:opening` is the guard;
before/after receipts are in `promotion/evidence/`. Listed here so nobody
"simplifies" the `prevImg ? fadeIn : 1` guard back out.

## P1 — the gaps a new engineer will fall into

### There is no test suite

No `npm test`, no framework, no unit tests. `npm run check` parses and executes
nothing; `npm run probe:opening` covers exactly frames 0 and 4 of three compositions.
Everything else is verified by a human watching a video. See `TESTING.md` for what
each gate does and does not prove.

**Consequence for you:** you cannot refactor the capture drivers or the renderers with
confidence from the test suite, because there isn't one. Render before and after, and
diff the output.

### Three capture drivers are near-copies of each other

`jscpd` (2026-08-13, commit `341fd20`) finds a 25-line clone between `walkthrough.mjs`
and `walkthrough.visual.mjs`, and an 18-line clone between `walkthrough.mjs` and
`walkthrough.solo-founder.mjs`. `walkthrough.solo-founder.mjs:2` says so in its own
header: *"Adapted from walkthrough.mjs which targets Streamlit tabs."* The shared parts
are the `sleep`/`loc`/`cursorOf` helpers and the capture loop.

**Left unresolved deliberately.** Merging them is a refactor of this repository's
primary path, and rule 2 of the human-readiness gate requires a characterization test
first. Writing one needs the three target applications — a Streamlit harness, a "visual
labs" app, and a 3D React SPA — none of which are in this repository. A merge done
blind would be the exact defect this repository was built to expose: a change that
looks correct and silently captures the wrong thing.

**If you do it anyway:** extract `sleep`, `panel`, `loc`, `cursorOf`, `doAct` into one
module, keep the four `run()` loops separate, and re-capture at least one walkthrough
per driver against its real app before merging.

### `src/Walkthrough.jsx` and `src/Walkthrough2up.jsx` share four duplicated blocks

65 duplicated lines across four clones (`jscpd`, same run): the camera easing, the
pointer spring, the caption lower-third, the progress bar. **This is why defect D2
appeared in three renderers at once.** The same caution applies — plus `probe:opening`
does give you a real before/after signal here, so this one is more tractable than the
capture drivers.

### Generated data is committed, and it is large

`src/walkthrough.collab.data.js` is 2,214 lines and `src/walkthrough.roomos.data.js` is
1,273 — together roughly a third of the repository's source lines, none of it written
by hand. It is committed on purpose: it is what makes `npm run render:example` work on
a clone with no app running. **Do not read these files for understanding and do not
hand-edit them.** A capture run overwrites them whole.

### 689 committed PNG captures

`public/wt*/` holds the frames those generated files point at. Same justification, same
warning: the repository is heavy to clone and there is no pruning story for captures
belonging to walkthroughs nobody renders any more.

## P2 — friction, not danger

### The README is 1,373 lines

It is the product pitch and the complete option surface in one file. That is a
reasonable thing for a tool's landing page to be and an unreasonable thing for an
engineer's first read, which is why `docs/START_HERE.md` exists and the README now
points at it.

### `argo-demos/` is a second npm project that nobody here calls

Its own `package.json` and lockfile, a dependency on the third-party `@argo-video/cli`,
and a `PATCHES.md` telling you to hand-edit `node_modules` after every install. It
produced two published videos referenced in `JOURNEYS.md`, so it is provenance rather
than dead code — but nothing in this package's scripts reaches it, `check.mjs` skips
it, and CI never installs it. **Kept for that provenance; treat it as an archive, not
as a component.**

### `JOURNEYS.md` documents two other products

It is a July 2026 journey map of NodeRoom and NodeSlide — the applications that were
filmed with this tool — not of FeatureClipStudio. The four survey scripts that produced
its numbers were deleted on 2026-08-13 (they imported a sibling checkout that a clone
does not have); the file now says so and points at `git show 341fd20:` for them.

### `voice.mjs` contains a literal NUL byte

At offset 4089, inside a legitimate `.replace(/\0/g, "")`. Harmless to Node, but `git`
and `grep` classify the file as binary, so it silently drops out of repository-wide
text searches. If you are grepping for something and expect a hit in `voice.mjs`, use
`grep -a`.

### Journey J5 has never been run

The judging path (`npm run judge`) requires `GEMINI_API_KEY` and no promotion wave has
created secrets, so the two rubrics have never been exercised end to end from a clean
clone. `promotion/PRODUCT_JOURNEYS.md` records this as UNVERIFIED, not as passing.

## Where the honest current state lives

`promotion/PRODUCT_GOAL.md` carries the twelve-condition PROMOTION scorecard, currently
**1/12 PASS**, with each row stating its own evidence or its own reason for being
UNVERIFIED. It is more candid than most repositories' status pages and it is the right
place to start if you are deciding whether to depend on this.
