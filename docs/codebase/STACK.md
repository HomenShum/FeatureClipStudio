# Stack

## What kind of program this is

Not a web application. There is no server, no database, no user account, no HTTP
route. It is a set of Node command-line programs that a person runs in a terminal,
each one reading files and writing files. `package.json` `"type": "module"`, so
every file is an ES module — `require` will not work anywhere in this repository.

## Runtime

| | |
|---|---|
| Node | 20 in CI (`.github/workflows/ci.yml`), developed on 22 |
| Module system | ESM only (`"type": "module"`) |
| Language | plain JavaScript. **No TypeScript, no build step, no bundler, no transpiler** for the toolkit. The only compiled thing is JSX, and Remotion compiles that itself. |
| Package manager | npm, `package-lock.json` committed |

## Direct dependencies — four, and each earns its place

```json
"dependencies":    { "@remotion/cli": "^4.0.474", "react": "^18.3.1",
                     "react-dom": "^18.3.1", "remotion": "^4.0.474" },
"devDependencies": { "playwright": "^1.60.0" }
```

- **remotion / @remotion/cli** — renders React components to video frames. This is
  the reason React is here at all; nothing in this repository serves a web page.
- **react / react-dom** — peer requirements of Remotion.
- **playwright** — drives a real Chrome to photograph the app being demonstrated. A
  dev dependency because rendering committed captures does not need it; capturing does.

A fifth entry, `"feature-clip-studio": "file:"`, was removed on 2026-08-13: the
package depended on itself, nothing imported the resulting symlink, and `npx knip`
flagged it as unused. See `docs/SIMPLIFICATION_REPORT.md`.

## Command-line tools that must be on PATH

These are *not* npm packages and `npm ci` will not install them. A missing one shows
up as a spawn failure at the moment it is needed, not at install time.

| Tool | Needed by | What breaks without it |
|---|---|---|
| **ffmpeg** | `clip.mjs`, `score.mjs`, `score-cli.mjs`, `soundtrack.mjs`, `narrate.mjs`, `probe-opening-frame.mjs` | all encoding, all audio, and `npm run probe:opening` |
| **Chromium** | `walkthrough*.mjs` (via Playwright), Remotion's renderer | capture and render; install with `npx playwright install chromium` |
| **python** with `piper` | `narrate.mjs:59` | voiceover synthesis |
| **python** with `moonshine_onnx` | `clip.mjs:61` | the "said matches shown" speech-to-text gate in `npm run clip` |
| **yt-dlp** | `find-references.mjs` | downloading reference videos for calibration |

Only ffmpeg and Chromium are needed for the core capture → render → encode path. The
python tools belong to the optional narration and audio-gate path.

## Network services

One, and it is optional: **Google Gemini** (`generativelanguage.googleapis.com`), used
by `judge-video.mjs`, `judge-rubric.mjs` and `analyze-reference.mjs` to score a
rendered video. Key resolution is in `judge-video.mjs:41-49`: `GEMINI_API_KEY` or
`GOOGLE_GENERATIVE_AI_API_KEY` from the environment, else the same names read out of
`.env.local` or `.env`, else a throw. **Nothing in the capture or render path calls a
model.**

## Two nested projects that are not part of this package

- `examples/convex-reference/` — a Vite + React + Convex sample app, its own
  `package.json`, referenced from the README as a worked target.
- `argo-demos/` — a separate npm project with its own lockfile that produces videos
  with a third-party tool (`@argo-video/cli`), and its own `PATCHES.md` describing a
  hand-patch to `node_modules`. Not reachable from any script here.

`check.mjs` skips both deliberately; their dependencies are not installed by this
package's `npm ci`.
