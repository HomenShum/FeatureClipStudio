// readability.mjs — a plain-English gate on captions and narration.
//
// WHY THIS IS NOT LEFT TO THE JUDGE.
//
// `lay_sense` sat at 0/2 for three cuts and moved to 1/2 only when a voice was
// added. The LLM judge can tell you a video is too technical; it cannot tell you
// WHICH sentence, and it costs an API call and 40 seconds to ask. Reading ease is
// arithmetic. It runs in milliseconds, names the exact caption, and it runs
// BEFORE the render rather than after — which matters, because a caption is cheap
// to change before 2,338 frames are encoded and expensive after.
//
// The target is Flesch Reading Ease 100: roughly 8-word sentences built from
// one- and two-syllable words, which is where a general audience reads without
// effort. That is a hard bar for technical writing and it is meant to be. The
// number is not a style preference — a viewer who has to decode a sentence is
// not watching the screen while they do it, and the screen is where the proof is.
//
//   node readability.mjs --id TShero              (score every caption)
//   node readability.mjs --id TShero --min 80     (exit 1 if any caption is below)
//
import { COLLAB_WALKTHROUGHS } from "./src/walkthrough.collab.data.js";

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const id = flag("id");
const MIN = Number(flag("min", "0"));
if (!id) { console.error("usage: node readability.mjs --id <SpecId> [--min 80]"); process.exit(1); }

// Syllable estimate: vowel groups, minus silent trailing 'e', minimum 1. It is an
// approximation, and Flesch is itself an approximation, so precision beyond this
// buys nothing — the signal is "this sentence is hard", not a decimal place.
export const syllables = (word) => {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
};

export const flesch = (text) => {
  const clean = text.replace(/[—–]/g, " ").replace(/\s+/g, " ").trim();
  const sentences = Math.max(1, (clean.match(/[.!?]+/g) || []).length || 1);
  const words = clean.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  if (!words.length) return { ease: 100, words: 0, syll: 0, sentences };
  const syll = words.reduce((a, w) => a + syllables(w), 0);
  const ease = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syll / words.length);
  return { ease: Math.round(ease * 10) / 10, words: words.length, syll, sentences };
};

// Words that cost the most: long, and jargon a general viewer has never met.
// Reported alongside the score so a rewrite has somewhere to start.
const HARD = (text) => text.split(/\s+/)
  .map((w) => w.replace(/[^A-Za-z-]/g, ""))
  .filter((w) => w.length > 3 && syllables(w) >= 3);

if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  const wt = COLLAB_WALKTHROUGHS.find((w) => w.id === id);
  if (!wt) { console.error(`no walkthrough "${id}"`); process.exit(1); }
  const caps = wt.steps.map((s, i) => ({ i, text: s.caption })).filter((c) => c.text);

  let fails = 0;
  const all = [];
  caps.forEach((c) => {
    const r = flesch(c.text);
    all.push(r.ease);
    const bad = MIN && r.ease < MIN;
    if (bad) fails++;
    const hard = HARD(c.text);
    console.log(
      `${bad ? "FAIL" : "  ok"}  ${String(r.ease).padStart(6)}  step ${String(c.i).padStart(2)}  ` +
      `${r.words}w/${r.sentences}s  ${JSON.stringify(c.text.slice(0, 62))}` +
      (hard.length ? `\n            hard: ${hard.join(", ")}` : ""));
  });
  // SPEAKING RATE, measured against the genre rather than guessed.
  // Long-form walkthroughs on YouTube run 170-190 wpm:
  //   Perplexica code walkthrough   48.6 min   8,380 words   172 wpm
  //   Hello Interview, design Twitter 23.1 min 4,436 words   192 wpm
  // The first cut of this repo's own decisions video ran 288 wpm -- 1.6x the
  // band -- because holds were shrunk to exactly fit the speech with no room to
  // breathe. Fast narration does not read as energetic, it reads as a person
  // who does not expect to be understood.
  const totalWords = caps.reduce((a, c) => a + c.text.split(/\s+/).filter(Boolean).length, 0);
  const minutes = wt.steps.reduce((a, st) => a + (st.hold || 60), 0) / 30 / 60;
  const wpm = Math.round(totalWords / minutes);
  const RATE = [165, 195];
  const rateOk = wpm >= RATE[0] && wpm <= RATE[1];
  console.log(`
${rateOk ? "  ok" : "FAIL"}  speaking rate ${wpm} wpm over ${minutes.toFixed(1)} min ` +
              `(${totalWords} words) · reference band ${RATE[0]}-${RATE[1]}`);
  if (!rateOk) console.log(`        ${wpm > RATE[1] ? "too fast — lengthen holds" : "too slow — trim holds or add content"}`);
  if (MIN && !rateOk) fails++;

  const mean = Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10;
  console.log(`\nmean reading ease ${mean} over ${caps.length} captions` + (MIN ? ` · gate ${MIN} · ${fails} below` : ""));
  if (MIN && fails) process.exit(1);
}
