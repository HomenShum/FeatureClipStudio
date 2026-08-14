# Web Interface Guidelines review — the collab-demo surface

Condition 7 of the PROMOTION gate. **This is a review, not a tool run.** A
Lighthouse score is not a Web Interface Guidelines review and cannot be
substituted for one: Lighthouse rated this page 0.98 accessibility and 1.00
performance while it silently threw away a card the user had typed, animated at
full speed for a reader who had asked their operating system for less motion,
and disabled a button on a stopwatch instead of on the state of the work.
Those are the findings below. Lighthouse and axe are reported separately, under
condition 8, in [PRODUCT_GOAL.md](PRODUCT_GOAL.md).

- **Surface reviewed:** `examples/collab-demo/` served at
  `http://localhost:4912/?user=A` — the runnable worked example a stranger meets
  (journey J3), and the only rendered surface this repository authors. Remotion
  Studio is third-party chrome; its defects are logged as D3 and D4 in
  [PROMOTION_LOG.md](PROMOTION_LOG.md) rather than owned here.
- **Guidelines:** fetched from `https://vercel.com/design/guidelines` on
  2026-08-13. The page was reachable; the checklist below uses its section and
  item names verbatim.
- **Widths:** 390 × 844, 768 × 1024, 1280 × 900.
- **Evidence:** every finding names a DOM measurement in
  [`evidence/audit-ui.before.json`](evidence/audit-ui.before.json) (pre-fix) and
  [`evidence/audit-ui.json`](evidence/audit-ui.json) (post-fix), or a screenshot
  under [`evidence/ui/`](evidence/ui/). Both files are written by the committed,
  re-runnable producer `npm run audit:ui` ([`../audit-ui.mjs`](../audit-ui.mjs)),
  which exits non-zero on any of these regressing. Pre-fix: **24 of 52** checks
  passed. Post-fix: **52 of 52**.

## Major findings — all fixed and re-proved

| # | Guideline | What was observed, and how | Now |
|---|-----------|----------------------------|-----|
| W1 | Animations → **Honor `prefers-reduced-motion`** | With the preference set to `reduce`, the page animated exactly as before: `.card` reported `animation-duration: 0.18s`, buttons `transition-duration: 0.08s, 0.15s, 0.15s`, and the saving spinner and streaming caret ran on infinite loops. No `@media (prefers-reduced-motion)` block existed. `journey.reducedMotion` | `0s` / `0s`, spinner and caret still. The information is unchanged; only the movement is gone. |
| W2 | Interactions → **Loading buttons**; Content → **All states designed** | "🤖 Run agent" was disabled by a fixed `setTimeout(…, 4500)` — a guess about how long someone else's work takes — and its label never changed. Measured while the agent was streaming: `{disabled: true, text: "🤖 Run agent", aria-busy: null}`, i.e. nothing on the button said it was working. Measured after the agent had finished (`agentDoneMs` 4069, against a 4500ms timer): still `{disabled: true}`, so the button was dead for the ~430ms remaining on a stopwatch that had nothing to do with the work, and a Tab walk in that window could not reach it at all. `journey.agentBtnWhileRunning`, `journey.agentBtnAfter` | Driven by the broadcast that owns the truth: `{disabled: true, text: "🤖 Working…", aria-busy: "true"}` while the server's card is streaming, `{disabled: false}` the moment it stops. The timer that remains only covers a server that never answers, so a dead server cannot disable the button forever. [`ui/state-agent-running.png`](evidence/ui/state-agent-running.png) |
| W3 | Content → **No dead ends**; Copywriting → **Error messages guide the exit** | A failed add vanished in silence. Reproduced by aborting `POST /mutate` at the network layer: the optimistic row was removed, and the page contained **no message at all** — `[role=alert], [role=status]` matched nothing, `liveRegions: 0` — while the text the user had typed was destroyed (`input.value` = `""`, and `addCard()` had already cleared it). The user is left with an empty box, no card, and no statement that anything failed. `journey.errorState` | A `role="status"` line under the controls: *Could not save “This add will fail” — the request did not reach the server. Your text is back in the box; try Add again.* The text is handed back to the input (`textReturnedToInput: "This add will fail"`), and no phantom card survives (`cardsShowingFailedText: 0`). [`ui/state-error.png`](evidence/ui/state-error.png) |
| W4 | Interactions → **Announce async updates**; Content → **Semantics before ARIA**, **Headings & skip link** | The page had no live region and no landmark around its own content: `liveRegions: 0`, `landmarks.main: 0`. The agent streams text into the board over several seconds and nothing announced it, so a screen-reader user was told nothing at all while the product's headline behaviour happened. axe agreed from the other side: `region` flagged `#add-input` and `#board` as content outside any landmark. `widths[*].landmarks`, `evidence/axe.before.json` | `<main>` wraps the controls and the board; the status line is the live region. axe `landmark-one-main` and `region` both clear. |
| W5 | Interactions → **Mobile input size** | The card input rendered at **14px** at 390px wide. Below 16px, iOS Safari zooms the whole page the moment the field is focused, and the reader has to pinch back out to reach the Add button next to it. `widths[0].controls["add-input"].fontPx` | 16px at ≤480px. |
| W6 | Interactions → **Match visual & hit targets** | All three controls measured **43px** tall at 390px, against the 44px minimum. `widths[0].controls` | 46px, 47px, 47px at ≤480px. |
| W7 | Forms → **Labels everywhere**, **Placeholders signal emptiness** | The input carried a placeholder and nothing else: no `<label>`, no `aria-label`, so it had no accessible name and the only hint disappeared as soon as the user typed. `widths[*].inputAccessibleName: null` | `aria-label="Card text"`; the placeholder stays as the hint it was always meant to be. |
| W8 | Design → **Set the appropriate color-scheme**, **Browser UI matches your background** | `getComputedStyle(document.documentElement).colorScheme` was `normal` on a page that is dark everywhere, so the browser drew its own parts — caret, scrollbars, autofill, native control chrome — for a light page. `widths[*].colorScheme` | `color-scheme: dark`. |
| W9 | Content → **Stable skeletons**; Performance → **No image-caused CLS** | The board was empty in the HTML and filled by JavaScript after first paint, and on a narrow screen the header subtitle wrapped onto a second line once `you are Ana` was written in. Everything below moved down. Lighthouse mobile CLS **0.0241**, culprit `body > div.wrap > div#board`. `evidence/lighthouse-mobile.before.json` | The empty state ships in the HTML and the identity gets its own line at ≤480px. CLS **0.0035**; the residual is the presence avatar, recorded below as an open minor. |
| W10 | Content → **Semantics before ARIA** | `<div id="presence" aria-label="Present collaborators">` — an `aria-label` on a `div` with no role. axe returns this as **incomplete** at `serious` impact rather than a violation, which means "not reliably exposed", and incomplete is not passing. `evidence/axe.before.json` | `role="group"`. axe's `aria-prohibited-attr` entry is gone. |

## Checked and holding — with the measurement, not an impression

- **Interactions → Keyboard works everywhere / Clear focus.** Tab from a blurred
  start reaches three *distinct* controls in DOM order —
  `add-input → add-btn → agent-btn` — and each one's focused computed style
  differs from the style the same element carries at rest. That comparison is
  the point: the earlier check counted `outline` **or** `box-shadow` on the
  focused element and could not tell a focus ring from a shadow the element
  always had. `journey.tabOrder`, `journey.focusRings`
- **Forms → Enter submits.** `keydown` on the input submits the card.
- **Interactions → URL as state / Deep-link everything.** `?user=A|B|C` selects
  the identity and is the documented way to open two panes.
- **Interactions → Optimistic updates.** Measured rather than assumed: with
  `POST /mutate` deliberately held for 400ms, the row is painted at **70ms** —
  before the server has answered — and reconciles to the real id with no
  flicker. `journey.optimisticMs`, `journey.mutateDelayMs`
- **Design → Minimum contrast.** axe declines to judge five text nodes on this
  page ("background color could not be determined due to a background
  gradient") and returns them `incomplete`. Resolved by measurement instead:
  each element is hidden, the box it occupied is screenshotted, ffmpeg averages
  the pixels actually painted behind it, and the WCAG 2.1 ratio is computed
  against the element's own colour. `h1` 16.5, `.sub` 6.34, `#who` 6.25,
  `footer` 6.41, card meta 15.65 — all against a 4.5 requirement.
  `journey.contrast`
- **Layout → Responsive coverage / No excessive scrollbars.**
  `scrollWidth - clientWidth` is 0 at 390, 768 and 1280.
- **Content → Redundant status cues.** The saving state carries a spinner *and*
  the word "saving"; the error carries a colour *and* a sentence. Neither
  depends on colour alone.
- **Content → Accurate page titles.** `document.title` becomes `Collab · Ana`,
  so two panes are distinguishable in a tab strip.
- **Content → Typographic quotes / Use the ellipsis character.** The strings
  added here use `“ ”` and `…`.
- **Interactions → Don't block paste, Don't block typing, Don't pre-disable
  submit.** Nothing intercepts the input; Add is never pre-disabled.

## Minor findings, accepted rather than fixed — with the reason

- **Match visual & hit targets at 768 and 1280.** The controls are 43px tall at
  those widths; the 44px rule is raised only below 480px. At 1280 the input is a
  mouse pointer's, but a 768px tablet in portrait is a touch device, so this is
  a real gap and is left **OPEN** rather than closed quietly. It is not fixed
  here because the correct selector is `pointer: coarse`, and a rule this
  probe's contexts never match would be a mechanism nothing exercises — the
  failure mode this repository has shipped before.
- **Performance → minification.** Lighthouse rates `unminified-css` and
  `unminified-javascript` at 0.5. This demo is deliberately one readable file
  with no build step, which is the thing it exists to teach; adding a bundler to
  raise a sub-score would cost the reader the artifact. Accepted.
- **bf-cache.** Lighthouse labels both reasons "Not actionable": the page is
  served `Cache-Control: no-store`, which is what stops two panes serving each
  other stale HTML mid-capture. Accepted.
- **Document request latency / network dependency tree.** Both describe a
  localhost Node server with no CDN in front of it. Not a property of the page.
- **The agent's own failure path is not exercised.** `runAgent()` gained a
  branch for a `POST /agent` that never lands, and a 10-second fallback that
  clears the busy state if no broadcast ever arrives. The error probe aborts
  `POST /mutate` only, so neither is observed running. No condition rests on
  them, but an unexercised branch is an unexercised branch.
- **Residual CLS 0.0035**, culprit `#presence`: the avatar row is empty until
  the first presence broadcast. Under the 0.02 the probe now enforces and far
  under the 0.1 "good" boundary; left as measured rather than padded.

## Not applicable, stated as decisions

Forms → password managers & 2FA, unsaved-changes prompts, spellcheck selection,
Windows `<select>` background, correct input modes beyond `type="text"`: this
surface has one text field and two buttons and no authentication.
Interactions → confirm destructive actions, clean drag interactions, tooltip
timing: nothing is destructive, draggable, or tooltipped.
Performance → preload/preconnect/subset fonts, large lists: there is no external
asset of any kind and the board is bounded at 200 cards server-side.
Content → locale-aware formats, shielding verbatim content from translation:
single-locale demo.

## How to re-run this review's evidence

    npm ci
    npx playwright install chromium
    npm run audit:ui                  # 52 checks, receipts under promotion/evidence/

The three external commands it shells, recorded in the receipt's `commands` key:

    npx --yes lighthouse@13.4.1 http://localhost:4912/?user=A --output=json --output-path=promotion/evidence/lighthouse-mobile.json --chrome-flags="--headless" --quiet
    npx --yes lighthouse@13.4.1 http://localhost:4912/?user=A --preset=desktop --output=json --output-path=promotion/evidence/lighthouse-desktop.json --chrome-flags="--headless" --quiet
    npx --yes @axe-core/cli@4.13.0 http://localhost:4912/?user=A --save promotion/evidence/axe.json
