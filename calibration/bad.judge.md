# Video judge — calibration/bad.mp4

**Judge:** gemini-3.6-flash (video understanding) · **Verdict:** rework · **Score:** 3/22

> The video is entirely static for 29 seconds, presenting only a single still frame without cursor movement, interaction, or narration. It fails to demonstrate any product features, flows, or outcomes. A complete rework is required to show a live working interaction.

| Dimension | Score | Evidence |
|---|---|---|
| storyboard_clarity | 0/2 | 00:00-00:29 shows a completely static frame with no narrative arc, comparison, or thesis presented. |
| state_coverage | 0/2 | 00:00-00:29 shows zero state changes or workflow progression. |
| cursor_truth | 0/2 | 00:00-00:29 has no cursor present on screen. |
| caption_sync | 0/2 | 00:00-00:29 shows no step captions or audio narration. |
| pacing | 0/2 | 00:00-00:29 consists entirely of static dead air for 29 seconds. |
| legibility | 1/2 | 00:00 contains readable interface text and title, but no dynamic captions are presented. |
| proof_feel | 0/2 | 00:00-00:29 displays a static image with no live product execution or data motion. |
| safety | 2/2 | 00:00 displays public header text; no visible API keys, tokens, or personal data. |
| loop_etiquette | 0/2 | 00:00-00:29 holds a static image for 29 seconds, making continuous looping monotonous and pointless. |
| motion_craft | 0/2 | 00:00-00:29 contains no camera movement, zooms, or visual focus cues. |
| visual_hierarchy | 0/2 | 00:00-00:29 lacks dynamic framing or visual emphasis to direct viewer attention. |

## Defects
- **P0 @ 00:00** — Video is entirely static across 00:00-00:29 without motion, cursor actions, or feature walkthrough. → *Record an actual walkthrough showing cursor navigation, interactions, loading states, and output updates.*
- **P0 @ 00:00** — No single aha moment, user persona, or clear product result is established. → *Structure the video around a specific user flow demonstrating how a stale agent write is reviewed in action.*
- **P1 @ 00:00** — unverifiable-from-video: The claim 'A stale agent write becomes reviewable judgment' is displayed on static text without showing runtime validation. → *Show the agent write event triggering in real-time and appearing in the review queue.*
