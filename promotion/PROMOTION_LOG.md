# Promotion log — FeatureClipStudio

Loop state lives here, in git, so any agent can resume cold. One entry per
iteration. Append; never rewrite history, because the list of things that turned
out to be wrong is more useful to the next reader than the current values alone.

Iteration cap: **10** (default). On reaching the cap without a gate pass, stop
and leave the remaining defect ledger below — a documented stop is a valid
outcome; a silent one is not.

## Entry shape

```
### Iteration N — YYYY-MM-DD
- Journey exercised: J<k> <name>
- Observed: <the defect, with its reproduction — inputs, width, state>
- Fixed: <the change, using existing components; file paths>
- Re-proved: <evidence path showing the defect gone in the rendered app>
- Tests: <command and result>
- Conditions newly PASS: <numbers, or "none">
```

---

## Baseline — 2026-08-13

Wave 1. Baseline only: **nothing was fixed, on purpose.** A baseline that
quietly repairs things is a baseline nobody can compare against.

- **Environment:** Windows 11 (10.0.26200), Node v22.22.2, npm 10.9.7, ffmpeg
  6.0-full_build. Fresh `git clone --depth 50` at `053cc86`.
- **App started:** *Partly.* There are three start paths and they do not agree.
  - `npm run render:example` — the README's headline quickstart — **exit 1**,
    browser launch ENOENT. Defect D1.
  - `npm run studio` (`npx remotion studio src/index.js --port 3111`) — **works.**
    Server ready, built in 12245ms, composition renders in a browser.
  - `node examples/collab-demo/server.mjs` — **works.** Listening on :8930.
- **Journeys drivable: 3 of 5.** J2 and J3 driven end-to-end in a browser with
  captures. J4 runs green from the terminal (no browser surface). J1 fails. J5
  not run — needs a `GEMINI_API_KEY` this wave does not create, and an MP4 that
  J1 could not produce.
- **Scorecard at baseline:** 3/12 PASS — see [PRODUCT_GOAL.md](PRODUCT_GOAL.md).
  Conditions 4, 6, 9 PASS; 1, 2, 11 FAIL; 3, 5, 7, 8, 10, 12 UNVERIFIED.
- **Not marked DEFERRED** in the context note for this run.

### Commands run, with real exit codes

| Command | Exit | Note |
|---|---|---|
| `git clone --depth 50 …/FeatureClipStudio.git` | 0 | 839 files |
| `npm ci` | 0 | 186 packages in 1m; 10 vulnerabilities reported (1 low, 9 high) — not triaged this wave |
| `npx playwright install chromium` | 0 | |
| `npm run check` | 0 | fourteen chained `node --check`; parses, executes nothing |
| `npx remotion browser ensure` | 0 | downloaded Headless Shell, printed "Has browser at …chrome-headless-shell.exe" |
| `npm run render:example` (Git Bash) | 1 | `spawn …chrome-headless-shell.exe ENOENT` |
| `npm run render:example` (PowerShell) | 1 | identical failure — not a shell artifact |
| `…\chrome-headless-shell.exe --version` | 0 | `Google Chrome for Testing 149.0.7790.0` — the file Remotion says is missing runs fine |
| `node examples/collab-demo/server.mjs` | running | listening on :8930 |
| `npx remotion studio src/index.js --port 3111` | running | ready, built in 12245ms |
| Playwright capture of both surfaces × 2 widths | 0 | wrote `promotion/evidence/*.png` + `report.json` |
| `gh run list --limit 5` | 0 | five most recent CI runs on main: all `success` |

### Notes on the harness, so the numbers are not misread

- `loadMs: 45016` for `collab-demo` in `report.json` is **my capture script's
  fault, not the app's**: it waited for `networkidle`, and the app holds an open
  Server-Sent-Events connection (`GET /events?user=A`) that never goes idle. The
  page rendered and the journey drove normally; treat that field as void.
- Screenshots were taken with the Playwright already installed in the clone,
  because the in-session browser pane could not composite frames
  (`Screenshot timed out after 5s: the Browser pane is not displayed`). The DOM
  reads, console reads and network reads in this log came from the in-session
  browser; the PNGs came from Playwright. Both drove the same running servers.

## Defect ledger

Open defects, most-impactful first. A defect is only listed once it has a
reproduction; a hunch is not a defect.

| # | Severity | Journey | Reproduction | Status |
|---|----------|---------|--------------|--------|
| D1 | Critical | J1 | On Windows 11 / Node v22.22.2, from a fresh clone: `npm ci` → `npx playwright install chromium` → `npx remotion browser ensure` (all exit 0, the last printing `Has browser at …\node_modules\.remotion\chrome-headless-shell\win64\chrome-headless-shell-win64\chrome-headless-shell.exe`) → `npm run render:example` exits 1 with `Failed to launch the browser process! Error: spawn <that same path> ENOENT`. The file is present (202,939,392 bytes, mode `-rwxr-xr-x`) and runs standalone: `--version` prints `Google Chrome for Testing 149.0.7790.0`, exit 0. Reproduced in Git Bash and PowerShell. Scope: Windows only — `.github/workflows/ci.yml` runs the same render on `ubuntu-latest` and is green (run 30963804165). Impact: the README's "renders immediately — no app needed" quickstart, the first thing a stranger types, is a dead end on Windows, and the failure message points only at an upstream Remotion troubleshooting URL. | OPEN |
| D2 | Major | J2 | Open `npm run studio` at `WT-NodeRoom`, frame 0, 1280×900. The player canvas paints **solid white** while the source frame `public/wt/NodeRoom/00.png` is a dark page. Not a load race: after a 15s wait the image reports `complete: true, naturalWidth: 2560`, the caption text is in the DOM, and there are zero console errors — the canvas is still white (`evidence/remotion-studio-desktop.png`). Scrubbing to 00:13.12 renders correctly (`evidence/remotion-studio-seek12s.png`), so only the opening is affected. Root cause, in code this repo owns: `src/Walkthrough.jsx:164` gives the frame container `background: "#fff"`, `:168` renders the current frame at `opacity: fadeIn`, and `:137` sets `fadeIn = interpolate(lf, [0, 11], [0, 1])` — so for the first 11 frames of step 0, where `prevImg` is `null` (`:136`, `prev` is undefined at step 0), the white container background is the only thing painted. Impact: every clip this tool produces opens on a ~0.37s white flash, and a looping README GIF re-flashes it on every loop — against the repo's own `loop_etiquette` rubric dimension. | OPEN |
| D3 | Minor | J2 | Remotion Studio at 1280×900: 8 of 29 `<button>` elements have no accessible name (no text, no `aria-label`); at 390×844, 6 of 21. Measured in `evidence/report.json` (`btnsNoName`). Keyboard navigation itself is fine — all 8 sampled tab stops are reachable and every one shows a focus ring. Scope: this is Remotion's own studio chrome, not code in this repo, so it is logged rather than owned. | OPEN (third-party) |
| D4 | Minor | J2 | Remotion Studio at 390×844: the transport bar clips at the right edge — the zoom control is cut mid-word (`evidence/remotion-studio-mobile.png`), and the player canvas is blank at frame 0 for the same reason as D2. The document itself does not overflow (`scrollWidth === clientWidth === 390`), so condition 4 still holds. Scope: third-party studio chrome. | OPEN (third-party) |

## Iterations

_none yet — Wave 1 is baseline only._
