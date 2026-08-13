#!/usr/bin/env node
// `npm run check` — the no-key gate. Two things, and it says how much of each it did.
//
//   1. every JavaScript file this toolkit ships parses
//   2. every citation in the guided-reading docs — each .tours/*.tour step, and
//      every `file:line` written in docs/START_HERE.md or a tour description —
//      names a line that says what the citation claims it says
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
// WHY PART 2 READS THE LINE INSTEAD OF COUNTING LINES. Until 2026-08-13 this
// asserted `1 <= step.line <= lineCount` and nothing else. That proves an anchor
// is IN RANGE, never that it is CORRECT: insert twenty lines at the top of
// walkthrough.mjs and all 36 steps still pass while every one of them now points
// at the wrong symbol. So a citation has to carry what it expects to find, and
// this reads that line and compares. For a tour step the carrier is `pattern`,
// CodeTour's own field for associating a step with line CONTENT rather than an
// ordinal. CodeTour itself only consults it when `line` is absent, so here it costs
// the editor nothing and gives this gate the one thing it lacked: what the step
// expects to be looking at. In prose the carrier is the form `file:line` followed
// by the expected text, and prose that cites a line WITHOUT carrying its
// expectation is reported as a problem rather than skipped: a citation the gate
// cannot read is exactly how the unchecked citation came back.
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

// --- 2. every citation names a line that says what it claims -----------------
const source = new Map();
// Split on \r?\n: a Windows clone checks these files out with CRLF, and a
// trailing \r makes any pattern anchored with $ fail on a line that is correct.
const linesOf = (f) => {
  if (!source.has(f)) source.set(f, readFileSync(f, "utf8").split(/\r?\n/));
  return source.get(f);
};

// The one assertion, used by both callers below. Returns true only when the
// cited line really contains the expectation; on a miss it says where the
// expectation actually lives, so the repair is one number.
const cites = (where, file, line, expect, isRegExp) => {
  if (!existsSync(file)) return problems.push(`${where} — no such file: ${file}`);
  const lines = linesOf(file);
  if (line < 1 || line > lines.length) return problems.push(`${where} — ${file} has ${lines.length} lines`);
  const hits = isRegExp ? (l) => new RegExp(expect).test(l) : (l) => l.includes(expect);
  if (hits(lines[line - 1])) return true;
  const elsewhere = lines.findIndex(hits) + 1;
  problems.push(
    `${where} — ${file}:${line} reads ${JSON.stringify(lines[line - 1].trim().slice(0, 60))}, ` +
    `which does not match ${JSON.stringify(expect)}` +
    (elsewhere ? `; that is line ${elsewhere}` : "; it is nowhere in the file"),
  );
};

// A prose citation: `file.mjs:123` (`the text that line contains`).
const CITED = /`([\w./-]+\.\w+):(\d+)` \(`([^`]+)`\)/g;
// Citation-shaped prose left over once the checkable ones are blanked out: a bare
// `file:line`, and the "(line 136)" form these docs used to use.
const UNCHECKABLE = /[\w./-]+\.(?:mjs|js|jsx|json|yml|md):\d+|\blines? \d+/g;
let quoted = 0, checked = 0;
const prose = (label, text) => {
  // Fenced blocks quote source rather than cite it; a line number inside one is
  // part of the quoted code, not a claim about where that code lives.
  const body = text.replace(/```[\s\S]*?```/g, (b) => b.replace(/[^\n]/g, ""));
  const at = (i) => `${label}:${body.slice(0, i).split("\n").length}`;
  let rest = body;
  for (const m of body.matchAll(CITED)) {
    quoted++;
    if (cites(at(m.index), m[1], Number(m[2]), m[3], false) === true) checked++;
    // Blank the checked citation, in place, so the sweep below sees only the ones
    // that carry no expectation. Same length, so offsets still name the right line.
    rest = rest.slice(0, m.index) + m[0].replace(/[^\n]/g, " ") + rest.slice(m.index + m[0].length);
  }
  for (const m of rest.matchAll(UNCHECKABLE))
    problems.push(`${at(m.index)} — uncheckable citation ${JSON.stringify(m[0])}; write \`file:line\` (\`text that line contains\`)`);
};

const tours = existsSync(".tours") ? readdirSync(".tours").filter((f) => f.endsWith(".tour")).sort() : [];
let steps = 0, resolved = 0;
for (const tour of tours) {
  const { steps: tourSteps = [] } = JSON.parse(readFileSync(join(".tours", tour), "utf8"));
  tourSteps.forEach((step, i) => {
    steps++;
    const where = `${tour} step ${i + 1} (${step.file}:${step.line})`;
    if (!step.pattern) return problems.push(`${where} — no "pattern": a step must state what its line says`);
    if (cites(where, step.file, step.line, step.pattern, true) === true) resolved++;
    prose(`${tour} step ${i + 1} description`, step.description ?? "");
  });
}
for (const doc of ["docs/START_HERE.md"]) if (existsSync(doc)) prose(doc, readFileSync(doc, "utf8"));

// Print the counts, always. A gate that reports only "ok" cannot be caught
// shrinking: the previous one lost thirty files without changing its output.
console.log(`[check] parsed ${parsed}/${files.length} JavaScript files; ${resolved}/${steps} tour steps and ${checked}/${quoted} prose citations name a line that matches`);
if (problems.length) {
  console.error(`\n[check] ${problems.length} problem(s):\n` + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
