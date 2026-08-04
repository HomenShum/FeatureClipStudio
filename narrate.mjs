// Speak the captions, timed to the beats they belong to.
//
// This exists because of a measurement rather than a preference. The comprehension axis scored the
// cut 1 out of 2 on all ten dimensions — nothing absent, nothing explicit, everything merely
// IMPLIED — and a recut that added premise, plain captions and a closer did not move it. Captions
// are read by people who are already paying attention; a voice reaches the ones who are not, and
// "implied" is precisely what a spoken sentence stops being.
//
// So this is the cheapest available attack on the axis that would not move: take the caption the
// storyboard already carries for each beat, say it out loud at that beat, and re-judge.
//
// Piper, measured locally at 3.6x realtime on CPU, which is what makes this re-runnable on every
// recut. Narration that is expensive to regenerate quietly stops being regenerated, and then it
// describes a cut that no longer exists — a stale measurement with a voice.
//
//   node narrate.mjs                       (writes out/narration.wav from the default walkthrough)
//   node narrate.mjs --voice en_US-amy-medium
//
// A caption longer than its beat is REPORTED rather than sped up or cut off. Compressing speech to
// fit a hold makes it harder to follow, which is the opposite of the reason narration was added.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const FPS = 30;
const OUT_DIR = "out/narration";
const VOICE_DIR = "out/tts";

function python(code, { timeout = 540_000 } = {}) {
  const run = spawnSync("python", ["-c", code], {
    encoding: "utf8",
    timeout,
    maxBuffer: 32 * 1024 * 1024,
    // PYTHONUTF8 because the phonemiser emits IPA and a Windows console codepage cannot print it —
    // a crash that looks exactly like a synthesis failure and is not one.
    env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
  });
  return { ok: run.status === 0, out: (run.stdout ?? "").trim(), err: (run.stderr ?? "").trim() };
}

/** One wav per beat, all from a single loaded voice — the load is 8s and the synthesis is not. */
export function synthesiseBeats(lines, voiceModel) {
  mkdirSync(OUT_DIR, { recursive: true });
  const payload = JSON.stringify(lines.map((l, i) => ({ i, text: l.text })));
  const model = path.join(VOICE_DIR, `${voiceModel}.onnx`).replace(/\\/g, "/");
  const code = `
import json, wave, time, sys
from piper import PiperVoice
lines = json.loads(r'''${payload}''')
v = PiperVoice.load(r"${model}")
out = []
for item in lines:
    f = r"${OUT_DIR}/beat%02d.wav" % item["i"]
    t = time.time()
    with wave.open(f, "wb") as w:
        v.synthesize_wav(item["text"], w)
    with wave.open(f) as w:
        dur = w.getnframes() / w.getframerate()
    out.append({"i": item["i"], "file": f, "seconds": dur, "synth": round(time.time()-t, 3)})
print(json.dumps(out))
`;
  const res = python(code);
  if (!res.ok) throw new Error(`piper synthesis failed: ${res.err.split("\n").slice(-3).join(" ").slice(0, 200)}`);
  const last = res.out.split("\n").filter(Boolean).pop();
  return JSON.parse(last);
}

/** Caption per beat, with the beat's start time and how long the beat lasts. */
export function linesFromStoryboard(steps, fps = FPS) {
  const lines = [];
  let frame = 0;
  for (const step of steps) {
    const holdSeconds = (step.hold || 60) / fps;
    if (step.caption) lines.push({ at: frame / fps, hold: holdSeconds, text: String(step.caption) });
    frame += step.hold || 60;
  }
  return lines;
}

/** Place each spoken beat at its own start time on one silent bed of the full length. */
export function assemble(lines, clips, totalSeconds, outFile) {
  const inputs = [];
  const filters = [];
  const labels = [];
  for (const [n, clip] of clips.entries()) {
    const line = lines[clip.i];
    inputs.push("-i", clip.file);
    const ms = Math.round(line.at * 1000);
    filters.push(`[${n}:a]aresample=48000,adelay=${ms}|${ms}[n${n}]`);
    labels.push(`[n${n}]`);
  }
  filters.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad=whole_dur=${totalSeconds.toFixed(2)}[out]`);
  const run = spawnSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", filters.join(";"), "-map", "[out]", "-t", totalSeconds.toFixed(2), "-ar", "48000", "-ac", "1", path.resolve(outFile)], {
    encoding: "utf8", timeout: 300_000, maxBuffer: 32 * 1024 * 1024,
  });
  if (run.status !== 0) throw new Error(`ffmpeg assemble failed: ${(run.stderr || "").slice(0, 200)}`);
  return path.resolve(outFile);
}

/** Beats whose narration is longer than the beat itself. Reported, never compressed to fit. */
export function overruns(lines, clips) {
  return clips
    .map((clip) => ({ ...clip, line: lines[clip.i] }))
    .filter((entry) => entry.seconds > entry.line.hold)
    .map((entry) => ({
      beat: entry.i + 1,
      spoken: Number(entry.seconds.toFixed(2)),
      hold: Number(entry.line.hold.toFixed(2)),
      over: Number((entry.seconds - entry.line.hold).toFixed(2)),
      text: entry.line.text.slice(0, 60),
    }));
}
