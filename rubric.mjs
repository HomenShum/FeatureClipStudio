// The gate, shared by FeatureClipStudio, NodeVideo and NodeSlide.
//
// TWO RUBRICS, deliberately, because they fail independently.
//
// CRAFT asks "is this well made" — cursor truth, pacing, legibility, a signature
// moment. COMPREHENSION asks "did anyone understand it" — who it is for, what
// problem it solves, what happened when the button was pressed, and whether a
// viewer could now use it on their OWN question.
//
// They come apart in one direction far more often than the other. The TrialScope
// cut that motivated this file scored well on craft — real states, real loading,
// a peak at the graph — and a viewer still could not have told you who the
// product is for, what job it does, or how to point it at their own case. Craft
// is what a demo's author notices missing. Comprehension is what everyone else
// notices missing, and it never shows up in a craft score, so it has to be its
// own axis with its own numbers or it gets optimised away.
//
// Scores are 0-2 per dimension: 20 craft + 20 comprehension = 40.

// --------------------------------------------------------------------- CRAFT
export const CRAFT = [
  ["storyboard_clarity", "can a first-time viewer state what is being compared, why it matters, and what each scene proves?"],
  ["state_coverage", "does each flow show empty state -> action -> (loading if async) -> result, or does it skip to outcomes (hero-shot smell)?"],
  ["cursor_truth", "does the cursor visibly travel to and land ON the control being used before each state change?"],
  ["caption_sync", "do step captions match what is actually happening on screen (and any narration heard)?"],
  ["pacing", "can a first-time viewer read each caption and register each state? any dead air or rushed beats?"],
  ["legibility", "is app text readable at the rendered size? are captions large and contrasty enough?"],
  ["proof_feel", "does it read as evidence of a real working product (real states, real data motion) rather than staged marketing?"],
  ["safety", "any visible secrets, API keys, tokens, real personal data, or internal URLs that should not ship?"],
  ["signature_moment", "is there ONE moment the whole demo is built around, does it land early, and is everything before it earning it? (a demo that is uniformly pleasant and has no peak scores 0)"],
  ["loop_etiquette", "if this loops as a GIF, is the total length and final-state hold reasonable (viewers lost on the second loop = too long)?"],
];

// ------------------------------------------------------------- COMPREHENSION
// Each of these is scored from the seat of the AUDIENCE named on the command
// line, not from the seat of someone who already knows the product.
export const COMPREHENSION = [
  ["persona", "is it visible WHO this is for? A viewer should be able to name the person whose job this is, from what is on screen — not infer it from the domain. 0 if the demo never establishes a user at all."],
  ["purpose", "is the JOB TO BE DONE stated? What was hard or slow or untrustworthy before? A feature tour with no stated problem scores 0 however pretty it is."],
  ["use_case", "is there a concrete, specific situation driving the demo — a real question a real person would actually have — rather than a generic sample query?"],
  ["feature_legibility", "can a viewer name the FEATURES they just watched, as distinct capabilities, and say what each one does? Not 'it made a chart' but 'it planned the buckets, probed each one, and declared the overlap'."],
  ["full_interaction", "is the interaction shown END TO END — including the parts that are boring or slow — or does it cut from click to finished result? Every hidden step is a step the viewer assumes was faked."],
  ["responsiveness", "does the product visibly RESPOND: hover states, focus, loading indicators, streaming, progressive results, latency the viewer can feel? A demo where nothing acknowledges the user reads as a mockup."],
  ["flow", "do the scenes connect causally — this, THEREFORE that — so the demo is a single journey rather than a list of screens? Name where the thread breaks if it does."],
  ["result", "is the OUTCOME unmistakable? What does the user now have that they did not have at the start, stated plainly and left on screen long enough to absorb?"],
  ["lay_sense", "AUDIENCE TEST, the one most demos fail. Score from the seat of the named audience. Would THEY finish this video able to say, in their own words, why this is useful and why it should be believed? Jargon that is never unpacked, acronyms, and unexplained numbers all cost points here."],
  ["own_case_transfer", "could a viewer now use this on THEIR OWN input? Is the entry point shown (where you type, what a good question looks like, what varies vs what is fixed)? A demo that only ever proves one hardcoded example scores 0."],
];

export const ALL = [...CRAFT, ...COMPREHENSION];
export const MAX = ALL.length * 2;

const fmt = (list) => list.map(([k, q], i) => `${i + 1}. ${k} - ${q}`).join("\n");

export const rubricPrompt = (audience) => `You are judging a rendered product-walkthrough video
(a feature demo with an animated cursor, click ripples, step captions, and a progress bar —
possibly with narration).

THE AUDIENCE YOU ARE JUDGING FOR IS: ${audience}
Score every COMPREHENSION dimension from that person's seat. You are not scoring whether the
product is good; you are scoring whether THAT PERSON would understand it. When the audience is
non-technical, an unexplained term is a defect even if it is correct.

The quality bar is STORY-FIRST and ANTI-HERO-SHOT. Camera moves should reveal evidence, not fake
excellence. A viewer must always see the empty state, where the cursor clicked, any loading
state, and the result — never just a polished final state.

Score each dimension 0-2 (0=fails, 1=acceptable, 2=strong) WITH specific evidence + timestamps.

=== CRAFT (is it well made) ===
${fmt(CRAFT)}

=== COMPREHENSION (did anyone understand it) — judged as ${audience} ===
${fmt(COMPREHENSION)}

These two blocks fail INDEPENDENTLY and you must let them. A cut can be beautifully made and
still leave the audience unable to say who it is for — that is a high CRAFT score next to a low
COMPREHENSION score, and it is the single most common real result. Do not let a strong craft
impression lift the comprehension numbers.

ANTI-UNIFORMITY, and this is enforced. Two materially different cuts of the same demo (31.9s/11
steps and 47.4s/16 steps) both scored exactly 1/2 on all ten dimensions of the earlier rubric.
That is not a judgement, it is a shrug, and a gate that returns the same verdict regardless of
input is not a gate. So:

  - You MUST NOT give every dimension the same score. If your first pass is uniform, you have
    described the video instead of judging it -- go back and force a ranking.
  - Name the SINGLE WEAKEST and SINGLE STRONGEST dimension across BOTH blocks, in "weakest" and
    "strongest". They must differ. Also name "weakest_comprehension" specifically, because that
    is the one the next cut has to fix.
  - A 2 means "as good as the Linear/Stripe/Vercel reference for that dimension". A 1 means
    "works, but a reference cut would not ship it like this". A 0 means the dimension is absent
    or actively misleading. Most dimensions in most demos are NOT 2s.
  - Evidence must be CRITICAL, not descriptive. "Cursor lands on UI controls" is a description
    and scores nothing. "Cursor arrives 4 frames before the click with no deceleration, so the
    landing reads as a teleport" is evidence.

Then list DEFECTS: each with timestamp, severity (P0 blocks publishing / P1 fix before posting /
P2 polish, log and ship), what you observed, and a concrete fix.

Then, in "next_cut", give the REVISION BRIEF: 2-5 concrete storyboard changes that would raise
the weakest comprehension dimensions, each as {"dimension":"...","change":"add/replace/extend a
step, described precisely enough to implement","where":"m:ss or 'opening'/'closing'"}. This field
is the point of the whole judgement — a score with no actionable next cut is a grade, not a gate.

Finally an overall verdict: publish | fix-then-publish | rework.

Return STRICT JSON:
{"audience":"${audience}",
 "scores":{"<dimension>":{"score":n,"evidence":"..."}, ...all ${ALL.length} dimensions...},
 "signature_moment_ts":"m:ss","weakest":"<dimension>","strongest":"<dimension>",
 "weakest_comprehension":"<dimension>",
 "defects":[{"ts":"m:ss","severity":"P0|P1|P2","observed":"...","fix":"..."}],
 "next_cut":[{"dimension":"...","change":"...","where":"..."}],
 "verdict":"...","summary":"2-3 sentences"}`;
