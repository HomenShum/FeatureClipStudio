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

Corrected 2026-08-13 (see [PROMOTION_LOG.md](PROMOTION_LOG.md#correction--2026-08-13)):
`report.json` is a committed **output** whose **producer was never committed** —
the capture script ran from a scratch directory outside the clone, and its
`shot` paths still point there. The gate counts a measurement as an artifact
only when the output *and* a re-runnable producer are both in the repo, so a
number measured with a tool that was not retained is UNVERIFIED, not PASS.
Every row below that rests on `report.json` alone therefore reads UNVERIFIED,
and each such row states that reason in place rather than borrowing it from
another document.

Superseded 2026-08-13 by Iteration 4 for rows 3–10: they no longer rest on
`report.json` at all. Their producer is `npm run audit:ui`
([`../audit-ui.mjs`](../audit-ui.mjs)), committed and runnable from a fresh
clone, and their outputs are [`evidence/audit-ui.json`](evidence/audit-ui.json)
with a `.before.json` twin from the same script run against the pre-fix tree.
`report.json` is left in place as the historical Wave 1 measurement; nothing
below cites it as evidence any more.

| # | Condition | Status | Evidence / reason |
|---|-----------|--------|-------------------|
| 1 | Journeys succeed end-to-end in a real browser | FAIL | J2 and J3 succeed in a browser ([`evidence/remotion-studio-seek12s.png`](evidence/remotion-studio-seek12s.png), [`evidence/collab-demo-desktop.png`](evidence/collab-demo-desktop.png)). **J1 succeeded in Iteration 1** — `npm run render:example` exit 0 both before and after the fix, 5.8 MB MP4, frame 0 committed at [`evidence/opening-frame/example-mp4-frame000.png`](evidence/opening-frame/example-mp4-frame000.png) — but D1 says J1 holds only from a short checkout path, so J1 is banked with that condition attached rather than unconditionally. **J5 has still never been run**: it needs a `GEMINI_API_KEY`, and no wave here creates secrets. Not all journeys pass, so the condition does not hold. |
| 2 | No critical or major usability defect open | FAIL | **D2 (major — every clip opened on a white flash) is FIXED** in Iteration 1 and re-proved in rendered output; see condition 12. **D1 (critical — quickstart render fails on Windows) is diagnosed and documented, not repaired.** It is Windows MAX_PATH: measured 2026-08-13, the same 202,939,392-byte `chrome-headless-shell.exe` spawns at exit 0 from a 259-character path and returns ENOENT from a 260-character one, with `existsSync` true on both sides. That is why it reproduced for one person and not another — the variable was the length of the clone directory, and nothing else. The quickstart now states the constraint, but the tool still fails on a long checkout, so the row stays FAIL. **Iteration 2 (2026-08-13) reproduced D1 on demand and repaired the message, not the limit.** The same clone renamed from a 149-character directory to a 172-character one goes exit 0 → exit 1 and back, so the variable is settled. Commands that start Remotion route through `run-remotion.mjs`, which on a failed run checks whether the browser Remotion named is present *and* past the limit and, if so, prints a message naming MAX_PATH, both lengths, and the fix: `grep -c MAX_PATH` over the quickstart's output at a 172-character checkout is **0 before, 1 after** ([`evidence/max-path/render-example.before.log`](evidence/max-path/render-example.before.log), [`evidence/max-path/render-example.after.log`](evidence/max-path/render-example.after.log)). Guarded by a committed, re-runnable producer, `npm run probe:maxpath` ([`../probe-max-path.mjs`](../probe-max-path.mjs)), confirmed exit 1 on the pre-fix tree. **Iteration 3 (2026-08-13) repaired that wiring after an independent re-run refuted it**: `iterate.mjs` was a ninth caller nobody had listed — `node iterate.mjs --comp WT-NodeRoom --out out/it.mp4` from a 188-character checkout exited 1 with `grep -c MAX_PATH` **0**, the unrepaired experience — and the guard could not see it because it consulted a hardcoded list of three filenames. The guard now scans every runnable tracked file instead: 45 files, 0 invocations outside the handler, and it fails naming `iterate.mjs:66` when the pre-fix sources are restored. Same command from the same 188-character checkout after the repair: exit 1, `grep -c MAX_PATH` **1**. **The row still stays FAIL**: D1 is downgraded from Critical to Major, not closed. The quickstart still cannot render from a deep checkout on Windows, and a defect that explains itself is still a defect. |
| 3 | Mobile and desktop both intentional | **PASS** | Iteration 4. The `@media` count that decided this row against the repo in Wave 1 is no longer zero: `examples/collab-demo/public/index.html` now carries a `max-width: 480px` block whose every declaration answers a measured defect, not a preference — 16px input font (below it iOS Safari zooms the page on focus; was 14px), ≥44px controls (was 43px on all three), a wrapped control row, and the identity line given its own row so it does not reflow the header when JavaScript fills it in. Measured at 390 / 768 / 1280 by a committed producer, `npm run audit:ui` ([`../audit-ui.mjs`](../audit-ui.mjs)): control heights 43/43/43 → **46/47/47** at 390, input font 14 → **16**, `colorScheme` `normal` → **dark**, overflow 0 at every width. Receipts [`evidence/audit-ui.before.json`](evidence/audit-ui.before.json) → [`evidence/audit-ui.json`](evidence/audit-ui.json); pictures [`evidence/ui/collab-390.png`](evidence/ui/collab-390.png), [`collab-768.png`](evidence/ui/collab-768.png), [`collab-1280.png`](evidence/ui/collab-1280.png). Remotion Studio remains third-party chrome this repo does not author (D3, D4) and is outside the row. |
| 4 | No horizontal overflow at supported widths | **PASS** | Iteration 4. `documentElement.scrollWidth - clientWidth === 0` at **390, 768 and 1280** — `widths[*].overflowX` in [`evidence/audit-ui.json`](evidence/audit-ui.json). What changed since Wave 1 is not the number, which was already right, but that a producer now exists: `npm run audit:ui` re-measures it from a fresh clone and exits non-zero if it moves. The Wave 1 correction asked for exactly this and nothing less. Caveat unchanged and still logged as D4: Remotion Studio's own transport bar clips internally at 390px without the document scrolling. |
| 5 | Loading/empty/success/error/agent-running designed | **PASS** | Iteration 4. All five observed, and the two Wave 1 could not reach were reached by provoking them rather than waiting for them. **Loading:** `POST /mutate` held 400ms by the probe, because on loopback the optimistic row reconciles in ~3ms and the state cannot be photographed at all — the "saving" row with its spinner is then visible for the full hold ([`evidence/ui/state-loading.png`](evidence/ui/state-loading.png)). **Error:** `POST /mutate` aborted at the network layer. Pre-fix the card vanished and the page said nothing — `[role=alert],[role=status]` matched nothing, `liveRegions: 0`, and the typed text was destroyed. Now: *Could not save “This add will fail” — the request did not reach the server. Your text is back in the box; try Add again.*, in a `role="status"` line, with the text handed back ([`evidence/ui/state-error.png`](evidence/ui/state-error.png)). Empty, success and agent-running captured alongside as [`state-empty.png`](evidence/ui/state-empty.png), [`state-success.png`](evidence/ui/state-success.png), [`state-agent-running.png`](evidence/ui/state-agent-running.png). |
| 6 | Keyboard and basic accessibility pass | **PASS** | Iteration 4, and measured the way Wave 1's correction said it had to be. **Distinct controls, not Tab presses:** the walk starts from a blurred document and records unique elements — `add-input → add-btn → agent-btn`, all three, on the untouched page. **Focus rings as a difference:** each control's computed style while focused is compared against the style that same element carries at rest, so a permanent `box-shadow` can no longer be read as a focus ring; all three differ (`journey.focusRings`). **Independent audits:** axe-core 4.13.0 **2 violations → 0** (`landmark-one-main`, `region` over `#add-input` and `#board`), 27 → **35** passes; Lighthouse 13.4.1 accessibility **0.98 → 1.00** on mobile and desktop. **Contrast, where axe declined to judge:** it returns five text nodes `incomplete` over the gradient background, so the ratios were measured from painted pixels — hide the element, screenshot the box, average with ffmpeg — giving 16.5 / 6.34 / 6.25 / 6.41 / 15.65 against a 4.5 requirement (`journey.contrast`). Also fixed here: the input had no accessible name at all, and the agent's streamed output was announced to nobody (`liveRegions: 0` → 1). Receipts [`evidence/audit-ui.before.json`](evidence/audit-ui.before.json), [`evidence/audit-ui.json`](evidence/audit-ui.json), [`evidence/axe.before.json`](evidence/axe.before.json), [`evidence/axe.json`](evidence/axe.json). |
| 7 | Web Interface Guidelines: no major unresolved | **PASS** | Iteration 4. A review, written down: [`WIG_REVIEW.md`](WIG_REVIEW.md), against the guidelines fetched from `https://vercel.com/design/guidelines` on 2026-08-13, section and item names verbatim. Ten major findings, each with the guideline it violates and a DOM measurement or screenshot, all ten fixed and re-proved: reduced motion ignored (`0.18s`/`0.08s` under `prefers-reduced-motion: reduce` → `0s`/`0s`); a loading button run by a 4.5s stopwatch instead of by the agent's actual state; a silent failed save that also destroyed the user's text; no live region and no `main` landmark; 14px input and 43px targets on a phone; a placeholder used as a label; `color-scheme: normal` on a dark page; JavaScript-filled layout costing 0.0241 CLS; `aria-label` on a role-less div. **Not a laundered Lighthouse score** — Lighthouse rated this page 0.98/1.00 while every one of those was true, which is the reason the two conditions are separate. Minor findings accepted with reasons, and one left explicitly OPEN (44px targets at 768, whose correct selector is `pointer: coarse` — a rule the probe's contexts never match would be a mechanism nothing exercises). |
| 8 | Web-quality audit: no major unresolved | **PASS** | Iteration 4. Both toolchains run against the running surface, output and command committed. **Lighthouse 13.4.1**, mobile and desktop: accessibility **0.98 → 1.00**, best-practices **0.96 → 1.00**, SEO **0.90 → 1.00**, performance **1.00**; LCP **1067ms** mobile / **284ms** desktop, TBT **0ms**, CLS **0.0241 → 0.0035** mobile / 0.0003 desktop. **axe-core 4.13.0**: **2 violations → 0**, 35 passes, one `incomplete` remaining (`color-contrast` over the gradient) resolved by pixel measurement in row 6. Receipts: [`evidence/lighthouse-mobile.json`](evidence/lighthouse-mobile.json), [`evidence/lighthouse-desktop.json`](evidence/lighthouse-desktop.json), [`evidence/axe.json`](evidence/axe.json), with `.before.json` twins beside each. Producer: `npm run audit:ui`, which shells all three commands and records them in the receipt's `commands` key. Remaining Lighthouse sub-100 rows are named and accepted in [`WIG_REVIEW.md`](WIG_REVIEW.md): `unminified-css`/`unminified-javascript` (the demo is deliberately one readable file with no build step), `bf-cache` (Lighthouse itself labels both reasons "Not actionable"; `no-store` is what stops two capture panes serving each other stale HTML), and two insights that describe a localhost Node server rather than the page. |
| 9 | No unexplained console errors or failed requests | **PASS** | Iteration 4. **A real failed request was found here, and it was not found by the Playwright probe.** Every load asked for `/favicon.ico`, the server answered 404, and Lighthouse logged it — `errors-in-console` scored **0** on both form factors. The Playwright counters read `consoleErrors: []` and `failedRequests: []` at all three widths *both before and after*, because a headless Playwright page never requests a favicon at all; so this row does not rest on them alone, and `npm run audit:ui` now asserts Lighthouse's `errors-in-console` row as well. Fixed with `<link rel="icon" href="data:," />`: `errors-in-console` **0 → 1**, best-practices 0.96 → 1.00. The Wave 1 `failedRequests` entry that muddied this row is gone at the root — the probe waits on `domcontentloaded` and a rendered selector, never `networkidle`, which could never fire against this app's open SSE stream and timed out the capture's own navigation. Receipts: [`evidence/audit-ui.json`](evidence/audit-ui.json) (`widths[*].consoleErrors`, `failedRequests`), [`evidence/lighthouse-mobile.json`](evidence/lighthouse-mobile.json). |
| 10 | Performance does not obstruct interaction | **PASS** | Iteration 4, and it is interaction that was timed, not only load. **Optimistic paint 56ms** — measured against a `POST /mutate` deliberately held 400ms, so the row provably appears before the server answers rather than merely quickly. **Agent first paint 83ms** from click to the first streamed card; the run completes in ~3.6s, which is the server's own five 700ms steps and is paced by design, not by the interface. **Load:** 310ms at 390 (cold), 88ms and 89ms at 768 and 1280; Lighthouse LCP 1067ms mobile / 284ms desktop, **TBT 0ms**, CLS 0.0035. The probe asserts each of these and fails the build if they regress — CLS at **0.02**, five times tighter than the Core Web Vitals boundary and a threshold the pre-fix tree did not meet (0.0241). `journey.*Ms` in [`evidence/audit-ui.json`](evidence/audit-ui.json). |
| 11 | Tests and build green | FAIL | Moved, but not far enough to flip. Iteration 1 added `npm run probe:opening` — the first committed gate here that actually *runs* the renderers and exits non-zero on a rendered-output property (exit 1 pre-fix, exit 0 post-fix). It is one probe over three compositions, not a test suite, and `package.json` still has no `test` script; `npm run check` walks the repo and parses every file it ships plus every doc citation, and still executes nothing (2026-08-13: 36/36 JavaScript files, 36/36 tour steps and 34/34 prose citations, exit 0). The build analogue, `npm run render:example`, **exited 0 here** (5,777,972-byte MP4) where Wave 1 saw exit 1 on the same OS and Node; that difference is settled as of 2026-08-13 — Windows MAX_PATH, see D1 — so what remains open is the test suite, not the platform. Iteration 2 added a second executing gate, `npm run probe:maxpath`, which re-measures the 260-character boundary on the machine it runs on and asserts that nothing outside `run-remotion.mjs` starts Remotion; it runs in CI and was confirmed exit 1 on the pre-fix tree. (Iteration 2 worded this row as "all eight commands that start Remotion" — there were nine, and the check it described was a hardcoded list. Both are repaired in Iteration 3; the count is deliberately gone, because a number in a document cannot notice a tenth caller.) Two probes are not a test suite and `package.json` still has no `test` script, so the row does not move. Counter-evidence recorded honestly: GitHub Actions CI is green on ubuntu-latest (run 30963804165, success). |
| 12 | Verified in the rendered app, not inferred from code | **PASS** | Iteration 1 made one improvement — D2, the opening white flash — and verified it in rendered output twice, never in code. Producer committed and re-runnable from a clone: `npm run probe:opening` ([`../probe-opening-frame.mjs`](../probe-opening-frame.mjs)). Outputs committed: [`evidence/opening-frame.before.json`](evidence/opening-frame.before.json) (exit 1, 90.4% / 22.8% of pixels differing on two of three renderers) and [`evidence/opening-frame.json`](evidence/opening-frame.json) (exit 0, 0.0% on all three), with the stills each receipt names under [`evidence/opening-frame/`](evidence/opening-frame/). Then in the artifact a stranger holds rather than only in the studio: frame 0 of the `npm run render:example` MP4 went from mean RGB(247,244,247) ([`evidence/opening-frame/before/example-mp4-frame000.png`](evidence/opening-frame/before/example-mp4-frame000.png)) to RGB(24,23,26) ([`evidence/opening-frame/example-mp4-frame000.png`](evidence/opening-frame/example-mp4-frame000.png)). The pre-fix numbers come from running that same committed producer against the untouched tree, so the check is confirmed failing before the fix rather than only after. |

**Status: NOT PROMOTED** — 9/12 PASS. (Wave 1 first claimed 3/12; conditions 4, 6
and 9 were corrected to UNVERIFIED on 2026-08-13 — see
[PROMOTION_LOG.md](PROMOTION_LOG.md#correction--2026-08-13) — leaving 0/12.
Iteration 1 on 2026-08-13 fixed D2 and moved condition 12 to PASS. Iteration 4 on
2026-08-13 ran the two audits conditions 7 and 8 turn on, wrote the committed
producer the Wave 1 correction asked for, fixed ten major interface defects it
found, and moved conditions 3, 4, 5, 6, 7, 8, 9 and 10 to PASS.)

Conditions 2 and 11 stay FAIL on purpose. D2 is fixed and D1 is now explained —
Windows MAX_PATH — but explaining a defect and documenting the clone path it needs
is not the same as the tool working from any directory.
`npm run render:example` exited 0 here and there is now one executable gate, but
one probe is not a test suite. Both rows say so in place.

Iteration 2 (2026-08-13) moved neither row and claims no new PASS. It reproduced
D1 on demand, proved the variable was the clone path length, and made the tool
say MAX_PATH instead of blaming a missing file — a Critical defect downgraded to
Major, plus a second executing gate. Neither is a condition. The scorecard stayed
**1/12** through Iteration 3.

Iteration 4 (2026-08-13) moved eight rows, and none of them for D1's reasons.
It ran the two audits conditions 7 and 8 name, reviewed the surface against the
Web Interface Guidelines by hand, and — the part the Wave 1 correction actually
asked for — left `npm run audit:ui` behind, a committed producer that re-measures
every one of those rows from a clone and exits non-zero if any of them moves. It
scored **24 of 52 checks on the pre-fix tree and 52 of 52 after**, so every one
of these rows is a check that was confirmed failing before it was fixed.

Conditions **1, 2 and 11 still FAIL, deliberately.** D1 is still open: the
quickstart still cannot render from a deep Windows checkout, only explain itself
there. J5 has still never been run — it needs a `GEMINI_API_KEY` and no wave here
creates secrets. And `package.json` still has no `test` script; there are now
three executing gates (`probe:opening`, `probe:maxpath`, `audit:ui`) and a
growing pile of probes is still not a test suite. Promoting on 9/12 is not
available, and lowering the last three to reach 12 is the failure the gate exists
to prevent.
