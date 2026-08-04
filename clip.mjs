// The whole loop, one command: storyboard -> narration-fitted render -> voice -> score -> mux ->
// two-axis judge -> said-vs-shown gate. Exit non-zero until the gates clear.
//
//   npm run clip                 (VOICE=en_US-ryan-high npm run clip to switch narrator)
//
// There is deliberately no shorter path that skips the judge. Every stage here exists because its
// absence shipped a real defect this week: unfitted holds cut narration mid-sentence, an unmapped
// mux shipped three silent videos, and an uncalibrated judge scored a static JPEG the same as a
// launch film. The gates are the product.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { linesFromStoryboard, synthesiseBeats, assemble, overruns } from "./narrate.mjs";
import { buildScore, muxOnto } from "./score.mjs";

const VOICE = process.env.VOICE || "en_US-lessac-medium";
const PAD = 0.35;
const OUT = "out/clip.mp4";

const step = (name) => console.log(`\n[clip] ${name}`);

step("storyboard + narration fit");
const raw = readFileSync("src/walkthrough.data.js", "utf8");
const m = raw.match(/^([\s\S]*?export const WALKTHROUGHS\s*=\s*)([\s\S]*?)(;\s*)$/);
const data = JSON.parse(m[2]);
let steps = data[0].steps;
let lines = linesFromStoryboard(steps);
let clips = synthesiseBeats(lines, VOICE);
const newHolds = steps.map((s, i) => Math.round(Math.max((s.hold || 60) / 30, (clips[i]?.seconds ?? 0) + PAD) * 30));
data[0].steps.forEach((s, i) => { s.hold = newHolds[i]; });
writeFileSync("src/walkthrough.data.js", m[1] + JSON.stringify(data, null, 2) + m[3]);
steps = data[0].steps;
lines = linesFromStoryboard(steps);
const over = overruns(lines, clips);
if (over.length) { console.error("[clip] OVERRUNS after fitting:", JSON.stringify(over)); process.exit(1); }
const totalFrames = newHolds.reduce((a, b) => a + b, 0);
console.log(`  ${steps.length} beats, ${(totalFrames / 30).toFixed(1)}s, voice ${VOICE}, overruns 0`);

step("render");
const r = spawnSync("npx", ["remotion", "render", "src/index.js", "WT-NodeRoom", "out/clip-video.mp4", "--concurrency=2"], { encoding: "utf8", timeout: 540_000, maxBuffer: 64 * 1024 * 1024, shell: true });
if (r.status !== 0) { console.error("[clip] render failed:", (r.stderr || "").slice(-200)); process.exit(1); }

step("voice + score + mux");
assemble(lines, clips, totalFrames / 30, "out/clip-narration.wav");
const score = buildScore({ steps, outFile: "out/clip-audio.wav", narration: "out/clip-narration.wav" });
muxOnto("out/clip-video.mp4", "out/clip-audio.wav", OUT);
console.log(`  mix ${score.post.I.toFixed(1)} LUFS / LRA ${score.post.LRA.toFixed(1)}`);

step("gate 1 — audio is actually there");
const vol = spawnSync("ffmpeg", ["-v", "info", "-i", OUT, "-map", "0:a:0", "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8", timeout: 300_000 });
const mean = Number((`${vol.stderr}`.match(/mean_volume: (-?[\d.]+)/) || [])[1] ?? -91);
if (mean < -60) { console.error(`[clip] SILENT OUTPUT (${mean} dB) — the mux shipped the wrong stream`); process.exit(1); }
console.log(`  ${mean} dB`);

step("gate 2 — said matches shown (Moonshine)");
spawnSync("ffmpeg", ["-y", "-v", "error", "-i", OUT, "-vn", "-ar", "16000", "-ac", "1", "out/clip-stt.wav"], { encoding: "utf8", timeout: 300_000 });
const stt = spawnSync("python", ["-c", `
import re, json
import moonshine_onnx as m
heard = m.transcribe('out/clip-stt.wav','moonshine/tiny')
heard = heard[0] if isinstance(heard,(list,tuple)) else str(heard)
print(json.dumps({"heard": heard}))
`], { encoding: "utf8", timeout: 540_000, env: { ...process.env, PYTHONUTF8: "1" }, maxBuffer: 32 * 1024 * 1024 });
const heard = JSON.parse(stt.stdout.split("\n").filter(Boolean).pop() ?? "{}").heard ?? "";
const norm = (t) => t.toLowerCase().replace(/—/g, " ").replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
const tw = norm(lines.map((l) => l.text).join(" "));
const hw = norm(heard);
const overlap = tw.filter((w) => hw.includes(w)).length / Math.max(1, tw.length);
console.log(`  ${Math.round(overlap * 100)}% of ${tw.length} caption words heard`);
if (overlap < 0.85) { console.error("[clip] SAID-VS-SHOWN FAIL — narration and captions have drifted"); process.exit(1); }

step("gate 3 — two-axis judge");
const judge = spawnSync("node", ["judge-video.mjs", OUT, "--no-reference"], { encoding: "utf8", timeout: 540_000, maxBuffer: 32 * 1024 * 1024 });
const verdict = JSON.parse(readFileSync("out/clip.judge.json", "utf8"));
const craft = Object.values(verdict.scores).reduce((a, v) => a + v.score, 0);
const cb = verdict.comprehension ?? {};
const comp = Object.keys(cb).filter((k) => typeof cb[k]?.score === "number").reduce((a, k) => a + cb[k].score, 0);
console.log(`  craft ${craft}/22 · comprehension ${comp}/20 · mom ${cb.wouldMomUnderstand ? "passes" : "FAILS"}`);
if (judge.status !== 0) {
  console.error("[clip] JUDGE BLOCKED — read out/clip.judge.md, fix, run again. The loop is the product.");
  process.exit(1);
}
console.log(`\n[clip] SHIPPABLE: ${OUT}`);
