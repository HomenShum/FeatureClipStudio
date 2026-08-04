# Long-form references — the genre this repo was NOT calibrated against

The three references in `REFERENCES.md` are product **launch films**: 38-174s,
music-forward, no narration, built to make you want the thing. Everything in this
repo — 40-90s cuts, caption-length script, a soundtrack with a signature moment —
was calibrated against that shape.

A **codebase walkthrough is a different genre**, and calibrating one against the
other produced a video that is a trailer for a walkthrough rather than a
walkthrough. Measured, August 2026:

| video | channel | duration | words | wpm | chapters |
|---|---|---|---|---|---|
| [Perplexica code walkthrough + architecture](https://youtu.be/D-5le87dbDk) | Shekhar Gulati | **48.6 min** | 8,380 | 172 | 0 |
| [System Design Interview: Design Twitter](https://youtu.be/Nfa-uUHuFHg) | Hello Interview | **23.1 min** | 4,436 | 192 | 0 |
| [How to develop like a Senior SWE](https://youtu.be/FxXyoRyzxoU) | VS Code | 57.4 min | — | — | 7 (one 40.9-min "Demo") |
| [How Senior Engineers Build with AI](https://youtu.be/9dKA2hq4vf0) | JavaScript Mastery | 176.2 min | — | — | — |
| [Looking Into a REAL Codebase](https://youtu.be/P4CRVTB2B5s) | Tech With Tim | 10.2 min | — | — | — |
| [How To Code in A Large Codebase](https://youtu.be/36aiUIbIAJ0) | PedroTech | 15.6 min | — | — | — |
| — | | | | | |
| **TScode (this repo's decisions cut)** | | **1.5 min** | **262** | 174 | 0 |
| **TShero (this repo's product demo)** | | 1.1 min | 198 | 188 | 0 |

## What the numbers say

**Content density, not length, is the gap.** 262 words against 8,380 is **3%** of
what a real code walkthrough carries. Stretching the current cut to 45 minutes
would not fix that — it would produce 43 minutes of held stills. The deficit is
material: files opened, functions read aloud, tests run, failures shown.

**Speaking rate is a hard band: 165-195 wpm.** Both measured exemplars sit at
172 and 192. The first decisions cut ran **288 wpm** because holds had been
shrunk to exactly fit the speech with no room to breathe. Fast narration does not
read as energetic; it reads as someone who does not expect to be understood.
`readability.mjs` now fails outside the band, and `voice.mjs --pause` is the dial.

**Chapters are rarer than expected.** Two of the strongest exemplars have none,
so chaptering is not the genre's load-bearing structure — sequence of concerns is.
The one heavily-chaptered result is a livestream whose "Demo" chapter is 40.9
minutes, which is a recording, not an edit.

## What a real one would need

The current deck is 8 decisions in 4 zones each — a **summary of conclusions**.
The genre shows the work that produced them:

1. **Open the files.** `app/ctgov.py`, `app/executor.py`, `app/graph_local.py` on
   screen, scrolled and read, not described from a slide.
2. **Run things live.** `pytest` passing, an eval re-probe, a trace replayed
   against ClinicalTrials.gov returning the same number.
3. **Show a failure.** The unwired-tenancy bug reproduced — tests green, module
   never constructed — is worth more than any slide asserting it happened.
4. **Narrate while reading**, which is where the word count comes from: 8,000
   words is roughly 45 minutes of a person thinking out loud over code.

That is a capture problem this pipeline does not solve yet: it screenshots
discrete states, and a walkthrough needs continuous scrolling over source with
live narration. Recording it is a different tool than composing it.
