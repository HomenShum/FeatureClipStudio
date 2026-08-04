import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { linesFromStoryboard, synthesiseBeats, assemble, overruns } from "./narrate.mjs";
import { buildScore, muxOnto } from "./score.mjs";

const PAD = 0.35;
// 1. current storyboard + fresh narration
let { WALKTHROUGHS } = await import("./src/walkthrough.data.js");
let steps = WALKTHROUGHS[0].steps;
let lines = linesFromStoryboard(steps);
let clips = synthesiseBeats(lines, "en_US-lessac-medium");

// 2. holds each beat actually needs for its spoken line
const newHolds = steps.map((s, i) => {
  const clip = clips[i];
  return Math.round(Math.max((s.hold || 60) / 30, (clip ? clip.seconds : 0) + PAD) * 30);
});
const raw = readFileSync("src/walkthrough.data.js", "utf8");
const m = raw.match(/^([\s\S]*?export const WALKTHROUGHS\s*=\s*)([\s\S]*?)(;\s*)$/);
const data = JSON.parse(m[2]);
data[0].steps.forEach((s, i) => { s.hold = newHolds[i]; });
writeFileSync("src/walkthrough.data.js", m[1] + JSON.stringify(data, null, 2) + m[3]);
const total = newHolds.reduce((a, b) => a + b, 0);
console.log("holds:", newHolds.join(","), "=", total, "frames =", (total / 30).toFixed(2) + "s");

// 3. re-import fresh and verify before the expensive render
const mod = await import(`./src/walkthrough.data.js?${Date.now()}`).catch(() => null);
steps = data[0].steps;
lines = linesFromStoryboard(steps);
clips = synthesiseBeats(lines, "en_US-lessac-medium");
const over = overruns(lines, clips);
if (over.length) { console.log("OVERRUNS REMAIN:", JSON.stringify(over)); process.exit(1); }
console.log("overruns: 0 — every line fits");

// 4. render
const r = spawnSync("npx", ["remotion", "render", "src/index.js", "WT-NodeRoom", "out/example.mp4", "--concurrency=2"], { encoding: "utf8", timeout: 540_000, maxBuffer: 64 * 1024 * 1024, shell: true });
if (r.status !== 0) { console.log("RENDER FAILED:", (r.stderr || "").slice(-200)); process.exit(1); }
const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", "out/example.mp4"], { encoding: "utf8" });
console.log("rendered:", Number(probe.stdout).toFixed(2) + "s (expect ~" + (total / 30).toFixed(2) + "s)");

// 5. narration + arcade score + mux
assemble(lines, clips, total / 30, "out/narration.wav");
const score = buildScore({ steps, outFile: "out/arcade.wav", narration: "out/narration.wav" });
console.log("mix:", score.post.I.toFixed(1), "LUFS / LRA", score.post.LRA.toFixed(1));
muxOnto("out/example.mp4", "out/arcade.wav", "out/example-momwords.mp4");
console.log("-> out/example-momwords.mp4");
