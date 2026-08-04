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
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const url = flag("url");
const windows = flag("windows", "");
const label = flag("label", "reference");
if (!url) { console.error("usage: node analyze-reference.mjs --url <youtube-url> [--windows m:ss-m:ss,...] [--label name]"); process.exit(1); }

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

const call = async (win) => {
  const part = { file_data: { file_uri: url } };
  if (win) part.video_metadata = { start_offset: `${secs(win[0])}s`, end_offset: `${secs(win[1])}s` };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [part, { text: PROMPT + (win ? `\nYou are watching ONLY ${win[0]}-${win[1]}.` : "") }] }],
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
writeFileSync(`out/${label}.format.json`, JSON.stringify(out, null, 2));
console.log(`[analyze] wrote out/${label}.format.json`);
for (const o of out) {
  console.log(`\n=== ${o.window} ===`);
  for (const r of o.transferable_rules || []) console.log("  -", r);
}
