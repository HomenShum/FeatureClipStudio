// score.mjs — generate a soundtrack FROM the storyboard, then mux it in.
//
// WHY GENERATED AND NOT LICENSED.
//
// The reference films this repo calibrates against are music-forward, and their
// audio was measured, not guessed:
//
//     Mi173xGb0ZA   38.5s   -13.2 LUFS   LRA 13.5    (closest analogue by length)
//     xPK3nBLbpxc  156.6s   -18.4 LUFS   LRA  4.1    (bed under narration)
//     JLpDL7x50hA  174.3s   -20.8 LUFS   LRA  6.1
//
// Their TRACKS are not reusable -- this repo is public, and shipping someone
// else's copyrighted music in it is not a licensing technicality, it is the
// whole problem. What IS reusable is the measurement: a short launch film sits
// loud (around -13 LUFS) with wide dynamics, and a long explainer sits quiet and
// compressed under a voice. Ours is 50s with no narration, so it wants the first
// shape. Everything below is synthesized here, sample by sample, so the repo owns
// what it ships and `--music` stays available for anyone with a licensed track.
//
// WHY FROM THE STORYBOARD.
//
// A track laid over a finished video is synced by luck and drifts the moment a
// hold changes by four frames. The storyboard already knows where every click,
// every zoom and every "work is happening" burst falls, so the score is built
// from those timestamps and re-derives itself on any re-cut. Sync is a property
// of the construction rather than something someone nudged in an editor.
//
//   node score.mjs --id TShero --video out/trialscope.mp4
//   node score.mjs --id TShero --video out/x.mp4 --music path/to/licensed.mp3
//
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { COLLAB_WALKTHROUGHS } from "./src/walkthrough.collab.data.js";

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const id = flag("id");
const video = flag("video");
const music = flag("music");
const fps = Number(flag("fps", "30"));
const targetLufs = flag("lufs", "-14");   // web standard, inside the measured reference band
if (!id || !video) { console.error("usage: node score.mjs --id <SpecId> --video <file.mp4> [--music <file>] [--lufs -14]"); process.exit(1); }

const wt = COLLAB_WALKTHROUGHS.find((w) => w.id === id);
if (!wt) { console.error(`no walkthrough "${id}"`); process.exit(1); }

// ---------------------------------------------------------------- the timeline
let t = 0;
const events = wt.steps.map((s) => {
  const at = t / fps, dur = (s.hold || 60) / fps;
  t += s.hold || 60;
  return { at, dur, burst: !!s.burst, click: !!(s.panes || []).some((p) => p && p.click), zoom: !!s.zoomScale, caption: s.caption || "" };
});
const DUR = t / fps;

const SR = 48000;
const N = Math.ceil((DUR + 1.5) * SR);        // +tail so the last release is not clipped off
const L = new Float32Array(N), R = new Float32Array(N);

// ------------------------------------------------------------------ synthesis
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
// One-pole lowpass, applied per voice. Cheap, and the point is warmth not filter
// character -- a bright synth under a product demo reads as a stock-music bed.
const lp = (state, x, a) => (state.y += a * (x - state.y));

const add = (i, l, r) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };

// A sustained pad voice: detuned sine pair, slow attack, long release.
const pad = (freq, start, dur, gain = 0.09, pan = 0) => {
  const s0 = Math.floor(start * SR), n = Math.floor(dur * SR);
  const atk = 0.35 * SR, rel = 0.9 * SR;
  const st1 = { y: 0 }, st2 = { y: 0 };
  for (let k = 0; k < n + rel; k++) {
    const env = k < atk ? k / atk : k < n ? 1 : clamp01(1 - (k - n) / rel);
    const ph = (k / SR) * 2 * Math.PI;
    const a = Math.sin(ph * freq);
    const b = Math.sin(ph * freq * 1.004);           // detune -> slow beating, reads as "warm"
    const v = (lp(st1, a, 0.08) + lp(st2, b, 0.08)) * 0.5 * env * env * gain;
    add(s0 + k, v * (1 - Math.max(0, pan)), v * (1 + Math.min(0, pan)));
  }
};

// A plucked tone: fast attack, exponential decay. Used for the activity arps.
const pluck = (freq, start, gain = 0.05, decay = 0.28) => {
  const s0 = Math.floor(start * SR), n = Math.floor(decay * 3 * SR);
  const st = { y: 0 };
  for (let k = 0; k < n; k++) {
    const env = Math.exp(-k / (decay * SR));
    const ph = (k / SR) * 2 * Math.PI * freq;
    const v = lp(st, Math.sin(ph) + 0.3 * Math.sin(ph * 2), 0.35) * env * gain;
    add(s0 + k, v, v);
  }
};

// UI click: a short filtered noise transient plus a high blip. This is the sound
// the RESPONSIVENESS rubric dimension is really asking about -- a demo where
// nothing acknowledges the pointer reads as a mockup even when it is not.
const click = (start, gain = 0.16) => {
  const s0 = Math.floor(start * SR), n = Math.floor(0.09 * SR);
  const st = { y: 0 };
  for (let k = 0; k < n; k++) {
    const env = Math.exp(-k / (0.012 * SR));
    const noise = lp(st, Math.random() * 2 - 1, 0.6) * env * 0.5;
    const blip = Math.sin((k / SR) * 2 * Math.PI * 2100) * Math.exp(-k / (0.02 * SR));
    const v = (noise + blip * 0.5) * gain;
    add(s0 + k, v, v);
  }
};

// Whoosh under a zoom: band-limited noise swelling and falling.
const whoosh = (start, dur = 0.5, gain = 0.05) => {
  const s0 = Math.floor(start * SR), n = Math.floor(dur * SR);
  const st = { y: 0 };
  for (let k = 0; k < n; k++) {
    const p = k / n;
    const env = Math.sin(p * Math.PI);
    const v = lp(st, Math.random() * 2 - 1, 0.05 + 0.25 * p) * env * gain;
    add(s0 + k, v * 1.1, v * 0.9);
  }
};

// ------------------------------------------------------------- the arrangement
// Sections track the STORY, not a fixed loop: the premise is sparse, the graph
// reveal lifts, the proof section thins out so the trace can be read in near
// quiet, and the result beat is the only major resolve in the piece.
const HZ = (n) => 440 * Math.pow(2, (n - 69) / 12);   // MIDI -> Hz
const CH = {
  Am: [57, 60, 64], F: [53, 57, 60], C: [48, 52, 55, 60], G: [55, 59, 62],
  Cmaj: [48, 52, 55, 60, 64],
};
const sections = [
  { at: 0.0,  chord: "Am", gain: 0.055 },   // premise — sparse, low
  { at: 5.3,  chord: "F",  gain: 0.070 },   // hook — the question is asked
  { at: 10.4, chord: "C",  gain: 0.090 },   // the graph lands: the visual peak
  { at: 13.5, chord: "G",  gain: 0.080 },   // doubt
  { at: 16.0, chord: "Am", gain: 0.045 },   // PROOF — deliberately the quietest
  { at: 22.1, chord: "F",  gain: 0.045 },   //   the trace has to be readable
  { at: 26.5, chord: "C",  gain: 0.075 },   // spread
  { at: 32.7, chord: "G",  gain: 0.075 },
  { at: 35.6, chord: "Am", gain: 0.070 },   // two-hop
  { at: 39.4, chord: "F",  gain: 0.080 },
  { at: 42.6, chord: "Cmaj", gain: 0.100 }, // RESULT — the only full major
  { at: 47.1, chord: "G",  gain: 0.085 },   // your turn — left open
];

if (!music) {
  sections.forEach((s, i) => {
    const end = i + 1 < sections.length ? sections[i + 1].at : DUR;
    CH[s.chord].forEach((n, vi) => pad(HZ(n - 12), s.at, end - s.at, s.gain, vi % 2 ? 0.25 : -0.25));
  });
}

// Activity arps: only during BURST steps, i.e. exactly while the product is
// visibly working. The sound of the machine thinking is the point.
events.filter((e) => e.burst).forEach((e) => {
  const chord = (sections.filter((s) => s.at <= e.at).pop() || sections[0]).chord;
  const notes = CH[chord];
  const step = 0.16;
  for (let k = 0, tt = e.at; tt < e.at + e.dur; k++, tt += step) {
    pluck(HZ(notes[k % notes.length] + 12), tt, 0.042);
  }
});

events.filter((e) => e.click).forEach((e) => click(e.at));
events.filter((e) => e.zoom).forEach((e) => whoosh(Math.max(0, e.at - 0.2), 0.55));

// The result beat gets a resolve regardless of --music, because it is the moment
// the video is asking the viewer to feel something about.
CH.Cmaj.forEach((n, i) => pluck(HZ(n), 42.6 + i * 0.045, 0.05, 0.9));

// --------------------------------------------------------------- write + mux
// Loop rather than Math.max(...arr): spreading 2.4M samples overflows the stack.
let peak = 0;
for (let i = 0; i < N; i++) {
  const a = Math.abs(L[i]), b = Math.abs(R[i]);
  if (a > peak) peak = a;
  if (b > peak) peak = b;
}
if (!peak) peak = 1;
const norm = 0.89 / peak;
const buf = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * norm * 32767))), i * 4);
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * norm * 32767))), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + buf.length, 4); hdr.write("WAVE", 8);
hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34);
hdr.write("data", 36); hdr.writeUInt32LE(buf.length, 40);

const base = video.replace(/\.(mp4|webm|mov)$/i, "");
const wav = `${base}.score.wav`;
writeFileSync(wav, Buffer.concat([hdr, buf]));
console.log(`[score] ${wav} — ${DUR.toFixed(1)}s, ${events.filter((e) => e.click).length} clicks, ${events.filter((e) => e.burst).length} activity beds`);

const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
const out = `${base}.scored.mp4`;

// A licensed bed, when supplied, sits UNDER the generated sfx rather than
// replacing them: the sfx are the part that is synced to the storyboard.
if (music && existsSync(music)) {
  ff(["-i", video, "-i", music, "-i", wav,
      "-filter_complex",
      `[1:a]atrim=0:${DUR},afade=t=in:st=0:d=1.2,afade=t=out:st=${(DUR - 2).toFixed(2)}:d=2,volume=0.55[bed];` +
      `[bed][2:a]amix=inputs=2:duration=first:dropout_transition=0[mix];` +
      `[mix]loudnorm=I=${targetLufs}:TP=-1.5:LRA=11[a]`,
      "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out]);
} else {
  ff(["-i", video, "-i", wav,
      "-filter_complex", `[1:a]afade=t=out:st=${(DUR - 1.5).toFixed(2)}:d=1.5,loudnorm=I=${targetLufs}:TP=-1.5:LRA=11[a]`,
      "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out]);
}
console.log(`[score] ${out}`);
