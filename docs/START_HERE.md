# START HERE — the code in the order it runs

## Who this is for, and what you are about to follow

You have just cloned this repository and nobody who built it is available. Here is
the situation it exists for, in plain words first.

Somebody finished building a piece of software. Now they have to show it to people
who were not in the room — a reviewer, a customer, a hiring manager, a teammate on
another continent. The obvious move is to paste a screenshot of the finished screen
into the README, and that always fails the same way: it shows the ending. A stranger
looking at it cannot tell where the person clicked, what the screen looked like
before anything happened, or whether the answer on screen was real or typed in by
hand. So the builder ends up explaining the software on a live call, every time, to
every new person.

**This repository is a machine that does the explaining for them.** It drives their
running app with a robot pointer, photographs every state on the way, and turns those
photographs into a ten-second silent video with a caption under each step — the empty
screen, the pointer sliding to the button, the click, the waiting, the result
arriving. They drop that into a README and it does the talking.

Two words you will meet everywhere below:

- A **spec** is the written-down script of that demo: an ordered list of "do this,
  then photograph that, and caption it like so." It is a checked-in JavaScript file,
  which is the whole point — re-running it after the app changes produces a new video
  from the new app, and the video breaks the moment the app does.
- A **capture** is one photograph plus the coordinates the pointer was aiming at when
  it was taken.

Three separate programs are involved, and it matters that you know they are separate,
because they never run in the same process:

| Program | What it is | When it runs |
|---|---|---|
| **Playwright** | a robot that drives a real Chrome browser | capture — needs your app running |
| **Remotion** | a video renderer that draws React components as video frames | render — needs no app, only the captures |
| **ffmpeg** | a command-line media encoder | encode — turns frames into GIF/MP4 with sound |

The handoff between the first two is a single generated file, `src/walkthrough.data.js`.
That file is the seam of this whole repository. If you only remember one thing,
remember that: **capture writes it, render reads it, and nothing else connects them.**

### Run it once before you read further

```bash
npm ci
npx playwright install chromium
npm run render:example        # renders a bundled capture — needs no app of your own
```

That produces `out/example.mp4`. The frames it uses are committed under `public/wt/`,
so this works on a fresh clone with nothing else running.

**On Windows, clone to a short path (e.g. `C:\src\fcs`) — a deep checkout exceeds
MAX_PATH and Remotion's browser launch fails with a misleading `ENOENT`.** Remotion
installs its browser under your checkout, and that adds 105 characters to whatever
path you cloned into:

```
<your checkout>\node_modules\.remotion\chrome-headless-shell\win64\chrome-headless-shell-win64\chrome-headless-shell.exe
```

Cross 259 characters and `spawn` refuses the file with `ENOENT` — "no such file" —
about a 203 MB executable that is right there and runs fine when you invoke it
yourself. The error names the file, so it reads as a broken download; it is not.
Measured boundary and repro are in `docs/codebase/CONCERNS.md`, defect D1.

**If you hit it anyway, the tool now tells you so itself.** Everything here that
starts Remotion runs it through `run-remotion.mjs`; when the run fails, that checks
whether the browser Remotion named is present *and* past the limit, and if it is,
prints a message that says MAX_PATH, gives your checkout's length and the length it
has to be, and repeats the fix. Windows still refuses to start the file — that
part is not ours to change — but the message stops blaming a download you do not
need to repeat. `npm run probe:maxpath` is the regression check; it re-measures
the boundary on your own machine, and it scans every runnable file in the repo
for a Remotion invocation and fails on any that does not go through the wrapper.
It scans rather than consults a list because the list-based version of that check
shipped blind to `iterate.mjs`, which nobody had written down.

---

## Step 1 — The entry point is an npm script, not a server

**File:** `package.json`
**Symbol:** `scripts`
**Called by:** a person's terminal
**Calls next:** `run-remotion.mjs` → the Remotion CLI's render → `src/index.js`

**Why this exists**
There is no web server and no HTTP route in this repository — a stage the HUMAN-READY
template expects and which genuinely does not exist here. Every entry point is a
command. `npm run` is the discovery surface: the list below *is* the API.

**Core code**
```json
"capture":        "node walkthrough.mjs",
"capture:collab": "node walkthrough.collab.mjs",
"studio":         "node run-remotion.mjs studio src/index.js",
"render:example": "node run-remotion.mjs render src/index.js WT-NodeRoom out/example.mp4 --concurrency=2",
"clip":           "node clip.mjs",
"check":          "node check.mjs",
"probe:opening":  "node probe-opening-frame.mjs",
"probe:maxpath":  "node probe-max-path.mjs"
```

No npm script invokes Remotion directly. `run-remotion.mjs` passes its arguments
straight through — quoted, so a shell cannot re-split an output path that contains a
space — and returns the same exit code; it exists only so that a browser launch that
fails on Windows can be explained instead of misattributed, see the MAX_PATH note in
the quickstart above. `npm run probe:maxpath` scans every runnable file in the repo
and fails if anything outside the wrapper calls `remotion` itself.

**Input** — command-line arguments only. No request, no session, no user.
**Output** — a file on disk, always. Every stage of this pipeline is resumable
because every stage's output is a file.
**Failure behavior** — a non-zero exit code and a message on stderr.
**Next** — the capture half in Step 2, or jump to Step 7 if you only want to
understand rendering.

---

## Step 2 — The primary user action: drive the app and photograph it

**File:** `walkthrough.mjs`
**Symbol:** `run` — `walkthrough.mjs:136` (`const run = async`)
**Called by:** `npm run capture`
**Calls next:** `walkthrough.mjs:118` (`const openHarness`) → `walkthrough.mjs:71` (`const doAct`) → `walkthrough.mjs:183` (`await page.screenshot`)

**Why this exists**
This is the only place in the repository that touches a live application. It opens a
real Chrome browser, walks one spec at a time, and photographs the app at each `cap`
op. Everything downstream works on the photographs, never on the app — which is why
rendering works offline and on a machine that has never seen your product.

**Core code**
```js
for (const spec of SPECS.filter((s) => !ONLY || s.id === ONLY)) {
  page = await openHarness(browser, spec);       // fresh page per attempt
  for (const op of spec.steps) {
    if (op.cap) { await page.screenshot({ path: join(dir, name) }); steps.push({ img, caption: op.cap, cursor, hold }); }
    else await doAct(page, op);                  // fill / click / scroll / wait
  }
}
```

**Input** — `SPECS` from `walkthrough.specs.mjs`, and a running app at `spec.url`
(default `DEMO_URL`, else `http://127.0.0.1:8502`).
**Output** — `public/wt/<spec.id>/NN.png`, one PNG per `cap` op, plus an in-memory
step list that becomes Step 6's generated file.
**Failure behavior** — a thrown step is caught at `walkthrough.mjs:192` (`} catch (e) {`); the page is photographed
to `zz-fail.png` before anything else, the first 200 characters of the page's text are
logged, and the spec is retried in a brand-new page if `retries` was set. See Step 8.
**Next** — the op vocabulary those specs are written in, Step 3.

---

## Step 3 — Where a string becomes a trusted instruction

**File:** `walkthrough.mjs`
**Symbol:** `loc` — `walkthrough.mjs:39` (`const loc = (p, sel)`) — and `doAct` — `walkthrough.mjs:71` (`const doAct = async (p, a)`)
**Called by:** `run`
**Calls next:** Playwright's own locator API

**Why this exists**
A spec is plain data — `{ act: "click", sel: "btn:Approve" }`. Something has to turn
`"btn:Approve"` into a real element and reject anything it does not understand. This is
that boundary, and it is the closest thing this repository has to schema validation.
There is no Zod, no JSON Schema, no type checker: the validation is a throw.

**Core code**
```js
const loc = (p, sel) => {                      // the selector grammar, in full
  if (sel === "textarea") return P.locator('[data-testid="stTextArea"] textarea, textarea, ...').first();
  if (sel.startsWith("btn:"))  return P.getByRole("button", { name: new RegExp(sel.slice(4), "i") }).first();
  if (sel.startsWith("link:")) return P.getByRole("link",   { name: new RegExp(sel.slice(5), "i") }).first();
  return P.locator(sel).first();               // anything else is raw CSS
};
```

```js
else {                                          // walkthrough.mjs:108 — the invariant
  throw new Error(`unknown act "${a.act}" — valid: fill, click, upload, sleep, ...`);
}
```

**Why that throw is load-bearing, in the words of the bug that caused it:** an
unrecognised act used to fall through the if-chain doing nothing, silently. A spec
written with `scroll` instead of `scrollY` produced four captioned steps over one
frozen viewport — a clip that looked exactly like a walkthrough that worked. **A
capture tool that silently does nothing is worse than one that crashes, because it
emits something that passes for evidence.** The same reasoning added the
`scrollEl: no element matches` throw at `walkthrough.mjs:95` (`scrollEl: no element matches`).

**Input** — one op object from a spec.
**Output** — a performed browser action, or a thrown error naming the valid vocabulary.
**Failure behavior** — throws; caught by Step 8's handler.
**Next** — Step 4.

---

## Step 4 — Agent orchestration: not on this path, and here is where it is

**File:** `iterate.mjs`
**Symbol:** the top-level round loop — `iterate.mjs:62` (`for (let r = 1; r <= rounds`)
**Called by:** `npm run iterate` — `package.json:42` (`"iterate": "node iterate.mjs"`) — and
nothing else. No script and no other file in this repository spawns it.
**Calls next:** `iterate.mjs:72` (`judge-rubric.mjs`) → Google Gemini

**Why this exists — and why the capture/render path has no agent at all**
The stage the HUMAN-READY template calls "agent orchestration" **does not exist in
the capture or render path.** No model is called; nothing is inferred. Say that
plainly rather than inventing a boundary. The only model call in the repository is
the *critic*: after a video is rendered, a judge sends the MP4 to Gemini and gets two
scorecards back — craft (is it well made) and comprehension (would a newcomer
understand it). `iterate.mjs` wraps that in a render → judge → revise loop.

**There are two judges, and which one runs tells you which path you are on.**
`iterate.mjs` spawns `judge-rubric.mjs`, which takes `--gate` and exits non-zero
below it, so the loop can read pass/fail from the exit code. `npm run clip` does
**not** go through `iterate.mjs` at all: it spawns the other judge itself at
`clip.mjs:103` (`judge-video.mjs`) and applies its own thresholds. The two judges are
near-copies that write the same `.judge.json` / `.judge.md` pair; if you are reading
a scorecard and cannot tell which produced it, that is why.

**Core code** — the round's verdict, `iterate.mjs:92` (`if (passed) {`) onward:
```js
  if (passed) {
    console.log(`\n[iterate] round ${r}: ${total}/40 >= ${gate} — shippable. History in ${LOG}`);
    process.exit(0);
  }
```
and, on the last round, the brief it refuses to apply:
```js
    writeFileSync(`${base}.next-cut.md`, [
      …
    ].join("\n") + "\n");
    console.error(`[iterate] revision brief written to ${base}.next-cut.md — apply it and re-run.`);
    process.exit(1);
```

**Input** — a rendered MP4, an audience description (`--for`), a pass mark
(`--gate`, default 28/40), and `GEMINI_API_KEY` in the environment.
**Output** — `<video>.judge.json`, `<video>.judge.md`, a per-round history appended to
`<video>.rounds.md`, and on the final failing round `<video>.next-cut.md` —
`iterate.mjs:99` (`next-cut.md`).
**Failure behavior** — no key: `judge-rubric.mjs:46` (`set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY`)
throws. Below the gate: writes the brief and exits 1 — `iterate.mjs:111` (`revision brief written to`).
**It deliberately does not edit your storyboard** — a loop that applies its own
critic's notes converges on what the critic likes. The human is the steering
mechanism, on purpose.
**Next** — Step 5.

---

## Step 5 — Tool registration: every composition is registered by name

**File:** `src/Root.jsx`
**Symbol:** `RemotionRoot` — `src/Root.jsx:12` (`export const RemotionRoot`)
**Called by:** `src/index.js:4` (`registerRoot(RemotionRoot);`)
**Calls next:** `src/Walkthrough.jsx` `Walkthrough`, `src/Walkthrough2up.jsx` `Walkthrough2up`

**Why this exists**
Remotion has no file-based routing. A video you can render by name exists only if
something called `<Composition>` for it at startup. This file is the registry: it
reads the generated data files and declares one composition per captured walkthrough,
so `remotion render src/index.js WT-NodeRoom` can find `WT-NodeRoom`. If a name is
missing from the studio's left rail, this is the only file that can be at fault.

**Core code** (abridged — read the file, it is 39 lines)
```jsx
{[...WALKTHROUGHS, ...VISUAL_WALKTHROUGHS].map((w) => (
  <Composition id={"WT-" + w.id} component={Walkthrough} defaultProps={{ wt: w }} … />))}
{COLLAB_WALKTHROUGHS.map((w) => (
  <Composition id={"WTC-" + w.id} component={Walkthrough2up} … />))}
```

**The naming rule, which trips everyone once:** ids are `WT-<id>` for single-pane,
`WTC-<id>` for two-pane collaboration, `WTG-<id>` for the four-up grid (registered
separately in `src/RoomOsRoot.jsx`, entry `src/roomos-index.js`). Remotion ids may not
contain `_`.

**Input** — the generated data modules.
**Output** — a composition registry the Remotion CLI and studio read.
**Failure behavior** — a composition whose steps array is empty still registers, with
`durationInFrames` clamped to 1 by the `Math.max(1, …)`; the renderer paints a blank
frame rather than crashing — `src/Walkthrough.jsx:97` (`if (!steps.length) return`).
**Next** — Step 6, the file this registry reads.

---

## Step 6 — Artifact mutation: one generated file is the seam

**File:** `walkthrough.mjs`
**Symbol:** the tail of `run` — `walkthrough.mjs:215` (`"src", "walkthrough.data.js"`)
**Called by:** `run`, once, after every spec has been walked
**Calls next:** nothing — the process ends here

**Why this exists**
Capture and render are separate programs that never share memory. This write is the
entire contract between them. It is also why you can render on a laptop that has never
run the product being demonstrated: the PNGs and this file are committed.

**Core code**
```js
writeFileSync(join(__dirname, "src", "walkthrough.data.js"), data);   // header + JSON, whole file
```
The written file opens with `// AUTO-GENERATED by demo/walkthrough.mjs — do not edit by
hand.` and the run prints `WALKTHROUGH_CAPTURE_DONE`.

**Input** — the accumulated per-spec step lists.
**Output** — `src/walkthrough.data.js`, overwritten whole. Its sibling generated files
follow the same rule: `src/walkthrough.collab.data.js` (from `walkthrough.collab.mjs`),
`src/walkthrough.roomos.data.js`, `src/walkthrough.visual.data.js`.
**Failure behavior** — the file is written even if some specs failed all their
retries; a failed spec contributes an empty `steps` array rather than aborting the
others. Check the console for `attempt N/M err:` lines before trusting a render.
**One more writer, and it is worth knowing about:** `clip.mjs:31` (`writeFileSync("src/walkthrough.data.js"`) **rewrites this same
file in place**, changing each step's `hold` so the picture lasts exactly as long as
its spoken narration. That is the only other thing that edits generated data.
**Next** — Step 7, the reader.

---

## Step 7 — Rendering: one function turns a step list into every frame

**File:** `src/Walkthrough.jsx`
**Symbol:** `Walkthrough` — `src/Walkthrough.jsx:94` (`export const Walkthrough`)
**Called by:** Remotion, once per frame, via the `Composition` in Step 5
**Calls next:** `src/Walkthrough.jsx:49` (`const burstFrame`), `src/Walkthrough.jsx:34` (`const camTarget`), plus `Pointer` and `Ripple`

**Why this exists**
This is the whole visual language of the product in one component: which captured
still is on screen, where the pointer is, how far the camera has zoomed, what the
caption says, how much of the progress bar is filled. There is no streaming and no
progressive UI — Remotion asks for frame *n* and this returns a complete picture of
frame *n*. Everything is a pure function of the frame number, which is what makes a
render reproducible.

**Core code**
```jsx
export const Walkthrough = ({ wt }) => {
  const frame = useCurrentFrame();
  let i = steps.findIndex((s, k) => frame >= starts[k] && frame < starts[k] + (steps[k].hold || 60));
  const lf = frame - starts[i];                        // frames elapsed inside this step
  const t  = spring({ frame: lf, fps: WT_FPS, durationInFrames: 18,
                      config: { stiffness: 400, damping: 45 }, overshootClamping: true });
  cursor = { x: from.x + (c.x - from.x) * t, y: from.y + (c.y - from.y) * t };
```

**Input** — one walkthrough object as the `wt` prop.
**Output** — the JSX for exactly one frame.
**Failure behavior** — an empty step list returns a plain dark frame — `src/Walkthrough.jsx:97` (`if (!steps.length) return`) — instead
of throwing. A missing PNG surfaces as a Remotion asset error naming the file.
**The one bug fixed here that you must not undo** — `src/Walkthrough.jsx:172` (`opacity: prevImg ? fadeIn : 1`): the still is drawn with
`opacity: prevImg ? fadeIn : 1`. The fade is a *cross*-fade and only means anything
with the previous step underneath. On step 0 there is no previous step, so an
unguarded ramp faded the first frame up from the container's white — every clip opened
on a 0.37-second white flash, and a looping README GIF re-flashed on every loop. That
is defect D2. `npm run probe:opening` exists solely to keep it fixed (Step 9).
**Next** — Step 8.

---

## Step 8 — Failure and recovery: photograph the wreck, then retry in a fresh page

**File:** `walkthrough.mjs`
**Symbol:** the `catch` block of `run` — `walkthrough.mjs:192` (`} catch (e) {`)
**Called by:** any throw from `doAct`, `openHarness`, or a Playwright timeout
**Calls next:** `openHarness` again, for the next attempt

**Why this exists**
Steps that call a language model flake roughly half the time, and a half-driven UI
poisons every frame captured after the failure. So a retry must not reuse the page —
it opens a brand-new one. And before retrying, the exact broken state is photographed,
because "which state was the page actually in" is where debugging normally stalls.

**Core code**
```js
await page.screenshot({ path: join(dir, "zz-fail.png") }).catch(() => {});
```
Then the first 200 characters of the page's own text are logged next to
`attempt N/M err: …`, and the retry calls `openHarness(browser, spec)` again — with
the *spec's* url, not the default one; an earlier version reopened the default and so
failed every retry of a spec that targets its own app.

**Input** — the thrown error and the live page.
**Output** — `public/wt/<id>/zz-fail.png`. The `zz-` prefix sorts it last in the frame
directory and no generated data file ever references it, so it can never leak into a
rendered video.
**Failure behavior** — after the last attempt the spec ends with the steps it managed
to capture and the run continues to the next spec. **Recovery is re-running the failed
stage**: every stage's output is a file, so nothing is lost by starting over.
**Next** — Step 9.

---

## Step 9 — The tests that prove the flow

There is no unit-test suite and no `npm test`. Saying otherwise would be the easiest
lie in this document. There are three real gates, in ascending order of what they
prove:

**1. `npm run check` → `check.mjs`** — two halves, and it prints how much of each it
did, so it cannot silently shrink (the fifteen-file hand-kept list it replaced had
drifted to covering a third of the repository). On 2026-08-13 it said:

```
[check] parsed 36/36 JavaScript files; 36/36 tour steps and 34/34 prose citations name a line that matches
```

The first half runs `node --check` on every `.mjs`/`.js` file the package ships. Green
means every file is syntactically valid JavaScript and **nothing more**: `--check`
parses, it does not import, execute, or resolve a dependency.

The second half is the reason you can trust the numbers in this document. Every
`file:line` written here or in a `.tours/*.tour` step has to carry the text it expects
to find, and the gate opens the file and compares. Until 2026-08-13 it asserted only
that the number was within the file's length, which proves an anchor is *stable* and
never that it is *correct* — insert twenty lines at the top of `walkthrough.mjs` and
all 36 tour steps still passed while every one of them pointed at the wrong symbol.
A citation written in a form the gate cannot read is reported as a problem rather
than skipped, because a citation that looks checked and is not is how this came back.

**2. `npm run probe:opening` → `probe-opening-frame.mjs`** — the only committed gate
that *runs the renderers and fails on a property of the rendered output*. It renders
frame 0 and frame 4 of one composition per renderer, decodes both PNGs through ffmpeg,
and asserts they are the same picture within 5% of pixels.

```
PASS  WT-NodeRoom        frame0=#15161a frame4=#15161a diff=0.0%
PASS  WTC-LiveSync       frame0=#0d1722 frame4=#0d1722 diff=0.0%
PASS  WTG-RoomOSV0123    frame0=#151824 frame4=#151824 diff=0.0%
```

Why frames 0 and 4 must match is argued from the code, not assumed: every camera ease
starts at frame ≥ 5 and every caption ease at frame 4, so within a step those two
frames differ only by the opening fade. Receipts land in
`promotion/evidence/opening-frame.json`. Exit 1 means the white flash of Step 7 is
back.

**3. `.github/workflows/ci.yml`** — on every push and pull request: `npm ci`,
`npm run check`, then a real Remotion render of frames 0–30 of `WT-NodeRoom`, and it
asserts the MP4 exists and is non-empty. This is the only automated check that
executes application code. It deliberately excludes the Playwright capture step, which
needs a live app that CI does not have.

**What none of them prove:** that a capture against a real application produces correct
frames. That path is exercised by hand. See `docs/codebase/TESTING.md` and
`docs/codebase/CONCERNS.md`.

---

## Where you would add one adjacent capability

**"I want to film my own app."** Copy `walkthrough.specs.mjs` to a new file, export a
`SPECS` array with your app's `url`, a `ready` string that only appears once your app
has actually rendered, and your ops. Point `walkthrough.mjs:15` (`import { SPECS }`) at it (or add a script
next to `capture:collab`). Run `npm run capture`, then `npm run studio` to scrub the
result before spending minutes on a render.

**"I want a new visual treatment."** Add a component beside `src/Walkthrough.jsx` and
register it in `src/Root.jsx` with a new id prefix. Do not modify `Walkthrough.jsx` for
one clip's sake — three previous cuts are locked to its current behaviour, and
`probe:opening` guards its opening frame.

**"I want a new op in the spec vocabulary."** Add a branch in `doAct`, at
`walkthrough.mjs:71` (`const doAct = async (p, a)`) **and** add its name to the
error message at `walkthrough.mjs:109` (`unknown act`). The
error message is the vocabulary's only documentation; letting it drift re-opens the
silent-no-op defect that made the throw necessary.
