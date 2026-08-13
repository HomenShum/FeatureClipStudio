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

| # | Condition | Status | Evidence / reason |
|---|-----------|--------|-------------------|
| 1 | Journeys succeed end-to-end in a real browser | FAIL | J2 and J3 succeed in a browser ([`evidence/remotion-studio-seek12s.png`](evidence/remotion-studio-seek12s.png), [`evidence/collab-demo-desktop.png`](evidence/collab-demo-desktop.png)). **J1 succeeded in Iteration 1** — `npm run render:example` exit 0 both before and after the fix, 5.8 MB MP4, frame 0 committed at [`evidence/opening-frame/example-mp4-frame000.png`](evidence/opening-frame/example-mp4-frame000.png) — but Wave 1's D1 failure was never explained, only unreproduced, so J1 is not banked. **J5 has still never been run**: it needs a `GEMINI_API_KEY`, and no wave here creates secrets. Not all journeys pass, so the condition does not hold. |
| 2 | No critical or major usability defect open | FAIL | **D2 (major — every clip opened on a white flash) is FIXED** in Iteration 1 and re-proved in rendered output; see condition 12. **D1 (critical — quickstart render fails on Windows) is still open.** It did not reproduce this wave on the same OS and Node (`npm run render:example` exit 0, twice), but nothing changed that would explain Wave 1's failure, so it is recorded as unreproducible rather than repaired. One open critical defect is one too many. |
| 3 | Mobile and desktop both intentional | UNVERIFIED | `collab-demo` renders correctly at 390×844 with 0px overflow ([`evidence/collab-demo-mobile.png`](evidence/collab-demo-mobile.png)) but `examples/collab-demo/public/index.html` contains **zero** `@media` queries — mobile is fluid-by-default, so I cannot show it was decided rather than inherited. The other surface a stranger meets, Remotion Studio, is third-party UI this repo does not author. Neither observation settles "intentional". |
| 4 | No horizontal overflow at supported widths | UNVERIFIED | `documentElement.scrollWidth - clientWidth === 0` on both surfaces at 1280×900 and 390×844 — four rows of `overflowX: 0` in [`evidence/report.json`](evidence/report.json). The output is committed; the tool that produced it is not, so nobody who clones this repo can re-run the check: **measured 0 overflow at 1280/390, probe not retained.** Caveat logged as D4: Remotion Studio's own transport bar clips internally at 390px without the document scrolling. |
| 5 | Loading/empty/success/error/agent-running designed | UNVERIFIED | Three of five observed and captured on `collab-demo`: empty ("No cards yet. Add one — it appears instantly here and live in the other pane."), success (committed card attributed to Ana), agent-running (streamed agent card). **Error and loading were never provoked**, so the set is not proven complete. |
| 6 | Keyboard and basic accessibility pass | UNVERIFIED | What [`evidence/report.json`](evidence/report.json) records on `collab-demo` is **six Tab presses, not six distinct controls**: the desktop `tabbed` array reads input → "Add" → input → "Add" → input → "Add" against `btnsTotal: 2`, i.e. focus cycling two or three unique controls, and that run never reached the "🤖 Run agent" button at all — it appears only in the mobile array. Each of the 6 stops did show a focus indicator, but the check counts `outline` **or** `box-shadow` and so cannot separate a focus-only ring from a shadow the element always carries. `btnsNoName: 0` is over 2 buttons; `imgsNoAlt: 0` is vacuous because `imgsTotal: 0`. `lang` set, one `h1`, viewport meta present. **Measured at 1280/390, probe not retained** — the script that wrote these fields is not in the repo, so the audit cannot be re-run from a clone. Third-party Remotion Studio is out of this row's scope and is logged as D3. |
| 7 | Web Interface Guidelines: no major unresolved | UNVERIFIED | No Web Interface Guidelines review was run in this wave. |
| 8 | Web-quality audit: no major unresolved | UNVERIFIED | No Lighthouse, axe, or Core Web Vitals audit was run in this wave. The `report.json` checks are hand-rolled basics, not an audit. |
| 9 | No unexplained console errors or failed requests | UNVERIFIED | The console half holds: `consoleErrors: []` on all four runs in [`evidence/report.json`](evidence/report.json). The network half does **not** read clean in that same file — both `collab-demo` runs carry a non-empty `failedRequests`: `goto: page.goto: Timeout 45000ms exceeded … navigating to "http://localhost:8930/?user=A", waiting until "networkidle"`. Stated in place, because "unexplained" is the word that decides this row: that entry is the harness failing, not the app. `collab-demo` holds an open Server-Sent-Events stream (`GET /events?user=A`), so `networkidle` never fires and the capture script's own navigation wait times out; the page had rendered and the journey drove normally (same cause as the void `loadMs: 45016`). Remotion Studio, which has no such stream, recorded `failedRequests: []` at both widths. So the failure is explained — but it is not re-checkable: **measured 0 console errors and 0 app-side request failures at 1280/390, probe not retained**, and the supporting "every request returned 2xx" reads (`POST /mutate → 200`, `POST /agent → 202`, `GET /events?user=A → 200`, `POST /presence → 200`) came from an in-session browser handle that no longer exists and was never a committed artifact. |
| 10 | Performance does not obstruct interaction | UNVERIFIED | Only page load was timed (Remotion Studio 1033ms desktop / 927ms mobile). No interaction latency was measured, and "does not obstruct" is a claim about interaction. Interactions did visibly complete, but an untimed impression is not evidence. |
| 11 | Tests and build green | FAIL | Moved, but not far enough to flip. Iteration 1 added `npm run probe:opening` — the first committed gate here that actually *runs* the renderers and exits non-zero on a rendered-output property (exit 1 pre-fix, exit 0 post-fix). It is one probe over three compositions, not a test suite, and `package.json` still has no `test` script; `npm run check` is still fifteen chained `node --check` calls that parse and execute nothing (exit 0). The build analogue, `npm run render:example`, **exited 0 here** (5.8 MB MP4, twice) where Wave 1 saw exit 1 on the same OS and Node — unexplained, so the platform question is open, not settled. Counter-evidence recorded honestly: GitHub Actions CI is green on ubuntu-latest (run 30963804165, success). |
| 12 | Verified in the rendered app, not inferred from code | **PASS** | Iteration 1 made one improvement — D2, the opening white flash — and verified it in rendered output twice, never in code. Producer committed and re-runnable from a clone: `npm run probe:opening` ([`../probe-opening-frame.mjs`](../probe-opening-frame.mjs)). Outputs committed: [`evidence/opening-frame.before.json`](evidence/opening-frame.before.json) (exit 1, 90.4% / 22.8% of pixels differing on two of three renderers) and [`evidence/opening-frame.json`](evidence/opening-frame.json) (exit 0, 0.0% on all three), with the stills each receipt names under [`evidence/opening-frame/`](evidence/opening-frame/). Then in the artifact a stranger holds rather than only in the studio: frame 0 of the `npm run render:example` MP4 went from mean RGB(247,244,247) ([`evidence/opening-frame/before/example-mp4-frame000.png`](evidence/opening-frame/before/example-mp4-frame000.png)) to RGB(24,23,26) ([`evidence/opening-frame/example-mp4-frame000.png`](evidence/opening-frame/example-mp4-frame000.png)). The pre-fix numbers come from running that same committed producer against the untouched tree, so the check is confirmed failing before the fix rather than only after. |

**Status: NOT PROMOTED** — 1/12 PASS. (Wave 1 first claimed 3/12; conditions 4, 6
and 9 were corrected to UNVERIFIED on 2026-08-13 — see
[PROMOTION_LOG.md](PROMOTION_LOG.md#correction--2026-08-13) — leaving 0/12.
Iteration 1 on 2026-08-13 fixed D2 and moved condition 12 to PASS.)

Conditions 2 and 11 stay FAIL on purpose. D2 is fixed but D1 is not closed — it
did not reproduce this wave, and an unreproducible defect is not a repaired one.
`npm run render:example` exited 0 here and there is now one executable gate, but
one probe is not a test suite. Both rows say so in place.
