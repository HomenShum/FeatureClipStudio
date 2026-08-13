# Product goal — FeatureClipStudio

## Who opens this, and what they are trying to finish

Someone has just finished building a piece of software and now has to show it to
people who were not in the room — a reviewer, a customer, a hiring manager, a
teammate on another continent. The obvious move is to paste a picture of the
finished screen into the README, and that picture always fails the same way: it
shows the ending. A stranger looking at it cannot tell where the person clicked,
what the screen looked like before anything happened, whether the thing paused
and thought for four seconds, or whether the answer on screen was real or typed
in by hand. So the builder ends up re-explaining the software in a live call,
every time, to every new person. They arrive here wanting the explaining to
happen without them in the room. What they walk away holding is a short silent
video and an animated image file, roughly ten seconds long, that follow the
whole sequence — the empty screen, the pointer sliding to the button, the click,
the waiting, the result arriving — with a plain sentence captioned under each
step, which they can drop into a README or a message and let it do the talking.
Because the sequence is written down in a checked-in file rather than performed
by hand, re-running it after the software changes produces a new video from the
new software, which also means the video stops working the moment the software
does. (Technically: a Playwright capture script drives the app, Remotion renders
the frames with a cursor and camera over them, and ffmpeg encodes the GIF.)

## The gate

This repo is judged by the twelve-condition PROMOTION gate, which lives in one
place and is not restated here:

**https://github.com/HomenShum/NodeKit/blob/main/templates/promotion/GATE.md**

Gate variant: `reduced` <!-- reduced = library/CLI judged on its demo
surface and quickstart; see the GATE's reduced-gate section -->

Scoring vocabulary is PASS / FAIL / **UNVERIFIED**, and UNVERIFIED is never PASS.

## Canonical journeys

The work queue lives in [PRODUCT_JOURNEYS.md](PRODUCT_JOURNEYS.md). A journey
without browser evidence is unfinished, however green the tests are.

## Loop state

Every iteration is recorded in [PROMOTION_LOG.md](PROMOTION_LOG.md) — journey
exercised, defect fixed, evidence path, conditions newly passing. Loop state
lives in git, never in an agent's memory, so any agent can resume the loop cold.

## Current scorecard

Measured 2026-08-13 on Windows 11 / Node v22.22.2 / npm 10.9.7 / ffmpeg 6.0,
against a fresh `git clone` at `053cc86`. Raw numbers:
[`evidence/report.json`](evidence/report.json).

| # | Condition | Status | Evidence / reason |
|---|-----------|--------|-------------------|
| 1 | Journeys succeed end-to-end in a real browser | FAIL | J2 and J3 succeed in a browser ([`evidence/remotion-studio-seek12s.png`](evidence/remotion-studio-seek12s.png), [`evidence/collab-demo-desktop.png`](evidence/collab-demo-desktop.png)). **J1, the README's headline quickstart, does not**: `npm run render:example` exits 1 with `spawn …chrome-headless-shell.exe ENOENT`. Not all journeys pass, so the condition does not hold. |
| 2 | No critical or major usability defect open | FAIL | Two open defects with reproductions in [PROMOTION_LOG.md](PROMOTION_LOG.md): D1 (quickstart render fails on Windows, critical) and D2 (every clip opens on a white flash, major). |
| 3 | Mobile and desktop both intentional | UNVERIFIED | `collab-demo` renders correctly at 390×844 with 0px overflow ([`evidence/collab-demo-mobile.png`](evidence/collab-demo-mobile.png)) but `examples/collab-demo/public/index.html` contains **zero** `@media` queries — mobile is fluid-by-default, so I cannot show it was decided rather than inherited. The other surface a stranger meets, Remotion Studio, is third-party UI this repo does not author. Neither observation settles "intentional". |
| 4 | No horizontal overflow at supported widths | PASS | `documentElement.scrollWidth - clientWidth === 0` on both surfaces at 1280×900 and 390×844 — four measurements in [`evidence/report.json`](evidence/report.json) (`overflowX: 0`). Caveat logged as D4: Remotion Studio's own transport bar clips internally at 390px without the document scrolling. |
| 5 | Loading/empty/success/error/agent-running designed | UNVERIFIED | Three of five observed and captured on `collab-demo`: empty ("No cards yet. Add one — it appears instantly here and live in the other pane."), success (committed card attributed to Ana), agent-running (streamed agent card). **Error and loading were never provoked**, so the set is not proven complete. |
| 6 | Keyboard and basic accessibility pass | PASS | On the surface this repo authors (`collab-demo`, both widths): all 6 tab stops reached, 6/6 with a visible focus ring, 0 buttons without an accessible name, 0 images without `alt`, `lang` set, one `h1`, viewport meta present ([`evidence/report.json`](evidence/report.json)). Scope stated: on third-party Remotion Studio, keyboard nav also passes (8/8 tab stops with focus rings) but 8 of 29 desktop buttons have no accessible name — logged as D3, not this repo's code. |
| 7 | Web Interface Guidelines: no major unresolved | UNVERIFIED | No Web Interface Guidelines review was run in this wave. |
| 8 | Web-quality audit: no major unresolved | UNVERIFIED | No Lighthouse, axe, or Core Web Vitals audit was run in this wave. The `report.json` checks are hand-rolled basics, not an audit. |
| 9 | No unexplained console errors or failed requests | PASS | Zero console errors on both surfaces at both widths ([`evidence/report.json`](evidence/report.json), `consoleErrors: []` ×4). Every request during the driven J3 journey returned 2xx — `POST /mutate → 200`, `POST /agent → 202`, `GET /events?user=A → 200`, `POST /presence → 200`. Remotion Studio: zero failed requests over a 15s load. |
| 10 | Performance does not obstruct interaction | UNVERIFIED | Only page load was timed (Remotion Studio 1033ms desktop / 927ms mobile). No interaction latency was measured, and "does not obstruct" is a claim about interaction. Interactions did visibly complete, but an untimed impression is not evidence. |
| 11 | Tests and build green | FAIL | There is no test suite — `package.json` has no `test` script, and `npm run check` is `node --check` (a syntax parse that executes nothing). It exits 0. The build analogue, `npm run render:example`, exits 1 on Windows, reproduced in both Git Bash and PowerShell. Counter-evidence recorded honestly: GitHub Actions CI is green on ubuntu-latest (run 30963804165, success) — the failure is platform-scoped, not universal. |
| 12 | Verified in the rendered app, not inferred from code | UNVERIFIED | Wave 1 is a baseline: no improvements were made, so this condition has no subject yet. It cannot be PASS by vacuum. |

**Status: NOT PROMOTED** — 3/12 PASS.
