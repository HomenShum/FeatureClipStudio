// apply-captions.mjs — swap the caption text of a captured walkthrough without
// re-capturing it.
//
// Captions are RENDER-TIME data: they are drawn by Remotion over frames that were
// screenshotted at capture. Rewording one therefore changes no pixel of the app,
// and re-running a live capture to change a sentence would re-drive the real site
// for nothing. Both files are written so the spec still reproduces the data — a
// data file that has drifted from its spec is a capture nobody can repeat.
//
//   node apply-captions.mjs --id TShero --from captions.plain.json
//
import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const id = flag("id");
const from = flag("from");
const specFile = flag("spec", `walkthrough.${(id || "").toLowerCase()}.specs.mjs`);
if (!id || !from) { console.error("usage: node apply-captions.mjs --id <SpecId> --from <captions.json> [--spec <file>]"); process.exit(1); }

const NEW = JSON.parse(readFileSync(from, "utf8"));
const CAP_RE = /"caption": "(?:[^"\\]|\\.)*"/g;
const SPEC_RE = /cap: "(?:[^"\\]|\\.)*"/g;

const dataPath = "src/walkthrough.collab.data.js";
let s = readFileSync(dataPath, "utf8");
const i = s.indexOf(`"id": "${id}"`);
if (i < 0) { console.error(`no "${id}" in ${dataPath}`); process.exit(1); }
let j = s.indexOf("\n  },\n  {", i);
if (j < 0) j = s.length;

let k = 0;
const block = s.slice(i, j).replace(CAP_RE, (m) => (k < NEW.length ? `"caption": ${JSON.stringify(NEW[k++])}` : m));
if (k !== NEW.length) { console.error(`caption count mismatch: file has ${k}, json has ${NEW.length}`); process.exit(1); }
writeFileSync(dataPath, s.slice(0, i) + block + s.slice(j));

let m = 0;
try {
  const spec = readFileSync(specFile, "utf8").replace(SPEC_RE, (x) => (m < NEW.length ? `cap: ${JSON.stringify(NEW[m++])}` : x));
  writeFileSync(specFile, spec);
} catch { console.warn(`[captions] could not update ${specFile} — spec and data will drift`); }

console.log(`[captions] ${id}: ${k} in data, ${m} in ${specFile}`);
