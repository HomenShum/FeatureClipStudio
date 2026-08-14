#!/usr/bin/env node
// `npm run probe:maxpath` — the regression check for defect D1.
//
// D1, in the terms someone hitting it would use: they clone this repository,
// type the one command the README leads with, and are told that a file is
// missing. The file is not missing. It is a 203 MB copy of Chrome that Remotion
// downloaded, and it starts perfectly if you run it yourself. What actually
// happened is that Windows will not START a program whose full path is 260
// characters or longer, and it reports that refusal using the error code for a
// missing file (`ENOENT`). So the tool blames a download and the reader
// re-downloads, and the second download lands at the same too-long path.
//
// This probe asserts two things. It MEASURES the first rather than quoting the
// table in docs/codebase/CONCERNS.md, because a number copied from a document is
// not a measurement:
//
//   1. The boundary is real on this machine, right now. One real executable is
//      linked to a short path and to a path of 260-plus characters. From the
//      short one it runs; from the long one `spawn` returns ENOENT — while
//      `existsSync` answers true for both. That contradiction IS the defect.
//
//   2. This repository turns that exact situation into a message that names
//      MAX_PATH; routing a command through the code that produces it does not
//      corrupt the command; and nothing outside that code starts Remotion. The
//      last part is DISCOVERED, not listed — see section 2c for why that
//      distinction is the difference between a guard and a decoration.
//
// WHAT FAILS ON THE PRE-FIX TREE. Every part of assertion 2. Before
// run-remotion.mjs existed there was nothing to import and the npm scripts
// invoked `remotion` directly, so the reader got Remotion's ENOENT and nothing
// else. Assertion 1 passes on both trees — it is a fact about Windows, not about
// this code, and it is here so the explanation stays anchored to a measurement.
//
// Windows-only by nature. On Linux and macOS there is no 260-character limit,
// the defect cannot occur, and this probe reports SKIP rather than inventing a
// pass.

import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync,
  rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const RECEIPT = "promotion/evidence/max-path.json";
const HANDLER = "run-remotion.mjs";
const problems = [];
const checks = [];
const ok = (name, pass, detail) => { checks.push({ name, pass, detail }); if (!pass) problems.push(`${name} — ${detail}`); };

// --- 0. the handler exists at all ---------------------------------------------
// Checked before importing so the pre-fix failure says what is missing instead of
// dying with a module-resolution stack trace.
if (!existsSync(HANDLER)) {
  console.error(`FAIL  ${HANDLER} is missing — nothing in this repository turns the browser-launch ENOENT into a MAX_PATH explanation (defect D1).`);
  process.exit(1);
}
const { MAX_PATH, CHECKOUT_BUDGET, maxPathHint, remotionArgv } = await import(`./${HANDLER}`);

// --- 1. re-measure the boundary -----------------------------------------------
// A real executable, because the failure mode is CreateProcess refusing a long
// path; a text file would fail for a different reason and prove nothing.
let measurement = { skipped: true, reason: `not win32 (${process.platform})` };
let scratch = null;
if (process.platform === "win32") {
  scratch = mkdtempSync(path.join(tmpdir(), "fcs-maxpath-"));
  const NAME = path.basename(process.execPath);
  const short = path.join(scratch, NAME);

  // Nest 100-character directories so no single segment approaches the separate
  // 255-character limit on one name, then pad the last one to land past MAX_PATH.
  let dir = scratch;
  while (dir.length + 1 + 100 + 1 + NAME.length < MAX_PATH) dir = path.join(dir, "p".repeat(100));
  const pad = Math.max(MAX_PATH + 1 - (dir.length + 1 + 1 + NAME.length), 1);
  const long = path.join(dir, "p".repeat(pad), NAME);
  mkdirSync(path.dirname(long), { recursive: true });

  // A hard link is the same bytes at a second name — the only variable between
  // the two rows is the length of the string. Copy if the link cannot be made
  // (different volume); slower, still the same file content.
  const place = (dest) => { try { linkSync(process.execPath, dest); } catch { copyFileSync(process.execPath, dest); } };
  place(short); place(long);

  const shortRun = spawnSync(short, ["-e", "0"], { encoding: "utf8" });
  const longRun = spawnSync(long, ["-e", "0"], { encoding: "utf8" });
  measurement = {
    skipped: false,
    executable: NAME,
    short: { length: short.length, exists: existsSync(short), status: shortRun.status, error: shortRun.error?.code ?? null },
    long: { length: long.length, exists: existsSync(long), status: longRun.status, error: longRun.error?.code ?? null },
  };

  ok("boundary: a path under the limit runs", shortRun.status === 0,
    `${short.length} chars -> status ${shortRun.status}, error ${shortRun.error?.code ?? "none"}`);
  ok("boundary: a path at or over the limit returns ENOENT", longRun.error?.code === "ENOENT",
    `${long.length} chars -> status ${longRun.status}, error ${longRun.error?.code ?? "none"}`);
  ok("boundary: the long path exists anyway", existsSync(long),
    `existsSync said ${existsSync(long)} — if this is false the two halves of the contradiction no longer disagree`);

  // --- 2a. the handler explains that situation, and only that situation -------
  const hint = maxPathHint(long);
  ok("handler: names MAX_PATH for a present file over the limit",
    typeof hint === "string" && hint.includes("MAX_PATH") && hint.includes(long),
    hint ? `${hint.split("\n").length} lines, names the path: ${hint.includes(long)}` : "returned null");
  ok("handler: silent for a path under the limit", maxPathHint(short) === null,
    "a short path is not this defect and must keep Remotion's own message");
  ok("handler: silent for a long path that really is absent",
    maxPathHint(path.join(path.dirname(long), "definitely-not-here.exe")) === null,
    "a genuinely missing browser must keep saying ENOENT, which is then the truth");
  ok("handler: budget is derived, not written down", CHECKOUT_BUDGET === 154,
    `CHECKOUT_BUDGET is ${CHECKOUT_BUDGET}; 260 - 1 - 105 = 154`);

  // --- 2b. routing through the handler must not change the command -----------
  // Windows needs `shell: true` to start `npx.cmd`, and a shell re-splits every
  // argument on whitespace. The first version of this wrapper did not quote, so
  // `render … "out/my clip.mp4"` exited 0 and wrote `out/my.mp4`: the wrong file,
  // no error. A wrapper added to improve an error message must not corrupt the
  // command it wraps. Asserted over the vector runRemotion actually passes to
  // spawnSync — remotionArgv IS that vector, not a re-statement of it.
  // A tree that predates the quoting exports no vector at all; falling back to the
  // unquoted one makes that read as the failure it is instead of a stack trace.
  const argv = (remotionArgv ?? ((a) => ["remotion", ...a]))(
    ["render", "src/index.js", "WT-NodeRoom", "out/my clip.mp4", "--props", '{"n":1}']);
  ok("handler: an argument containing a space survives the shell",
    argv.includes('"out/my clip.mp4"'),
    `path argument is ${JSON.stringify(argv[4])} — unquoted, cmd.exe splits it and the render writes out/my.mp4`);
  ok("handler: an argument containing quotes survives the shell",
    argv.includes('"{\\"n\\":1}"'),
    `--props argument is ${JSON.stringify(argv.at(-1))} — a JSON blob loses its quotes unless they are escaped`);
}

// --- 2c. DISCOVER everything that starts Remotion, and assert it routes here ---
// The unwired-mechanism guard, and the reason it scans instead of reading a list.
//
// The version this replaces held three filenames and asked whether each contained
// the substring "run-remotion.mjs". It therefore could not fail for `iterate.mjs`
// — the caller nobody had put on the list, exposed as `npm run iterate` and
// documented as a non-optional gate — and for `.github/workflows/ci.yml` it
// passed with the smoke render reverted to a bare `npx remotion render`, because
// a COMMENT two lines above still contained the string. A guard that consults a
// list is blind by construction to the caller nobody remembered.
//
// So: read every tracked file that can EXECUTE something, strip its comments — a
// comment is not a command, in either direction — and find Remotion invocations.
// Any found outside the handler is a bypass, whoever added it and whenever.
//
// What this cannot see, and therefore does not claim: an invocation assembled
// from variables (`spawnSync(bin, [name, verb])`), and prose in a .md telling a
// reader to type one. Documents are not executed, and are not scanned.
const RUNNABLE = /\.(mjs|cjs|js|ya?ml|sh|ps1|cmd|bat)$|(^|\/)package\.json$/;
const VERB = "render|still|studio|compositions|browser|bundle|benchmark|versions|upgrade|preview|lambda|cloudrun|gpu";
const INVOCATION = [
  // a command line:            `npx remotion render …`, `remotion studio …`
  new RegExp(String.raw`(?<![\w./\\-])(?:npx\s+(?:-y\s+)?)?remotion\s+(?:${VERB})\b`, "i"),
  // an argument vector:        spawnSync("npx", ["remotion", "render", …])
  new RegExp(String.raw`["'\`]remotion["'\`]\s*,\s*["'\`](?:${VERB})\b`, "i"),
];
// Blanked in place, never deleted — the same trick check.mjs:115 uses on fenced
// blocks — so a reported line number still names the line the reader will open.
const blank = (b) => b.replace(/[^\n]/g, "");
const decomment = (text, file) =>
  /\.(mjs|cjs|js)$/.test(file) ? text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/^[ \t]*\/\/.*$/gm, blank)
  : /\.(ya?ml|sh|ps1)$/.test(file) ? text.replace(/^[ \t]*#.*$/gm, blank)
  : text;

const starts = (s) => INVOCATION.some((re) => re.test(s));
const sitesIn = (f) => {
  // npm runs the `scripts` values, not the prose around them — package.json's
  // own description says "Remotion render" and is not a command.
  if (/(^|\/)package\.json$/.test(f)) {
    const { scripts = {} } = JSON.parse(readFileSync(f, "utf8"));
    return Object.entries(scripts).filter(([, cmd]) => starts(cmd)).map(([name]) => `${f} (script "${name}")`);
  }
  return decomment(readFileSync(f, "utf8"), f).split(/\r?\n/)
    .flatMap((line, i) => (starts(line) ? [`${f}:${i + 1}`] : []));
};
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
const scanned = tracked.filter((f) => RUNNABLE.test(f) && f !== HANDLER && existsSync(f));
const bypasses = scanned.flatMap(sitesIn);
ok("wiring: nothing outside the handler starts Remotion", bypasses.length === 0,
  bypasses.length
    ? `${bypasses.join(", ")} — a reader of those gets the bare ENOENT, not the MAX_PATH explanation`
    : `${scanned.length} runnable files scanned, 0 invocations outside ${HANDLER}`);

// --- receipt ------------------------------------------------------------------
const receipt = {
  probe: "max-path",
  defect: "D1 - on Windows, a checkout deep enough to push Remotion's browser past MAX_PATH fails with ENOENT about a file that is present",
  assertion: "the 260-character boundary is real on this machine; this repository turns hitting it into a message that says MAX_PATH; the handler that prints it passes the command through unchanged, quoting included; and a scan of every runnable tracked file finds no Remotion invocation outside that handler",
  producer: "node probe-max-path.mjs (npm run probe:maxpath)",
  measuredAt: new Date().toISOString(),
  node: process.version, platform: process.platform,
  maxPath: MAX_PATH, checkoutBudget: CHECKOUT_BUDGET,
  checkoutLength: process.cwd().length,
  measurement,
  // Discovered, so a caller added tomorrow shows up here without anyone editing
  // this file. File:line only — putting the matched source text in a committed
  // receipt would make the receipt itself something the next scan has to read.
  wiring: { runnableFilesScanned: scanned.length, invocationsOutsideHandler: bypasses },
  checks,
  verdict: problems.length ? "FAIL" : (measurement.skipped ? "PASS (boundary skipped: not Windows)" : "PASS"),
};
mkdirSync(path.dirname(RECEIPT), { recursive: true });
writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2) + "\n");
if (scratch) rmSync(scratch, { recursive: true, force: true });

for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name} — ${c.detail}`);
console.log(`\n${receipt.verdict}: wrote ${RECEIPT}`);
if (problems.length) process.exit(1);
