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
  const model = path.join(VOICE_DIR, `${voiceModel}.onnx`).replace(/\\/g, "/");

  // Batch first — one process, one model load, fast. But Piper's ONNX session corrupts under
  // repeated synthesis on this machine: a line that fails 4/4 in a warm session synthesises 3/3 in
  // fresh processes, dying in ScatterND with a DIFFERENT garbage index each time. So the batch
  // records per-line failures instead of dying, and each failure retries in its own fresh process,
  // where the first synthesis is reliable.
  // The payload travels by FILE, never by string interpolation. A caption containing three single
  // quotes closed the generated Python's raw string — a syntax error at best, injection at worst,
  // since captions can be product UI text nobody vets as code.
  const payloadFile = path.join(OUT_DIR, "lines.json").replace(/\\/g, "/");
  writeFileSync(payloadFile, JSON.stringify(lines.map((l, i) => ({ i, text: l.text }))), "utf8");
  const batchCode = `
import json, wave, time
from piper import PiperVoice
lines = json.load(open(r"${payloadFile}", encoding="utf-8"))
v = PiperVoice.load(r"${model}")
out = []
for item in lines:
    f = r"${OUT_DIR}/beat%02d.wav" % item["i"]
    t = time.time()
    try:
        with wave.open(f, "wb") as w:
            v.synthesize_wav(item["text"], w)
        with wave.open(f) as w:
            dur = w.getnframes() / w.getframerate()
        out.append({"i": item["i"], "file": f, "seconds": dur, "synth": round(time.time()-t, 3)})
    except Exception as e:
        out.append({"i": item["i"], "file": f, "failed": type(e).__name__})
print(json.dumps(out))
`;
  const batch = python(batchCode);
  if (!batch.ok) throw new Error(`piper batch failed outright: ${batch.err.split(String.fromCharCode(10)).slice(-3).join(" ").slice(0, 200)}`);
  const results = JSON.parse(batch.out.split(String.fromCharCode(10)).filter(Boolean).pop());

  for (const entry of results) {
    if (!entry.failed) continue;
    let recovered = false;
    for (let attempt = 0; attempt < 2 && !recovered; attempt += 1) {
      const single = python(`
import json, wave, time
from piper import PiperVoice
v = PiperVoice.load(r"${model}")
t = time.time()
with wave.open(r"${OUT_DIR}/beat%02d.wav" % ${entry.i}, "wb") as w:
    v.synthesize_wav(json.load(open(r"${payloadFile}", encoding="utf-8"))[${entry.i}]["text"], w)
with wave.open(r"${OUT_DIR}/beat%02d.wav" % ${entry.i}) as w:
    dur = w.getnframes() / w.getframerate()
print(json.dumps({"seconds": dur, "synth": round(time.time()-t, 3)}))
`);
      if (single.ok) {
        const parsed = JSON.parse(single.out.split(String.fromCharCode(10)).filter(Boolean).pop());
        entry.seconds = parsed.seconds;
        entry.synth = parsed.synth;
        delete entry.failed;
        entry.freshProcessRetry = attempt + 1;
        recovered = true;
      }
    }
    if (!recovered) throw new Error(`beat ${entry.i + 1} failed in batch AND in 2 fresh processes — this is not the session bug`);
  }
  return results;
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
