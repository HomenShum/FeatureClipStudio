// An arcade score for a walkthrough — square waves, a drum pulse, coin blips — keyed to the beats.
//
// The first bed was refuted by ear: two detuned sines on an open A-minor fifth over brown noise,
// which is not "plain", it is the literal horror-ambient recipe. Wrong palette, not wrong idea.
// Game audio is the right register for a product demo because it is the one genre engineered to
// make WATCHING INTERACTION feel rewarding: a click pays a coin, progress rises, sections build.
//
// What makes it game-dev rather than another drone, each of these checkable:
//
//   PALETTE    square leads (sgn of a sine) and a triangle bass — chiptune timbres, C major
//              pentatonic, rising through the film. No minor intervals, no noise floor.
//   PULSE      a kick with a pitch-drop thump at 120 BPM and eighth-note hats. A pulse is what
//              makes footage feel like it is moving forward.
//   ARRANGEMENT sections, not volume: melody alone at the open, hats join, then bass, then kick.
//              Layers dropping in ARE the dynamics — the thing the flat bed could never fake.
//   COINS      clicks pay a two-note coin blip (E6 -> B6); transitions get a fast rising arp.
//              Sound on real events, still: a click heard and seen is one event.
//
// Loudness is normalised TWO-PASS LINEAR. Single-pass loudnorm is dynamic — it rides the level and
// crushes exactly the section contrast the arrangement builds. Two-pass measures first, then applies
// one linear gain, so quiet sections stay quiet relative to loud ones.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export const FPS = 30;
const BPM = 120;

// C major pentatonic, rising with the story. Rising = building, and pentatonic cannot land on a
// sour interval, which is what keeps a procedural melody from sounding accidental.
const MELODY_HZ = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 659.26, 783.99];
const BASS_HZ = [65.41, 65.41, 82.41, 82.41, 98.0, 98.0, 130.81, 130.81]; // C2 C2 E2 E2 G2 G2 C3 C3

/** Which layers play in a given beat — the arrangement, stated as data so it can be asserted on. */
export function arrangementFor(beatIndex, beatCount) {
  const progress = beatIndex / Math.max(1, beatCount - 1);
  return {
    melody: true,
    hats: beatIndex >= 1,
    bass: beatIndex >= 2,
    kick: progress >= 0.45,
    gain: 0.5 + 0.5 * progress,
  };
}

function ff(args, { timeout = 300_000 } = {}) {
  const run = spawnSync("ffmpeg", ["-y", "-v", "error", ...args], { encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`ffmpeg failed: ${(run.stderr || "").slice(0, 400)}`);
}

/** Square wave: sgn(sin). The chiptune lead. Gentle decay per beat so notes speak, not drone. */
const square = (hz, dur, vol) =>
  `aevalsrc='${vol}*sgn(sin(2*PI*${hz}*t))*exp(-1.2*t)':s=48000:d=${dur}`;

/** Triangle-ish bass: asin(sin) scaled. Softer than square, holds the floor without mud. */
const triangle = (hz, dur, vol) =>
  `aevalsrc='${vol}*(2/PI)*asin(sin(2*PI*${hz}*t))':s=48000:d=${dur}`;

/** Kick at 120 BPM: a sine whose pitch drops 125->55 Hz every half second with a fast decay. */
const kick = (dur, vol) =>
  `aevalsrc='${vol}*sin(2*PI*(55+70*exp(-25*mod(t,${(60 / BPM).toFixed(3)})))*t)*exp(-9*mod(t,${(60 / BPM).toFixed(3)}))':s=48000:d=${dur}`;

/** Eighth-note hats: white noise highpassed, gated by a tremolo at 2x the beat rate. */
const hats = (dur, vol) =>
  `anoisesrc=d=${dur}:c=white:a=${vol},highpass=f=6500,tremolo=f=${(BPM / 60) * 2}:d=0.95`;

/**
 * The bed, one segment per storyboard beat, layers per the arrangement.
 * Per-beat segments with literal volumes — the envelope-expression approach was a measured no-op
 * (-54.7 dB at both ends), and a segment cannot fail that way.
 */
function bedFilters(steps, fps) {
  const filters = [];
  const segLabels = [];
  const n = steps.length;
  for (const [i, step] of steps.entries()) {
    const dur = ((step.hold || 60) / fps).toFixed(3);
    const arr = arrangementFor(i, n);
    const layers = [];
    filters.push(`${square(MELODY_HZ[i % MELODY_HZ.length], dur, (0.10 * arr.gain).toFixed(4))}[m${i}]`);
    layers.push(`[m${i}]`);
    if (arr.hats) { filters.push(`${hats(dur, (0.05 * arr.gain).toFixed(4))}[h${i}]`); layers.push(`[h${i}]`); }
    if (arr.bass) { filters.push(`${triangle(BASS_HZ[i % BASS_HZ.length], dur, (0.16 * arr.gain).toFixed(4))}[b${i}]`); layers.push(`[b${i}]`); }
    if (arr.kick) { filters.push(`${kick(dur, (0.30 * arr.gain).toFixed(4))}[k${i}]`); layers.push(`[k${i}]`); }
    filters.push(`${layers.join("")}amix=inputs=${layers.length}:normalize=0[seg${i}]`);
    segLabels.push(`[seg${i}]`);
  }
  filters.push(`${segLabels.join("")}concat=n=${segLabels.length}:v=0:a=1[bedraw]`);
  return filters;
}

/** Coin blip on a click: E6 then B6, 50/80 ms — the classic pickup. Arp on transitions. */
function cueFilters(steps, fps) {
  const filters = [];
  const labels = [];
  let frame = 0;
  let c = 0;
  for (const [i, step] of steps.entries()) {
    const at = frame / fps;
    if (i > 0) {
      const ms = Math.round(at * 1000);
      for (const [j, hz] of [523.25, 659.26, 783.99].entries()) {
        filters.push(`aevalsrc='0.07*sgn(sin(2*PI*${hz}*t))*exp(-30*t)':s=48000:d=0.06,adelay=${ms + j * 38}|${ms + j * 38}[t${c}]`);
        labels.push(`[t${c}]`); c += 1;
      }
    }
    if (step.click) {
      const ms = Math.round((at + 0.12) * 1000);
      filters.push(`aevalsrc='0.16*sgn(sin(2*PI*1318.5*t))*exp(-18*t)':s=48000:d=0.06,adelay=${ms}|${ms}[q${c}]`);
      labels.push(`[q${c}]`); c += 1;
      filters.push(`aevalsrc='0.14*sgn(sin(2*PI*1975.5*t))*exp(-10*t)':s=48000:d=0.09,adelay=${ms + 55}|${ms + 55}[q${c}]`);
      labels.push(`[q${c}]`); c += 1;
    }
    frame += step.hold || 60;
  }
  return { filters, labels, seconds: frame / fps };
}

function measure(file) {
  const run = spawnSync("ffmpeg", ["-v", "info", "-i", file, "-af", "loudnorm=print_format=json", "-f", "null", "-"], { encoding: "utf8", timeout: 300_000, maxBuffer: 32 * 1024 * 1024 });
  const match = `${run.stdout ?? ""}${run.stderr ?? ""}`.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
  if (!match) return null;
  const j = JSON.parse(match[0]);
  return { I: Number(j.input_i), LRA: Number(j.input_lra), TP: Number(j.input_tp), thresh: Number(j.input_thresh) };
}

/** Mean level of a time slice — how the arrangement is asserted rather than assumed. */
export function sliceLevel(file, from, dur = 2) {
  const run = spawnSync("ffmpeg", ["-v", "info", "-ss", String(from), "-t", String(dur), "-i", file, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8", timeout: 300_000 });
  const m = `${run.stderr ?? ""}`.match(/mean_volume: (-?[\d.]+) dB/);
  return m ? Number(m[1]) : null;
}

/**
 * Build the full score: bed + cues (+ narration ducked in), two-pass linear loudnorm.
 */
export function buildScore({ steps, outFile, narration = null, fps = FPS, targetI = -13.5, targetTP = -1.0 }) {
  mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  const { filters: cueF, labels: cueL, seconds } = cueFilters(steps, fps);
  const filters = [...bedFilters(steps, fps), ...cueF];
  const inputs = [];

  filters.push(`[bedraw]afade=t=in:st=0:d=0.4,afade=t=out:st=${(seconds - 1.2).toFixed(2)}:d=1.2[bed]`);
  filters.push(`[bed]${cueL.join("")}amix=inputs=${cueL.length + 1}:normalize=0:dropout_transition=0[music]`);

  let out = "[music]";
  if (narration && existsSync(narration)) {
    inputs.push("-i", narration);
    filters.push(`[0:a]apad=whole_dur=${seconds.toFixed(2)},asplit=2[vkey][vout]`);
    filters.push(`[music][vkey]sidechaincompress=threshold=0.06:ratio=6:attack=15:release=350[ducked]`);
    filters.push(`[ducked][vout]amix=inputs=2:normalize=0[mix]`);
    out = "[mix]";
  }

  const raw = path.resolve(outFile).replace(/\.wav$/i, ".raw.wav");
  ff([...inputs, "-filter_complex", filters.join(";"), "-map", out, "-t", seconds.toFixed(2), "-ar", "48000", "-ac", "2", raw]);

  // Two-pass: measure the raw mix, then apply ONE linear gain. Dynamic (single-pass) loudnorm rides
  // the level and flattens the section contrast the arrangement exists to create.
  const pre = measure(raw);
  ff(["-i", raw, "-af",
    `loudnorm=I=${targetI}:TP=${targetTP}:LRA=20:linear=true:measured_I=${pre.I}:measured_LRA=${pre.LRA}:measured_TP=${pre.TP}:measured_thresh=${pre.thresh}`,
    "-ar", "48000", "-ac", "2", path.resolve(outFile)]);
  const post = measure(path.resolve(outFile));
  return { file: path.resolve(outFile), seconds, pre, post };
}

export function muxOnto(videoFile, audioFile, outFile) {
  // -map is not optional. The Remotion render carries its OWN audio stream — silent — and with two
  // audio candidates ffmpeg's default picked the first input's, so every mux shipped the silence
  // while the real mix sat unused in input 1. Measured: three delivered videos, all -91 dB.
  ff(["-i", path.resolve(videoFile), "-i", path.resolve(audioFile), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", path.resolve(outFile)]);
  return path.resolve(outFile);
}
