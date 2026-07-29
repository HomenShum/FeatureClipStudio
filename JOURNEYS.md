# Journey map — who arrives, why, and what they must see

Written 2026-07-28 from measured surveys (`survey-journeys.mjs`, `survey-deck.mjs`,
`probe-room-routes.mjs`, `journey-coverage.mjs`), not from memory of the apps.
Every surface below was loaded and counted; every "gated" was observed, not assumed.

**The unit of coverage is a persona journey — trigger → workflow → outcome — not a
control count.** A clip per journey. A journey that cannot complete without auth
ends honestly at its gate and says so.

---

## NodeRoom

| # | Persona | Trigger (why they arrived) | Journey | Surfaces | Status |
|---|---|---|---|---|---|
| R1 | Evaluator / buyer | "Prove agents won't clobber my spreadsheet" | #story drills: no-clobber → lease → stale-write → approve | `#story` (8570px, 17 controls) | **SHOT** — 24s, 6/21 elements |
| R2 | Room owner | "Collaborators + agents, without giving away seats" | hydrated landing → Create a room → "How should NodeAgent edits land?" | create dialog | **SHOT** 2026-07-28 — 17s fresh-user clip (youtu.be/qpzHP5-pWvw). Filming it found and fixed the dialog-behind-scrim regression. |
| R3 | Invited collaborator | "Someone sent me a room code" | inline ENTER CODE → Join room; sample dialog declares synthetic data | hydrated landing (join is an inline control, NOT a dialog — the dialog only exists in the SSR shell) | **SHOT** (same clip) |
| R4 | Mobile approver | "Approve the agent's change from my phone" | `#mobile` shell → join/start → gate | `#mobile` | **BLOCKED, same root as R5.** At 390×844 it renders the boot shell stuck on "Opening room" with **zero controls** — `#mobile` is a private route, so it boots straight into a workspace that needs the backend. Unfilmable locally for the same reason R5 is. |
| R5 | Diligence analyst **in a live room** | "What did the agent change and can I trust it" | room grid → agent edit → review → approve/reject | live room | **DECLINED by owner (2026-07-28: "no seed room")** — the core journey stays untold by decision, not by accident. R1's drills are its stand-in: same engine calls, no room. |
| R6 | Architect / skeptic | "How does the engine actually work" | #story → Architecture | — | **NOT A DISTINCT JOURNEY (probed 2026-07-28).** "Architecture" is a `<button>` with no href that navigates *within* `#story`: URL unchanged, it returns to the hero already filmed in R1. Merged into R1 rather than counted as uncovered. |

## NodeSlide

| # | Persona | Trigger | Journey | Surfaces | Status |
|---|---|---|---|---|---|
| S1 | Founder / analyst | "Board meeting Thursday, I have a brief" | landing → brief → sample workspace → element selection | landing (13), deck editor (78) | **SHOT** — 23s, 8/91 |
| S2 | Reviewer / auditor | "Who made this slide and from what" | inspector: Versions → Evidence → Trace | inspector tabs | **SHOT** (same clip) |
| S3 | Developer | "Drive NodeSlide with my own model / Claude Code / Codex / Cursor" | landing → BYOK / Agents dialog | `.ns-connections-dialog` — Local BYOK + Coding agents, closing on *"Same locks, second front door"* | **SHOT** (extras, youtu.be/eCMEWKoq5C0) |
| S4 | Design-evidence browser | "Show me proof the output quality is real" | landing → Artifact Lab modal | 38 evidence-bound recipes; every card carries source JSON · trace · export receipt | **SHOT** (extras) |
| S5 | Presenter | "Run the deck in front of people" | workspace → Present | full-screen, 1/7, notes | **SHOT** (extras) |
| S6 | Deck recipient | "Someone sent me a deck link" | direct `?deck=` URL → **"This is an editor link, not a share link"** | SAFE RECOVERY: private recovery key / open my decks | **SHOT** (extras) — must be filmed FIRST in a run; the session grant from the landing is what it guards against |
| S7 | Exporter | "I need the PPTX" | workspace → Export | Interactive HTML · editable PPTX with fallbacks | **SHOT** (extras) |

---

## What the survey changed

1. **S6 exists.** `?deck=deck_golden_…` pasted cold renders a refusal — *"This is an
   editor link, not a share link"* — not the deck. That is a trust surface doing its
   job (the session-grant gate), and it is exactly the kind of state
   `trust-surfaces` audits. It also means the S5/S7 journeys must be filmed
   in-session via the landing, never via deep link.
2. **S4 is 207 controls** — more than double the deck editor — and completely
   uncovered. If the audience is "evaluators deciding whether output quality is
   real," this is their surface.
3. **R5 remains the product's core journey and the one thing we cannot film**
   without a signed-in, seeded room. Every NodeRoom clip so far is the *pitch* for
   that journey, not the journey.

## Coverage, stated

- Journeys identified: **13** (6 NodeRoom, 7 NodeSlide)
- **Shot: 10** — R1, R2, R3, S1, S2, S3, S4, S5, S6, S7
- **Reachable and unshot: 0**
- Blocked on the backend: **2** — R5 (declined by owner: "no seed room") and R4
  (mobile route boots straight into a workspace; same root cause)
- Not a journey after probing: **1** — R6 is in-page nav inside R1

**Every reachable journey in both products is filmed.** What remains is one
root cause, not six gaps: the two unshot journeys both need a live room, which
is a decision the owner has already made.

### The videos

| Video | Journeys | Length |
| --- | --- | --- |
| youtu.be/uvXf7e4hwt4 — NodeRoom, narrated | R1 R2 R3 | 79s |
| youtu.be/5FnzEKmm9fw — NodeSlide, narrated | S1 S2 | 82s |
| youtu.be/eCMEWKoq5C0 — NodeSlide extras, narrated | S3 S4 S5 S6 S7 | 115s |
| youtu.be/3N7sBxFLFOc · qpzHP5-pWvw · M9cc5Gj1pQE | silent proof clips | 17–24s |

**Both narrated full walkthroughs exist.** NodeSlide: S1+S2 in one continuous
82s video (youtu.be/5FnzEKmm9fw, `argo-demos/demos/nodeslide-full.demo.ts`) —
brief → real deck → element selection → Versions → Evidence → Trace, ending on
"reviewable by construction". NodeRoom: R1+R2+R3 in one continuous 79s video
with local-TTS voiceover (argo + Kokoro, no cloud voice API) —
youtu.be/uvXf7e4hwt4, built from `argo-demos/demos/noderoom-full.demo.ts`.
Every scene waits on proof text, and every narration line quotes a rehearsed
frame. Producing it found argo's Windows spawn bug (execFile('npx') dies with an
EMPTY error on Node >= 20.12 — see argo-demos/PATCHES.md, upstream-worthy).

What filming R2/R3 found: the hydrated React landing is a different page from
the SSR shell (inline join-code control, LIVE DEMO card with a source-backed
citation), and every FocusTrapDialog modal rendered behind its own blur scrim —
a Radix-migration regression, fixed in noderoom before the clip was cut
(branch claude/fresh-user-dialog-fix). The walkthrough pipeline is now finding
shipped bugs, which is the QA-dogfood argument in one sentence.

## Production order (value per persona, cheapest gate first)

1. **S4 Artifact Lab** — biggest uncovered surface, ungated, evaluator persona
2. **S3 BYOK / Agents** — developer persona, zero coverage, ungated
3. **S5+S7 Present + Export** — one in-session clip covers both
4. **S6 link-guard** — 5-second insert; a refusal doing its job is worth showing
5. **R2/R3/R4 gates** — one clip: three ways in, all ending honestly at sign-in
6. **R5 live room** — needs the owner's call: sign in once and seed a demo room,
   or accept that the core journey stays untold

Rules carried from the pipeline: rehearse before spec, captions quote the screen,
flat camera on dense surfaces, publish once after frame review, every artifact
carries `journeys shot / journeys identified`.
