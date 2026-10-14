// The one Gemini judge/observer model id (SPEC-v3 §1.2 `google` wire id). GEMINI_JUDGE_MODEL pins another.
// Pinned rather than floating: a judge whose model changes underneath it produces verdicts that cannot be compared.
export const JUDGE_MODEL = process.env.GEMINI_JUDGE_MODEL || "gemini-3.6-flash";
