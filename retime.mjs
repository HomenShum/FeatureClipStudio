// retime.mjs — set each step's hold from the MEASURED length of its narration.
//
// A storyboard is first timed for reading: how long a caption needs to be on
// screen for an eye to take it in. Speech is slower, and unevenly so — a line
// that reads in 1.2s can take 2.6s to say. Nine of 21 lines overran their hold
// the first time a voice was added.
//
// The wrong fix is to speed the reader up, because the picture under a caption is
// a STILL FRAME and holding it longer costs nothing but runtime. So voice.mjs
// writes the hold each step needs, and this applies it. Narration owns pacing.
//
//   node voice.mjs --id TShero --out out/x.vo.wav     (writes x.vo.holds.json)
//   node retime.mjs --id TShero --holds out/x.vo.holds.json
//
import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const id = flag("id");
const holdsFile = flag("holds");
const shrink = argv.includes("--shrink");   // allow holds to get SHORTER too
if (!id || !holdsFile) { console.error("usage: node retime.mjs --id <SpecId> --holds <holds.json> [--shrink]"); process.exit(1); }

const holds = JSON.parse(readFileSync(holdsFile, "utf8"));
const path = "src/walkthrough.collab.data.js";
let s = readFileSync(path, "utf8");
const i = s.indexOf(`"id": "${id}"`);
if (i < 0) { console.error(`no "${id}" in ${path}`); process.exit(1); }
let j = s.indexOf("\n  },\n  {", i);
if (j < 0) j = s.length;

// Only CAPTIONED steps are re-timed. A step with no caption has no narration, so
// its hold is a visual decision (a beat, a settle) that speech has no claim on.
let k = 0, changed = 0, before = 0, after = 0;
// `\r?\n`: git's autocrlf rewrites this file on checkout, and a regex that
// assumes LF silently matches nothing — which reports as "0/0 holds changed"
// rather than as an error, the most expensive kind of failure to notice.
const STEP_RE = /"caption": (null|"(?:[^"\\]|\\.)*"),\r?\n(\s*)"hold": (\d+)/g;
const block = s.slice(i, j).replace(STEP_RE, (m, cap, ws, old) => {
  const idx = k++;
  before += Number(old);
  if (cap === "null") { after += Number(old); return m; }
  const want = holds[String(idx)];
  const next = want == null ? Number(old) : shrink ? want : Math.max(Number(old), want);
  after += next;
  if (next !== Number(old)) changed++;
  return `"caption": ${cap},\n${ws}"hold": ${next}`;
});
writeFileSync(path, s.slice(0, i) + block + s.slice(j));
console.log(`[retime] ${id}: ${changed}/${k} holds changed — ${(before / 30).toFixed(1)}s -> ${(after / 30).toFixed(1)}s`);
