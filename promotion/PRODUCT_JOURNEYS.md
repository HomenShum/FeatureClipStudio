# Canonical journeys — FeatureClipStudio

Three to five real workflows. Not feature tours: a journey is one person, one
goal, and the artifact they hold when it worked. These are the promotion loop's
work queue, exercised in order of importance.

**A journey with no browser evidence is unfinished**, regardless of test status.

This is a `reduced`-gate repo: a Node CLI toolkit with no product UI of its own.
Its demo surface is therefore (a) the quickstart in `README.md`, (b) the Remotion
Studio preview served by `npm run studio`, and (c) the zero-dependency worked
example at `examples/collab-demo/`. Every journey below drives one of those.

## Journey shape

Each journey states, in this order:

- **Persona and situation** — who arrived, and why today.
- **Goal** — what they want to be true when they leave.
- **Steps** — what they actually do, in the UI, in order.
- **Done when** — the observable artifact or state that proves completion.
- **Evidence** — path to the capture that shows it working. Empty until proven.

---

## J1 — "Show me it makes a video before I wire it to my app"

- **Persona and situation:** An engineer who found the repo from a README GIF on
  another project. They have not written a spec, they have no app running, and
  they are deciding in the next ten minutes whether this is worth an afternoon.
  The README promises exactly this: bundled captured frames, "renders
  immediately, no app needed".
- **Goal:** A playable MP4 on disk, produced by a command they typed, before
  they commit to writing a capture spec.
- **Steps:**
  1. `git clone` the repo, `cd` in.
  2. `npm install` (measured here as `npm ci`).
  3. `npx playwright install chromium`.
  4. `npm run render:example` — README line 252.
  5. Run the README's ffmpeg palette command over `out/example.mp4`.
- **Done when:** `out/example.mp4` exists, is non-trivial in size, and plays.
- **Evidence:** **NOT BANKED — succeeded in Iteration 1, but D1 is unexplained.**
  2026-08-13, fresh clone at `5486bb8` on the same OS (Windows 11 10.0.26200) and
  Node (v22.22.2): steps 1-4 ran clean, `npm run render:example` **exit 0**,
  `out/example.mp4` 5,985,657 bytes; re-run after the D2 fix, exit 0, 5.8 MB.
  Frame 0 of that MP4 is committed at
  `evidence/opening-frame/example-mp4-frame000.png`. Step 5 (the ffmpeg palette
  command) was not run. The journey is not marked done because Wave 1's failure
  below was never explained, only unreproduced — and `out/` is gitignored, so the
  MP4 itself is not an artifact anyone else can inspect.
  **Wave 1 observed the opposite:** `npm run render:example` exits 1 —
  `Failed to launch the browser process! Error: spawn …\node_modules\.remotion\chrome-headless-shell\win64\chrome-headless-shell-win64\chrome-headless-shell.exe ENOENT`.
  Reproduced in Git Bash and PowerShell. The named exe exists and runs standalone
  (`--version` → `Google Chrome for Testing 149.0.7790.0`, exit 0). Defect D1.
  **Iteration 2 (2026-08-13) settled the disagreement between those two waves.**
  Both were right; the variable was the length of the directory each had cloned
  into. The same clone, renamed: 149 characters → exit 0, `out/example.mp4`
  5,777,972 bytes; 172 characters → exit 1, the ENOENT above; renamed back →
  exit 0 again. The 260-character Windows limit is not this repository's to lift,
  so from a deep checkout the journey still ends without an MP4 — but it now ends
  with a message that says MAX_PATH, gives the checkout's length and the length
  it must be, and names the fix, instead of pointing at a browser download.
  `grep -c MAX_PATH` over the quickstart's output at 172 characters: **0 before,
  1 after** — `evidence/max-path/render-example.before.log` and
  `evidence/max-path/render-example.after.log`. Re-provable from a clone with
  `npm run probe:maxpath`. **Still NOT BANKED:** a journey whose artifact is an
  MP4 is not done when the MP4 does not exist, however good the error is.

## J2 — "Preview the bundled walkthrough in a browser"

- **Persona and situation:** The same engineer, after the CLI render failed, or
  a spec author who has just edited `walkthrough.specs.mjs` and wants to see the
  cursor timing before spending minutes on a render.
- **Goal:** See a composition — real captured frames, animated cursor, caption
  lower-third, progress bar — moving in a browser, and scrub to any moment.
- **Steps:**
  1. `npx remotion studio src/index.js` (package script: `npm run studio`).
  2. Open the studio in a browser; it opens on `WT-NodeRoom`.
  3. Read the composition list in the left rail (12 compositions).
  4. Click the timeline ruler to scrub to ~00:13.
- **Done when:** The player canvas shows the captured app frame with the pointer
  over the target control and the step caption rendered under it, and the
  timecode readout matches where the playhead was dropped.
- **Evidence:** `evidence/remotion-studio-seek12s.png` — playhead at 00:13.12
  (frame 402), NodeRoom spreadsheet frame, cursor on "Let the AI try to overwrite
  my edit", caption "Press the button: the AI tries to overwrite your edit — and
  gets told no." Desktop and mobile loads: `evidence/remotion-studio-desktop.png`,
  `evidence/remotion-studio-mobile.png`.
  **Wave 1 caveat, Defect D2 — FIXED in Iteration 1 (2026-08-13):** at frame 0
  the same canvas painted solid white. It now paints the captured app frame.
  Re-provable from a clone with `npm run probe:opening`; before/after receipts at
  `evidence/opening-frame.before.json` and `evidence/opening-frame.json`, stills
  at `evidence/opening-frame/before/WT-NodeRoom-frame000.png` (white) and
  `evidence/opening-frame/WT-NodeRoom-frame000.png` (the app).

## J3 — "Run the worked example so the collab GIF reproduces on my machine"

- **Persona and situation:** Someone whose product is live-collaborative. A
  single-cursor screen recording cannot show what makes it special — a change in
  one client appearing in another. They want to confirm the multi-pane path is
  real before adapting it, and the repo ships a runnable app for exactly that:
  `examples/collab-demo/`, no install, no cloud login.
- **Goal:** A running local app with a live agent, ready to be captured by
  `node walkthrough.collab.mjs`.
- **Steps:**
  1. `node examples/collab-demo/server.mjs` (prints the port and both pane URLs).
  2. Open `http://localhost:8930/?user=A`.
  3. Type a card title, click **Add**.
  4. Click **🤖 Run agent**.
- **Done when:** The empty state is replaced by the committed card attributed to
  its author, and the server-led agent appends its own card carrying who asked
  for it — the app is in the state the capture script expects.
- **Evidence:** `evidence/collab-demo-desktop.png` (1280×900) and
  `evidence/collab-demo-mobile.png` (390×844). Driven live in-browser: empty
  state → `POST /mutate → 200` → card "Baseline probe card from Wave 1 / Ana` →
  `POST /agent → 202` → "🤖 Agent (requested by Ana): … done. Top theme:
  collaboration." Zero console errors.
  **Iteration 4 (2026-08-13) re-drove this journey from a committed producer.**
  `npm run audit:ui` starts the server, drives the same four steps at 390, 768
  and 1280, and captures every state the gate names — empty, loading, success,
  agent-running and, for the first time, error — under `evidence/ui/`. It also
  found and fixed ten major interface defects along the way, listed as D5 with
  their measurements in `WIG_REVIEW.md`. The journey now has evidence that
  regenerates rather than evidence that was taken once: **24 of 52 checks on the
  pre-fix tree, 52 of 52 after** (`evidence/audit-ui.before.json`,
  `evidence/audit-ui.json`).

## J4 — "Check the toolkit is intact before I trust it in CI"

- **Persona and situation:** A maintainer wiring this into another repo's
  pipeline. `nodekit.yaml` declares `doctor` and `check` both map to `npm run
  check`, and declares `noKey.status: partial` — so this is the one command that
  is supposed to work with no API key and no target app.
- **Goal:** A clean exit code from the no-key gate.
- **Steps:** `npm ci`, then `npm run check`.
- **Done when:** Exit code 0.
- **Evidence:** `npm ci` exit 0 (186 packages, 1m). `npm run check` exit 0.
  **Read the result honestly:** `check` is fourteen chained `node --check` calls.
  It parses source and executes nothing, so a green `check` proves the files are
  syntactically valid JavaScript and nothing more. There is no `test` script in
  `package.json`.

## J5 — "Have the gate judge my cut and tell me what to fix"

- **Persona and situation:** Someone who has a rendered video and wants the
  repo's own quality gate — two rubrics, craft and comprehension, scored from a
  named audience's seat — to fail them with a revision brief rather than nod.
- **Goal:** `<video>.judge.md`, `.judge.json`, and on failure `.next-cut.md`.
- **Steps:** `npm run judge -- out/<id>.mp4 --for "<audience>" --gate 28`.
- **Done when:** A scorecard file exists on disk with per-dimension scores.
- **Evidence:** **UNVERIFIED — not run, deliberately.** Two blockers: it requires
  `GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` (`judge-video.mjs:42-48`,
  which throws `set GEMINI_API_KEY…` without one), and Wave 1 does not create or
  rotate secrets; and its input is a rendered MP4, which J1 could not produce.

---

## Journeys every agent surface owes

FeatureClipStudio does not run an agent on the user's behalf in a UI — it is a
capture-and-render pipeline driven from a terminal. The template's three agent
journeys are answered as follows, as decisions rather than omissions:

- **Recovery** — **Does not apply as a UI journey.** There is no session to lose:
  every stage writes to disk (`public/wt/<id>/*.png`, `src/walkthrough.data.js`,
  `out/*.mp4`) and recovery is re-running the failed stage. J1 is the real
  recovery story and it is currently a dead end: the failure prints a Remotion
  troubleshooting URL and no in-repo fallback.
- **Steering** — **Covered by J5, and deliberately manual.** `iterate.mjs` writes
  its critic's brief to `.next-cut.md` and exits non-zero instead of applying it,
  because a loop that edits the storyboard from its own critic converges on what
  the critic likes. The human is the steering mechanism, by design.
- **Receipt** — **Partly covered by J3.** The demo app's agent card names who
  requested it ("requested by Ana") and attributes the row to `Agent`, which is
  the receipt shape. For the pipeline itself the receipt is
  `nodekit.yaml`'s declared `featureclip.evidence-receipt/v1`, emitted by
  `npm run judge` — unverified for the same reason as J5.
