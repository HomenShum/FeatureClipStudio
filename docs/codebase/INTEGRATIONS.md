# Integrations — everything outside this process

Five things this repository talks to. Four are local programs; one is a network
service and it is optional.

## 1. Your application, over a real browser (Playwright)

**Where:** `walkthrough.mjs`, `walkthrough.collab.mjs`, `walkthrough.roomos.mjs`,
`walkthrough.visual.mjs`, `walkthrough.solo-founder.mjs` — all via
`import { chromium } from "playwright"`.

**How it is addressed:** `spec.url` if the spec sets one, else `process.env.DEMO_URL`,
else `http://127.0.0.1:8502` (`walkthrough.mjs:19`). A single run can walk several apps
on different dev servers because the url is per-spec.

**What it assumes about your app:** almost nothing, with one historical exception.
`panel()` (`walkthrough.mjs:27`) scopes every selector to
`[data-baseweb="tab-panel"]:visible` *if one exists*, falling back to `body`. That is a
Streamlit accommodation, and the fallback exists because scoping to a selector that
does not exist made every step fail while the run still reported success.

**Failure mode:** the app is not running → `page.goto` throws a connection error and
the spec's attempt fails into the forensics path (`zz-fail.png`). The app is running
but slow → the `ready` proof string times out after 30 s. Neither can produce a
green run with empty frames; that is the whole point of the `ready` field.

**Setup:** `npx playwright install chromium`. `npm ci` alone is not enough.

## 2. Remotion, as a child process

**Where:** one place, `run-remotion.mjs`; `clip.mjs`, `probe-opening-frame.mjs`,
`iterate.mjs`, the npm scripts and CI all go through it. On Windows it passes
`shell: process.platform === "win32"`, because `npx` is `npx.cmd` and Node ≥ 20.12
refuses to exec a `.cmd` without a shell — and it quotes each argument first, because
a shell re-splits them on whitespace and an output path containing a space would
otherwise render, exit 0, to the wrong filename. `npm run probe:maxpath` scans for
any other file that starts Remotion and fails if it finds one.

**Failure mode:** Remotion downloads and manages its own headless Chrome under
`node_modules/.remotion/`. A failure to launch it is defect D1 — see CONCERNS.md.

## 3. ffmpeg, as a child process

**Where:** `clip.mjs`, `score.mjs`, `score-cli.mjs`, `soundtrack.mjs`, `narrate.mjs`,
`probe-opening-frame.mjs`. Never wrapped in a library.

`probe-opening-frame.mjs:56` is worth reading as an example of the reuse ladder in
practice: it needs to compare two PNGs, and instead of adding an image-decoding
dependency it pipes each PNG through ffmpeg to raw RGB24 at 192×108 — *"no image
library: ffmpeg is already a hard requirement of this repo, and one pipe is smaller
than a dependency."*

**Failure mode:** ffmpeg missing from PATH → `spawnSync` returns a non-zero status and
the caller throws with the captured stderr. `npm ci` does not install it.

## 4. Python, for speech (optional path)

Two separate tools, both invoked as `python -c "<inline script>"`:

| Module | Where | Job |
|---|---|---|
| `piper` | `narrate.mjs:59`, `narrate.mjs:109` | text → speech for the voiceover |
| `moonshine_onnx` | `clip.mjs:61` | speech → text, to check the narration says what the screen shows |

**Failure mode:** the module is not installed → the python process exits non-zero and
the caller reports it. `narrate.mjs:84` additionally retries piper line-by-line in
fresh processes when a batch aborts. A known limitation is recorded in the repository:
Moonshine silently degrades past roughly 60 seconds of audio, so the gate chunks.

**Setup:** these are the only things that make `npm run clip` a longer install than
`npm ci`. The capture → render → `render:example` path never touches python.

## 5. Google Gemini, over HTTPS (optional)

**Where:** `judge-video.mjs:186`, plus `judge-rubric.mjs` and `analyze-reference.mjs`.
Endpoint `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`,
called with the plain `fetch` built into Node — no SDK.

**Credentials:** `judge-video.mjs:41-49`, in order: `GEMINI_API_KEY` or
`GOOGLE_GENERATIVE_AI_API_KEY` from the environment; else the same two names read out
of `.env.local` or `.env` in the working directory; else
`throw new Error("set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY")`. **No key is
committed and none is required for anything except judging.**

**Payload:** the MP4 itself, base64-inlined. `judge-rubric.mjs:111` refuses anything
over 19 MB with a message pointing at the Files API — inline request limits are the
constraint, not the model's.

**Failure mode:** no key → an immediate throw naming the two variable names. HTTP
error → `throw new Error(\`gemini ${res.status}: …\`)` carrying the first 300
characters of the body.

**This is the only network call in the repository**, and nothing in the capture or
render path makes it.

## 6. yt-dlp (calibration only)

`find-references.mjs` shells out to `yt-dlp` to fetch reference videos used to
calibrate the judging rubric. Not needed to build or judge your own clip.

## What there is no integration with

No database, no cloud storage, no authentication provider, no analytics, no error
reporter, no CI service beyond GitHub Actions, no telemetry. Every output is a file in
the working tree.
