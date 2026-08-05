// analyze-reference.mjs — extract the FORMAT of a reference video, not a review
// of it. Gemini video understanding reads the YouTube URL directly (file_data,
// no download), and the questions are about form: what is on screen, who talks
// and how, how code is presented, what the segment structure is.
//
// Windows, not the whole video: a 53-minute video at ~300 tokens/second is near
// the context ceiling and mostly redundant — format is stable within a segment,
// so two or three well-chosen windows carry it.
//
//   node analyze-reference.mjs --url https://youtu.be/ID --windows 3:00-9:00,18:00-24:00 --label hello-interview
//
// --lens product flips the questions from craft to PRODUCT: what the demo proves the product
// does, with "none observed" as a first-class answer. Born in the Cheiron take-home, where two
// demo videos decided three contested roadmap items — two justified by what was on screen, one
// REFUSED because no approval UI and no write action ever appeared, with the trigger recorded
// instead of a speculative gate built. Aim it with --competencies so the verdicts land on the
// items you actually need evidence for:
//
//   node analyze-reference.mjs --url https://youtu.be/ID --lens product \
//     --competencies "multi-agent specialisation,context compression,HITL" --label cheiron-demo
//
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const url = flag("url");
const windows = flag("windows", "");
const label = flag("label", "reference");
const lens = flag("lens", "format");
const competencies = flag("competencies", "");
if (!url) { console.error("usage: node analyze-reference.mjs --url <youtube-url> [--windows m:ss-m:ss,...] [--label name] [--lens format|product] [--competencies a,b,c]"); process.exit(1); }
if (!["format", "product"].includes(lens)) { console.error(`unknown lens: ${lens} (format | product)`); process.exit(1); }

const key = () => {
  for (const k of ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]) if (process.env[k]) return process.env[k];
  for (const f of [".env.local", ".env"]) if (existsSync(f))
    for (const line of readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^(?:GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY)=(.+)$/);
      if (m) return m[1].trim();
    }
  throw new Error("set GEMINI_API_KEY");
};

const secs = (t) => { const p = t.split(":").map(Number); return p.length === 2 ? p[0] * 60 + p[1] : p[0]; };

const PROMPT = `You are extracting the FORMAT of this video so a studio can imitate its form with
different content. Do not review it, do not summarise its content. Observe its craft, with
timestamps. Report STRICT JSON:

{"screen_composition": "what is visible and in what layout — IDE? browser? webcam? slides? splits? how much of the frame is code?",
 "presenter_mode": "monologue / dialogue / interview; who asks, who answers; how thinking is voiced",
 "code_presentation": "HOW code is shown: scrolling style, cursor use, highlighting, jump-to-definition, terminal use, zooms",
 "narration_style": "sentence length, hesitations kept or cut, jargon level, how decisions and tradeoffs are verbalised",
 "structure": "what the presenter does FIRST, and the observable sequence of moves in this window",
 "pacing": "how long on one file/idea, dead air, whether pauses survive the edit",
 "production": "cuts, captions, chapter cards, zooms, music or none, anything overlaid",
 "interview_signals": "what makes this read as an assessment/interview rather than a tutorial, if anything",
 "design_narration": "HOW design/architecture decisions are verbalised: are alternatives named? are tradeoffs quantified? is there a stated reason a choice could be wrong? what vocabulary recurs?",
 "evidence_style": "what is used to BACK a design claim — a diagram, a measurement, a benchmark, a code line, a story about a failure, or nothing",
 "transferable_rules": ["3-7 concrete, imitable rules of form, each one sentence, each anchored to something observed at a timestamp"]}`;

// The product lens. Every field wants what is ON SCREEN, verbatim where possible, timestamped.
// "none observed" is a finding, not a failure — it is the answer that stops a speculative build.
const PRODUCT_PROMPT = `You are extracting PRODUCT EVIDENCE from this demo so an engineering team
can decide what to build against it. Do not review it, do not summarise marketing. Report only
what is visibly on screen, verbatim where text is readable, with a timestamp for every claim.
Where something never appears, write exactly "none observed" — that answer is as valuable as a
sighting. Report STRICT JSON:

{"what_it_builds": "the product in one line, using THEIR words verbatim from the UI or title cards, with timestamp",
 "named_features": [{"name": "feature name as shown on screen", "at": "m:ss", "what_it_does": "one sentence of observed behaviour"}],
 "sources_on_screen": ["every data source, integration, or corpus visibly named"],
 "artifacts_produced": ["every output artifact type the demo shows being produced"],
 "provenance_chain": "how a claim traces to its source on screen (citations, viewers, highlights) — or none observed",
 "agent_selection": "whether the user picks a named agent/mode before anything else; list every agent name visible; or none observed",
 "input_schemas": "whether structured parameter forms precede free text; list visible field labels; or none observed",
 "multi_turn_context": "evidence of persistent sessions, documents held in context across turns, follow-up chains; or none observed",
 "write_actions": "anything the product WRITES to an external system of record; or none observed",
 "approval_or_review_ui": "any human approval, review, or confirmation gate on screen; or none observed",
 "competency_evidence": [{"competency": "one item from the list you were given",
   "verdict": "justified | refused | unclear",
   "evidence": "the on-screen observations, each with a timestamp, that force this verdict",
   "trigger": "REQUIRED when verdict is refused: the observable product change that would flip it to justified"}]}`;

const call = async (win) => {
  const part = { file_data: { file_uri: url } };
  if (win) part.video_metadata = { start_offset: `${secs(win[0])}s`, end_offset: `${secs(win[1])}s` };
  let prompt = lens === "product" ? PRODUCT_PROMPT : PROMPT;
  if (lens === "product") {
    prompt += competencies
      ? `\nDecide competency_evidence for exactly these contested items: ${competencies}.`
      : "\nNo contested items were supplied; leave competency_evidence as an empty array rather than inventing items.";
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [part, { text: prompt + (win ? `\nYou are watching ONLY ${win[0]}-${win[1]}.` : "") }] }],
      generationConfig: { temperature: 0.2, response_mime_type: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  return JSON.parse((body.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join(""));
};

const wins = windows ? windows.split(",").map((w) => w.split("-")) : [null];
const out = [];
for (const w of wins) {
  console.log(`[analyze] ${label} ${w ? w.join("-") : "full"}`);
  out.push({ window: w ? w.join("-") : "full", ...(await call(w)) });
}
writeFileSync(`out/${label}.${lens}.json`, JSON.stringify(out, null, 2));
console.log(`[analyze] wrote out/${label}.${lens}.json`);
for (const o of out) {
  console.log(`\n=== ${o.window} ===`);
  for (const r of o.transferable_rules || []) console.log("  -", r);
  for (const c of o.competency_evidence || []) console.log(`  ${c.verdict?.toUpperCase?.() ?? "?"}: ${c.competency}${c.trigger ? ` (trigger: ${c.trigger})` : ""}`);
}
