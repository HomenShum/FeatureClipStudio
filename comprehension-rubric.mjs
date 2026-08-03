// The second axis. The craft rubric in judge-video.mjs asks whether a video is well MADE — cursor
// truth, pacing, legibility, motion. A cut can score well on every one of those and still leave a
// viewer unable to say who it is for or why they should care, because craft and comprehension are
// different questions and only one of them was being asked.
//
// This is the other one, and it came from a reviewer watching a technically-clean cut and listing
// what it failed to convey: the full interaction, the persona, the purpose, the use case, the
// feature, the product's responsiveness, the flow, the result, why it makes sense to a non-expert,
// and how a viewer would use it for their own case.
//
// THE MOM TEST is the load-bearing one, and it is deliberately the hardest to pass. Everything else
// can be satisfied by a competent engineer describing their own work; that one cannot. A person who
// does not already know the domain must be able to say what this is for after one watch. A demo
// that only makes sense to someone who could have built it has an audience of one.
//
// Scoring is 0-2 per dimension with a timestamp, same shape as the craft rubric, because a score
// without a locator is an opinion and cannot be argued with.

export const COMPREHENSION_VERSION = "2026-08-04.ten-dimensions-v1";

export const COMPREHENSION_DIMENSIONS = Object.freeze([
  "persona", "purpose", "use_case", "feature_clarity", "full_interaction",
  "responsiveness", "flow", "result", "non_expert_sense", "transfer",
]);

export const COMPREHENSION_RUBRIC = `SECOND AXIS — COMPREHENSION. The scores above judge whether the
video is well MADE. These judge whether a viewer UNDERSTANDS it. A cut can be well made and
incomprehensible; score these independently and do not let a good craft score raise them.

Judge as a first-time viewer who has never seen this product and did not read the description.

Score 0-2 each (0=absent, 1=implied but never stated, 2=explicit and unmissable), each with a
timestamp or the note "never":
1. persona - WHO is this for? Is a specific person named or shown, or is it addressed to nobody?
   "For developers" is a category, not a persona; "the owner of a one-location salon on a Monday" is
   a persona. Score 0 if a viewer cannot say who should press play.
2. purpose - WHAT PROBLEM does it solve, stated as the viewer's problem rather than the product's
   capability? "Turns exports into a weekly close" is a purpose; "supports CSV import" is a feature.
3. use_case - a CONCRETE situation, not an abstraction. A named task, with real-looking data, that a
   viewer could recognise as their own Tuesday.
4. feature_clarity - can a viewer name what the product actually DOES, in one sentence, afterwards?
5. full_interaction - is the WHOLE interaction shown, or does it cut from intent to outcome? Every
   click, every wait, every intermediate state. A jump from "user wants X" to "X is done" fails this
   even when both frames are real.
6. responsiveness - does the product visibly RESPOND? Loading states, streaming output, progress,
   optimistic updates, latency that is shown rather than edited out. A video with no waiting in it
   is a video that hid the waiting.
7. flow - can a viewer reconstruct the ORDER of steps from memory afterwards? Is there a beginning,
   a middle and an end, or a sequence of screens?
8. result - is the OUTCOME unambiguous and on screen? Not "it worked" but the actual artifact, with
   the thing that changed visible.
9. non_expert_sense - THE MOM TEST, and the one that matters most. Could someone with no domain
   knowledge say, in their own words, what this is for and why it is better than what they do now?
   Jargon shown without being explained scores 0 here even if everything else is perfect. Name the
   specific term or moment that would lose them.
10. transfer - does a viewer learn HOW TO USE IT FOR THEIR OWN CASE? Is the path from "I watched
    this" to "I could try this with my own data" visible, or does it end at a demo they cannot enter?

Return these under "comprehension" in the JSON:
"comprehension":{"persona":{"score":n,"ts":"m:ss|never","evidence":"..."}, ... ,
 "wouldMomUnderstand":true|false,
 "momLosesThemAt":{"ts":"m:ss","what":"the first moment a non-expert stops following"},
 "missingEntirely":["dimensions scoring 0"]}

A dimension scoring 0 is a P1 defect at minimum; persona, non_expert_sense or result at 0 is a P0 —
a video nobody can place, nobody outside the field can follow, or that never shows its outcome has
failed at its job however well it was cut.`;

/**
 * Verdict from the comprehension block alone, kept separate from the craft score.
 *
 * Averaging the two would let a beautifully cut, incomprehensible video pass — which is exactly the
 * failure this axis exists to catch, and exactly what a single combined number would hide.
 */
export function evaluateComprehension(block) {
  if (!block || typeof block !== "object") {
    return { status: "not-run", scored: 0, total: 0, blocking: [], detail: "the judge returned no comprehension block; the axis was not scored, which is not the same as scoring well" };
  }
  const scored = COMPREHENSION_DIMENSIONS.filter((d) => typeof block[d]?.score === "number");
  const missing = COMPREHENSION_DIMENSIONS.filter((d) => typeof block[d]?.score !== "number");
  if (scored.length === 0) {
    return { status: "not-run", scored: 0, total: 0, blocking: [], detail: "no dimension was scored" };
  }
  const total = scored.reduce((sum, d) => sum + block[d].score, 0);
  const zeros = scored.filter((d) => block[d].score === 0);
  // The three that cannot be traded away. A viewer who cannot place the audience, cannot follow
  // without domain knowledge, or never sees the outcome has not been served, whatever else is good.
  const blocking = zeros.filter((d) => ["persona", "non_expert_sense", "result"].includes(d));

  // The mom test blocks on its own, whatever the numbers say. Measured on a real cut: every one of
  // the ten dimensions scored 1, so there were no zeros and nothing blocked — while
  // wouldMomUnderstand was false and the judge could name the second a non-expert was lost. A gate
  // that passes a video its own judge says nobody outside the field can follow is not a gate.
  const momFails = block.wouldMomUnderstand !== true;

  // Uniform scoring is the shape of a judge answering "was anything absent?" rather than "was
  // anything EXPLICIT?". Everything at 1 means everything was implied and nothing was stated, which
  // is a finding rather than a middling pass — and it is invisible in a total.
  const uniform = scored.length >= 5 && new Set(scored.map((d) => block[d].score)).size === 1;

  return {
    status: blocking.length > 0 || momFails ? "blocked" : zeros.length > 0 ? "incomplete" : "passed",
    momFails,
    uniform,
    scored: scored.length,
    total,
    max: scored.length * 2,
    zeros,
    blocking,
    unscored: missing,
    wouldMomUnderstand: block.wouldMomUnderstand === true,
    momLosesThemAt: block.momLosesThemAt ?? null,
  };
}

export function formatComprehension(verdict) {
  if (verdict.status === "not-run") return `COMPREHENSION NOT RUN: ${verdict.detail}.`;
  const head = `COMPREHENSION ${verdict.status.toUpperCase()}: ${verdict.total}/${verdict.max} across ${verdict.scored} dimension(s)`
    + ` · mom test ${verdict.wouldMomUnderstand ? "passes" : "FAILS"}`;
  const lines = [head];
  if (verdict.blocking.length > 0) lines.push(`  P0 — absent entirely: ${verdict.blocking.join(", ")}`);
  if (verdict.momFails) lines.push("  P0 — the mom test fails: a non-expert could not say what this is for after one watch");
  if (verdict.uniform) {
    lines.push("  every dimension scored the same — nothing was ABSENT and nothing was EXPLICIT either;"
      + " treat this as 'all implied, none stated' rather than as a middling pass");
  }
  const soft = verdict.zeros.filter((d) => !verdict.blocking.includes(d));
  if (soft.length > 0) lines.push(`  P1 — absent: ${soft.join(", ")}`);
  if (verdict.unscored.length > 0) lines.push(`  unscored (not the same as fine): ${verdict.unscored.join(", ")}`);
  if (!verdict.wouldMomUnderstand && verdict.momLosesThemAt) {
    lines.push(`  loses a non-expert at ${verdict.momLosesThemAt.ts}: ${verdict.momLosesThemAt.what}`);
  }
  return lines.join("\n");
}
