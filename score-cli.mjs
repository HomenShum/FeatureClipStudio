// score.mjs — generate a chiptune soundtrack FROM the storyboard, then mux it in.
//
// WHY CHIPTUNE, AFTER THE FIRST ATTEMPT WAS CALLED EERIE.
//
// The first version used detuned sine pads in A minor with a 350ms attack and a
// lowpass at ~1.2kHz. Every one of those choices is the recipe for horror
// ambient: minor key, slow swells, no rhythm, no transients, beating between
// detuned voices. It was reaching for "trustworthy and serious" and landed on
// "something is behind you". The lesson is not that the music was too quiet or
// too sparse -- it is that the INSTRUMENT PALETTE carries genre before any note
// does, and a product demo people are supposed to enjoy watching wants the
// arcade palette, not the documentary one.
//
// So: square and pulse waves, C major throughout, real drums on a 120 BPM grid,
// and game-feel sfx -- select blips, power-up sweeps on reveals, a coin-style
// jingle when the answer lands. Fast attacks, short decays, everything quantised
// to the beat so it grooves instead of drifts.
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
// else's copyrighted music in it is not a licensing technicality, it is the whole
// problem. What IS reusable is the measurement: a short launch film sits loud
// (around -13 LUFS) with wide dynamics. Everything below is synthesized here,
// sample by sample, so the repo owns what it ships, and `--music` stays available
// for anyone with a licensed track.
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
const vo = flag("vo");
const fps = Number(flag("fps", "30"));
const BPM = Number(flag("bpm", "120"));
const targetLufs = flag("lufs", "-14");
if (!id || !video) { console.error("usage: node score.mjs --id <SpecId> --video <file.mp4> [--music <file>] [--bpm 120] [--lufs -14]"); process.exit(1); }

const wt = COLLAB_WALKTHROUGHS.find((w) => w.id === id);
if (!wt) { console.error(`no walkthrough "${id}"`); process.exit(1); }

// ---------------------------------------------------------------- the timeline
let t = 0;
const events = wt.steps.map((s) => {
  const at = t / fps, dur = (s.hold || 60) / fps;
  t += s.hold || 60;
  return { at, dur, burst: !!s.burst, click: !!(s.panes || []).some((p) => p && p.click), zoom: !!s.zoomScale };
});
const DUR = t / fps;

const SR = 48000;
const N = Math.ceil((DUR + 1.5) * SR);
const L = new Float32Array(N), R = new Float32Array(N);
const BEAT = 60 / BPM;                      // 0.5s at 120
const add = (i, l, r) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };
const HZ = (n) => 440 * Math.pow(2, (n - 69) / 12);

// ------------------------------------------------------- chip voices
// Square/pulse rather than sine: the harmonic stack IS the arcade sound, and a
// pure sine reads as "test tone" or, with a slow attack, as dread.
const pulse = (ph, duty = 0.5) => ((ph % 1) < duty ? 1 : -1);

// Lead/arp voice. 6ms attack, exponential decay — percussive, never swells.
const blip = (freq, start, dur, gain = 0.06, duty = 0.5, pan = 0) => {
  const s0 = Math.round(start * SR), n = Math.round(dur * SR);
  const atk = Math.round(0.006 * SR);
  for (let k = 0; k < n; k++) {
    const env = (k < atk ? k / atk : Math.exp(-(k - atk) / (dur * 0.42 * SR)));
    const v = pulse((k / SR) * freq, duty) * env * gain;
    add(s0 + k, v * (1 - Math.max(0, pan)), v * (1 + Math.min(0, pan)));
  }
};

// Bass: low square, longer body, slight portamento-free chunk.
const bass = (freq, start, dur, gain = 0.10) => {
  const s0 = Math.round(start * SR), n = Math.round(dur * SR);
  for (let k = 0; k < n; k++) {
    const env = Math.min(1, k / (0.004 * SR)) * Math.exp(-k / (dur * 0.6 * SR));
    const v = pulse((k / SR) * freq, 0.5) * env * gain;
    add(s0 + k, v, v);
  }
};

// Drums, synthesized: kick = pitch-swept sine, snare = noise + tone body,
// hat = very short high noise. This is the part the first version had none of,
// and rhythm is most of what separates "game" from "unsettling".
const kick = (start, gain = 0.30) => {
  const s0 = Math.round(start * SR), n = Math.round(0.16 * SR);
  for (let k = 0; k < n; k++) {
    const p = k / n;
    const f = 120 * Math.exp(-p * 3.2) + 42;
    const v = Math.sin((k / SR) * 2 * Math.PI * f) * Math.exp(-k / (0.05 * SR)) * gain;
    add(s0 + k, v, v);
  }
};
const snare = (start, gain = 0.16) => {
  const s0 = Math.round(start * SR), n = Math.round(0.14 * SR);
  for (let k = 0; k < n; k++) {
    const env = Math.exp(-k / (0.035 * SR));
    const v = ((Math.random() * 2 - 1) * 0.8 + Math.sin((k / SR) * 2 * Math.PI * 190) * 0.3) * env * gain;
    add(s0 + k, v, v);
  }
};
const hat = (start, gain = 0.055, len = 0.028) => {
  const s0 = Math.round(start * SR), n = Math.round(len * SR);
  let prev = 0;
  for (let k = 0; k < n; k++) {
    const x = Math.random() * 2 - 1;
    const hp = x - prev; prev = x;                       // crude highpass -> "tss"
    add(s0 + k, hp * Math.exp(-k / (len * 0.4 * SR)) * gain, hp * Math.exp(-k / (len * 0.4 * SR)) * gain);
  }
};

// ------------------------------------------------------------- game-feel sfx
// Select blip: two fast rising squares. The sound a menu makes.
const sfxSelect = (start) => { blip(HZ(84), start, 0.055, 0.13, 0.25); blip(HZ(91), start + 0.055, 0.09, 0.13, 0.25); };
// Power-up: quick ascending run, used where the camera pushes in on a reveal.
const sfxPowerUp = (start) => [0, 4, 7, 12, 16].forEach((s, i) => blip(HZ(72 + s), start + i * 0.045, 0.10, 0.075, 0.5));
// Coin/answer jingle: the classic 2-note pickup, then a major triad landing.
const sfxCoin = (start) => { blip(HZ(88), start, 0.075, 0.14, 0.5); blip(HZ(95), start + 0.075, 0.30, 0.14, 0.5); };

// -------------------------------------------------------------- arrangement
// C major throughout. Sections still track the STORY -- what changes is the
// ENERGY (which layers are playing), not the key, because a minor detour is
// exactly what made the first attempt feel like a warning.
const CH = { C: [60, 64, 67], G: [55, 59, 62], Am: [57, 60, 64], F: [53, 57, 60] };
// `g` is a per-section GAIN, and it is doing the work that turning layers on and
// off could not. Measured: layer-only contrast produced just 3.5 dB of spread
// between the quietest and loudest section and an LRA of 4.9, against a reference
// LRA of 13.5 -- because a bass-and-hats floor running under every section keeps
// the level up no matter which layers are muted. Dynamics have to be explicit.
// Sections are pinned to STEP INDICES, not to seconds. They were seconds until
// narration re-timed the cut from 50.3s to 77.9s and every boundary silently
// pointed at the wrong beat -- which made the "sync is structural" claim only
// half true, since the sfx derived from events and the arrangement did not.
// An index survives a re-time; a timestamp does not.
const sections = [
  { step: 0,  ch: "C",  drums: false, arp: false, g: 0.30 },  // premise — barely there
  { step: 3,  ch: "G",  drums: true,  arp: true,  g: 0.80 },  // hook — the kit comes in
  { step: 6,  ch: "C",  drums: true,  arp: true,  g: 1.00 },  // graph reveal — full
  { step: 7,  ch: "Am", drums: true,  arp: true,  g: 0.85 },  // doubt — the one minor bar
  { step: 8,  ch: "F",  drums: false, arp: false, g: 0.16 },  // PROOF — near silence,
  { step: 10, ch: "C",  drums: false, arp: false, g: 0.16 },  //   the trace must be read
  { step: 11, ch: "G",  drums: true,  arp: true,  g: 0.88 },  // spread
  { step: 14, ch: "C",  drums: true,  arp: true,  g: 0.88 },
  { step: 15, ch: "Am", drums: true,  arp: true,  g: 0.92 },  // two-hop
  { step: 17, ch: "F",  drums: true,  arp: true,  g: 0.92 },
  { step: 18, ch: "C",  drums: true,  arp: true,  g: 1.00 },  // RESULT — the peak
  { step: 20, ch: "G",  drums: true,  arp: false, g: 0.62 },  // your turn — left open
].map((x) => ({ ...x, at: events[x.step] ? events[x.step].at : 0 }));
const sectionAt = (x) => sections.filter((s) => s.at <= x).pop() || sections[0];
const endOf = (i) => (i + 1 < sections.length ? sections[i + 1].at : DUR);

if (!music) {
  sections.forEach((s, i) => {
    const end = endOf(i), notes = CH[s.ch];
    // Bass on every beat; arp in 8ths; drums on the standard 4/4 grid.
    const g = s.g;
    for (let b = 0, x = s.at; x < end; b++, x = s.at + b * BEAT) {
      bass(HZ(notes[0] - 24), x, BEAT * 0.9, 0.085 * g);
      if (s.drums) {
        if (b % 4 === 0 || b % 4 === 2) kick(x, 0.30 * g);
        if (b % 4 === 1 || b % 4 === 3) snare(x, 0.16 * g);
        hat(x, 0.055 * g); hat(x + BEAT / 2, 0.04 * g);
      } else if (b % 2 === 0) {
        hat(x + BEAT / 2, 0.03 * g);
      }
      if (s.arp) {
        for (let e = 0; e < 2; e++) {
          const n = notes[(b * 2 + e) % notes.length] + 12;
          blip(HZ(n), x + e * (BEAT / 2), BEAT * 0.42, 0.05 * g, 0.25, e ? 0.2 : -0.2);
        }
      }
    }
  });
}

// Activity arps during BURST steps: a faster 16th run on top, so the moment the
// product is visibly working also SOUNDS like work happening.
events.filter((e) => e.burst).forEach((e) => {
  const notes = CH[sectionAt(e.at).ch];
  for (let k = 0, x = e.at; x < e.at + e.dur; k++, x += BEAT / 4) {
    blip(HZ(notes[k % notes.length] + 24), x, BEAT * 0.2, 0.035, 0.125, k % 2 ? 0.35 : -0.35);
  }
});

events.filter((e) => e.click).forEach((e) => sfxSelect(e.at));
events.filter((e) => e.zoom).forEach((e) => sfxPowerUp(Math.max(0, e.at - 0.15)));
sfxCoin(events[18] ? events[18].at : DUR - 6);   // the result beat — the answer landing

// --------------------------------------------------------------- write + mux
let peak = 0;
for (let i = 0; i < N; i++) { const a = Math.abs(L[i]), b = Math.abs(R[i]); if (a > peak) peak = a; if (b > peak) peak = b; }
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
console.log(`[score] ${wav} — ${DUR.toFixed(1)}s @ ${BPM}bpm, ${events.filter((e) => e.click).length} select blips, ${events.filter((e) => e.burst).length} activity runs`);

const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

// TWO-PASS loudnorm, and this is not a refinement -- single-pass loudnorm runs a
// dynamic normaliser that flattened the mix to LRA 2.3 against a reference of
// 13.5. The whole arrangement is built on contrast (drums drop out entirely so
// the trace can be read), and single-pass spent its effort undoing exactly that.
// Pass 1 measures, pass 2 applies LINEAR gain, which moves the level without
// touching the range.
const measure = (file) => {
  const out = execFileSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file,
    "-af", `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11:print_format=json`, "-f", "null", "-"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const m = (out.match(/\{[\s\S]*\}/) || [])[0];
  return m ? JSON.parse(m) : null;
};
const norm2 = (n) => n
  ? `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11:measured_I=${n.input_i}:measured_TP=${n.input_tp}:measured_LRA=${n.input_lra}:measured_thresh=${n.input_thresh}:offset=${n.target_offset}:linear=true`
  : `loudnorm=I=${targetLufs}:TP=-1.5:LRA=11`;
const NORM = norm2(measure(wav));
const out = `${base}.scored.mp4`;

// A licensed bed, when supplied, sits UNDER the generated sfx rather than
// replacing them: the sfx are the part that is synced to the storyboard.
if (music && existsSync(music)) {
  ff(["-i", video, "-i", music, "-i", wav,
      "-filter_complex",
      `[1:a]atrim=0:${DUR},afade=t=in:st=0:d=1.2,afade=t=out:st=${(DUR - 2).toFixed(2)}:d=2,volume=0.55[bed];` +
      `[bed][2:a]amix=inputs=2:duration=first:dropout_transition=0[mix];` +
      `[mix]${NORM}[a]`,
      "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out]);
} else if (vo && existsSync(vo)) {
  // Music ducked BY the narration via sidechain, rather than mixed at a fixed
  // low level: a static duck either buries the bed everywhere or lets it fight
  // the voice on the loud lines. The sidechain only pulls down while someone is
  // actually speaking, so the bed comes back up in the gaps.
  ff(["-i", video, "-i", wav, "-i", vo,
      "-filter_complex",
      `[1:a]afade=t=out:st=${(DUR - 1.2).toFixed(2)}:d=1.2[bed];` +
      `[bed][2:a]sidechaincompress=threshold=0.03:ratio=9:attack=12:release=320:makeup=1[duck];` +
      `[duck][2:a]amix=inputs=2:normalize=0:duration=longest[mix];[mix]${NORM}[a]`,
      "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out]);
} else {
  ff(["-i", video, "-i", wav,
      "-filter_complex", `[1:a]afade=t=out:st=${(DUR - 1.2).toFixed(2)}:d=1.2,${NORM}[a]`,
      "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out]);
}
console.log(`[score] ${out}`);
