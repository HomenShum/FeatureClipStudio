# Concerns — what is wrong, unproven, or awkward

Ordered by how likely it is to hurt you. Nothing here is speculative; each item names
the file or the measurement it comes from.

## P0 — open defects

### D1 · `npm run render:example` has failed on Windows, unexplained

The quickstart command — the first thing a new person runs — failed once on Windows
11 / Node 22 with:

```
Failed to launch the browser process! Error: spawn
  …\node_modules\.remotion\chrome-headless-shell\win64\chrome-headless-shell.exe ENOENT
```

Reproduced in both Git Bash and PowerShell at the time. The named executable existed
and ran standalone (`--version` → exit 0). On 2026-08-13, on the same OS and Node, the
same command exited 0 twice and produced a 5.8 MB MP4. **Nothing changed that explains
either result**, so this is recorded as unreproducible, not repaired.
Source: `promotion/PRODUCT_JOURNEYS.md` J1, `promotion/PRODUCT_GOAL.md` condition 2.

**If it hits you:** `npx remotion browser ensure` (what CI runs) before the render.

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
