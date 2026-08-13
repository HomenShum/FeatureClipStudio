#!/usr/bin/env node
// Every clip must OPEN on its first captured frame, not on the empty backdrop
// behind it.
//
// The three renderers cross-fade each step in over the step before it: the
// previous step's still sits underneath at full opacity and the new one ramps
// 0 -> 1 on top. On step 0 there is no step before, so an unguarded ramp fades
// the first frame up from whatever the container paints -- `#fff` on
// Walkthrough / Walkthrough2up, `#070b14` on WalkthroughGrid. That is Defect D2:
// every clip opened on a ~0.37s flash, and a looping README GIF re-flashed on
// every loop.
//
// THE ASSERTION, and why it holds whatever the captured app looks like:
// within one step, frames 0..4 differ ONLY by that fade. Every camera ease
// starts at frame >= 5 (Walkthrough/2up `[6,26]`, Grid `[5,30]`) and every
// caption ease at frame 4, so all three clamp to their start value across
// 0..4. The pointer's own opacity ramp `[0,8]` and the progress bar's per-frame
// width are the only other movers, and together they cover well under 1% of the
// canvas. So: render frame 0 and frame 4 of a composition, and they must be the
// same picture. They are not, if the opening fade is unguarded.
//
// Usage:  node probe-opening-frame.mjs            (all targets)
//         node probe-opening-frame.mjs WT-NodeRoom
// Exit 0 = every opening frame is the app, not the backdrop. Exit 1 = flash.
// Needs only what the repo already needs: Remotion (renders the still) and
// ffmpeg (decodes the PNG; `score.mjs` and `clip.mjs` shell it the same way).

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { maxPathHint } from "./run-remotion.mjs";

// One composition per renderer -- the defect lives in the shared cross-fade, so
// covering the renderer covers every composition it draws.
const TARGETS = [
  { id: "WT-NodeRoom", entry: "src/index.js", renderer: "src/Walkthrough.jsx", backdrop: "#fff" },
  { id: "WTC-LiveSync", entry: "src/index.js", renderer: "src/Walkthrough2up.jsx", backdrop: "#fff" },
  { id: "WTG-RoomOSV0123", entry: "src/roomos-index.js", renderer: "src/WalkthroughGrid.jsx", backdrop: "#070b14" },
];

const EVIDENCE = "promotion/evidence/opening-frame";
const RECEIPT = "promotion/evidence/opening-frame.json";
const SAMPLE_W = 192, SAMPLE_H = 108;   // downscale: enough to see a full-frame flash, cheap to diff
const CHANNEL_DELTA = 12;               // per-channel tolerance for "same pixel" after downscaling
const MAX_DIFF_SHARE = 0.05;            // pointer ramp + progress bar are ~0.5% of frame; a flash is ~90%

const still = (entry, id, frame, out) => {
  const run = spawnSync("npx", ["remotion", "still", entry, id, out, `--frame=${frame}`], {
    encoding: "utf8", timeout: 600_000, shell: process.platform === "win32",
  });
  // maxPathHint is empty unless this checkout is deep enough that Windows cannot
  // start the browser Remotion downloaded into it — the ENOENT-about-a-file-that-
  // exists in defect D1. Appended here so this probe explains it too, not only
  // the npm scripts that go through run-remotion.mjs.
  if (run.status !== 0) throw new Error(`remotion still ${id}@${frame} failed: ${(run.stderr || run.stdout || "").slice(-500)}${maxPathHint() ?? ""}`);
  return out;
};

// PNG -> raw RGB24 at SAMPLE_W x SAMPLE_H. No image library: ffmpeg is already
// a hard requirement of this repo, and one pipe is smaller than a dependency.
const pixels = (png) => {
  const run = spawnSync("ffmpeg", ["-v", "error", "-i", png, "-vf", `scale=${SAMPLE_W}:${SAMPLE_H}`,
    "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { timeout: 120_000, maxBuffer: 64 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`ffmpeg decode failed: ${String(run.stderr).slice(0, 400)}`);
  const want = SAMPLE_W * SAMPLE_H * 3;
  if (run.stdout.length !== want) throw new Error(`ffmpeg returned ${run.stdout.length} bytes, expected ${want}`);
  return run.stdout;
};

const diffShare = (a, b) => {
  let differing = 0;
  for (let i = 0; i < a.length; i += 3) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d > CHANNEL_DELTA) differing++;
  }
  return differing / (a.length / 3);
};

const meanHex = (buf) => {
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < buf.length; i += 3) { r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; }
  const n = buf.length / 3;
  return "#" + [r / n, g / n, b / n].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
};

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const targets = only.length ? TARGETS.filter((t) => only.includes(t.id)) : TARGETS;
if (!targets.length) { console.error(`No such composition. Known: ${TARGETS.map((t) => t.id).join(", ")}`); process.exit(2); }

mkdirSync(EVIDENCE, { recursive: true });
const results = [];
for (const t of targets) {
  const f0 = path.join(EVIDENCE, `${t.id}-frame000.png`);
  const f4 = path.join(EVIDENCE, `${t.id}-frame004.png`);
  still(t.entry, t.id, 0, f0);
  still(t.entry, t.id, 4, f4);
  const p0 = pixels(f0), p4 = pixels(f4);
  const share = diffShare(p0, p4);
  const row = {
    id: t.id, renderer: t.renderer, backdrop: t.backdrop,
    frame0: f0.replace(/\\/g, "/"), frame4: f4.replace(/\\/g, "/"),
    frame0Mean: meanHex(p0), frame4Mean: meanHex(p4),
    diffShare: Number(share.toFixed(4)), maxDiffShare: MAX_DIFF_SHARE,
    verdict: share <= MAX_DIFF_SHARE ? "PASS" : "FAIL",
  };
  results.push(row);
  console.log(`${row.verdict}  ${t.id.padEnd(18)} frame0=${row.frame0Mean} frame4=${row.frame4Mean} diff=${(share * 100).toFixed(1)}%`);
}

const failed = results.filter((r) => r.verdict === "FAIL");
const receipt = {
  probe: "opening-frame",
  defect: "D2 - clip opens on the container backdrop because the step cross-fade has nothing to fade from at step 0",
  assertion: `frames 0 and 4 of a step differ only by the opening fade, so they must match within ${MAX_DIFF_SHARE * 100}% of pixels`,
  producer: "node probe-opening-frame.mjs (npm run probe:opening)",
  measuredAt: new Date().toISOString(),
  node: process.version, platform: process.platform,
  sample: { width: SAMPLE_W, height: SAMPLE_H, channelDelta: CHANNEL_DELTA },
  results,
  verdict: failed.length ? "FAIL" : "PASS",
};
mkdirSync(path.dirname(RECEIPT), { recursive: true });
writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2) + "\n");
console.log(`\n${receipt.verdict}: wrote ${RECEIPT}`);
if (failed.length) {
  console.error(`Opening flash on: ${failed.map((f) => `${f.id} (${f.renderer})`).join(", ")}`);
  process.exit(1);
}
