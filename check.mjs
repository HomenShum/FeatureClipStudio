#!/usr/bin/env node
// `npm run check` — the no-key gate. Two things, and it says how much of each it did.
//
//   1. every JavaScript file this toolkit ships parses
//   2. every .tours/*.tour step points at a line that exists
//
// WHY PART 1 IS A WALK AND NOT A LIST. Until 2026-08-13 this gate was fifteen
// `node --check` calls chained with && inside package.json. The list was kept by
// hand, so it drifted the way hand-kept lists do: it covered 15 of the 45 .mjs
// files in the repo, and the files it never opened included two of the four
// capture drivers (walkthrough.collab.mjs, walkthrough.roomos.mjs) and the whole
// soundtrack module. `nodekit.yaml` maps BOTH `doctor` and `check` to this
// command, so a green exit was answering "is the toolkit intact?" about a third
// of the toolkit. A directory walk cannot drift.
//
// WHY PART 2 IS HERE AND NOT ITS OWN SCRIPT. A CodeTour that points at a line
// which has since moved is worse than no tour: it teaches the reader something
// false about the code, and nothing anywhere fails. The check costs a file read
// per step, so it belongs in the command people already run.
//
// WHAT A GREEN EXIT DOES AND DOES NOT PROVE. `node --check` parses; it does not
// import, execute, or resolve a single dependency. Green means "every file here
// is syntactically valid JavaScript" and nothing more. The gates that actually
// run code are `npm run probe:opening` (renders three compositions and diffs the
// pixels) and the CI smoke render. See docs/codebase/TESTING.md.
//
// .jsx is excluded from part 1 because `node --check` cannot parse JSX. Those
// four files are covered by the CI smoke render, which imports them through
// Remotion.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

// Vendored, generated, or separately-installed trees. argo-demos and examples/
// are their own npm projects with their own dependencies; parsing them here
// would report failures this package cannot fix.
const SKIP = new Set([
  "node_modules", ".git", ".github", "out",
  "public", "assets", "promotion", "references", "decks", "fixtures",
  "examples", "argo-demos",
]);

const walk = (dir, found = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, found);
    else if (/\.m?js$/.test(entry.name)) found.push(path);
  }
  return found;
};

const problems = [];

// --- 1. every JavaScript file parses -----------------------------------------
const files = walk(".").sort();
let parsed = 0;
for (const file of files) {
  const run = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (run.status === 0) { parsed++; continue; }
  problems.push(`${file}\n${(run.stderr || "").trim().split("\n").slice(0, 3).join("\n")}`);
}

// --- 2. every CodeTour step resolves -----------------------------------------
const tours = existsSync(".tours") ? readdirSync(".tours").filter((f) => f.endsWith(".tour")).sort() : [];
let steps = 0, resolved = 0;
for (const tour of tours) {
  const { steps: tourSteps = [] } = JSON.parse(readFileSync(join(".tours", tour), "utf8"));
  tourSteps.forEach((step, i) => {
    steps++;
    const where = `${tour} step ${i + 1} (${step.file}:${step.line})`;
    if (!existsSync(step.file)) return problems.push(`${where} — no such file`);
    const lines = readFileSync(step.file, "utf8").split("\n").length;
    if (step.line >= 1 && step.line <= lines) resolved++;
    else problems.push(`${where} — file has ${lines} lines`);
  });
}

// Print the counts, always. A gate that reports only "ok" cannot be caught
// shrinking: the previous one lost thirty files without changing its output.
console.log(`[check] parsed ${parsed}/${files.length} JavaScript files; resolved ${resolved}/${steps} tour steps across ${tours.length} tours`);
if (problems.length) {
  console.error(`\n[check] ${problems.length} problem(s):\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
