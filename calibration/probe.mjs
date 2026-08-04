import { readFileSync, existsSync } from "node:fs";
const key = (() => {
  for (const k of ["GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"]) if (process.env[k]) return process.env[k];
  const m = readFileSync("../noderoom/.env.local", "utf8").match(/^(?:GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY)=(.+)$/m);
  return m[1].trim();
})();
const bytes = readFileSync(process.argv[2]);
const PROBE = `First, describe exactly what happens in this video: how many distinct visual states appear, does anything move, is there a cursor, does the content change over time. Be literal and specific. THEN, given ONLY what you described, score cursor_truth 0-2 (a cursor visibly travels to and lands ON controls before state changes) and state_coverage 0-2 (shows empty state -> action -> result rather than one outcome). Return JSON {"description":"...","cursor_truth":n,"state_coverage":n}`;
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: "video/mp4", data: bytes.toString("base64") } }, { text: PROBE }] }], generationConfig: { temperature: 0.2, response_mime_type: "application/json" } }),
});
const j = await r.json();
const parsed = JSON.parse((j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join(""));
console.log("description:", parsed.description.slice(0, 240));
console.log("cursor_truth:", parsed.cursor_truth, "| state_coverage:", parsed.state_coverage);
