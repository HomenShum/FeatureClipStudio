# Video judge — calibration/great.mp4

**Judge:** gemini-3.6-flash (video understanding) · **Verdict:** rework · **Score:** 10/22

> The video functions well as a fast-paced feature teaser, highlighting key capabilities like AI focus sessions and tool execution. However, it lacks explanatory captions, target persona framing, and consistent cursor paths. Adding visible cursor interactions, explicit step captions, and clear output artifacts will turn this preview into an effective product walkthrough.

| Dimension | Score | Evidence |
|---|---|---|
| storyboard_clarity | 1/2 | 0:01-0:26 showcases a rapid montage of disconnected launcher tools before switching to text announcement cards at 0:28. |
| state_coverage | 1/2 | 0:20-0:23 shows input -> execution progress -> action execution, but 0:08 and 0:11 jump between tool panels without showing empty or trigger states. |
| cursor_truth | 0/2 | Cursor event is recorded only at 0:06; state transitions at 0:01, 0:08, 0:11, 0:17, and 0:20 occur without visible cursor travel. |
| caption_sync | 0/2 | No step captions or narration exist during the feature walkthrough; text appears only as full-screen title cards at 0:28-0:34. |
| pacing | 1/2 | Rapid state changes every 2-3 seconds (0:01 through 0:26) pack six distinct features into 26 seconds. |
| legibility | 1/2 | UI text at 0:08 and 0:20 is readable in overlay containers, and announcement text at 0:28-0:34 is large and high-contrast. |
| proof_feel | 1/2 | 0:23 displays real task execution steps (Linear/GitHub/Notes), but framing leads into a distant teaser ('COMING 2026' at 0:34). |
| safety | 2/2 | 0:08 shows generic wallpaper filenames and public hex color codes; no API keys, tokens, or private data visible. |
| loop_etiquette | 1/2 | 0:37 ends on a static logo card, providing a natural hold point though no explicit fade-to-loop sequence is shown. |
| motion_craft | 1/2 | UI overlays transition in center screen (0:01, 0:08, 0:11, 0:20) without erratic camera pan or drift. |
| visual_hierarchy | 1/2 | 0:01 and 0:20 center the active search bar and prompt modal against a dark background, keeping attention on the active widget. |

## Defects
- **P0 @ 0:00** — No clear target persona is defined or depicted throughout the demo. → *Add an opening caption or framing device clarifying who this tool is built for (e.g., software engineers/power users).*
- **P0 @ 0:08** — Unexplained domain jargon (hex color strings, GitHub/Linear issue integrations) creates immediate confusion for non-expert viewers. → *Include explanatory step captions framing feature benefits in plain language.*
- **P1 @ 0:01** — Cursor movement is absent for almost all state transitions (0:01, 0:08, 0:11, 0:17, 0:20). → *Animate visible cursor paths landing on input controls before state changes trigger.*
- **P1 @ 0:24** — unverifiable-from-video: progress panel states 'Creating note with summary', but the resulting note document is never shown on screen. → *Extend the clip by 1-2 seconds to briefly render the generated note output before transitioning.*
