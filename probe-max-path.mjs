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
//      MAX_PATH, and every command here that starts Remotion routes through the
//      code that produces it. The second half matters as much as the first: an
//      explanation that nothing calls is not a fix, and this repository has
//      shipped a correct-and-unreachable module before.
//
// WHAT FAILS ON THE PRE-FIX TREE. Both halves of assertion 2. Before
// run-remotion.mjs existed there was nothing to import and the npm scripts
// invoked `remotion` directly, so the reader got Remotion's ENOENT and nothing
// else. Assertion 1 passes on both trees — it is a fact about Windows, not about
// this code, and it is here so the explanation stays anchored to a measurement.
//
// Windows-only by nature. On Linux and macOS there is no 260-character limit,
// the defect cannot occur, and this probe reports SKIP rather than inventing a
// pass.

import { spawnSync } from "node:child_process";
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
const { MAX_PATH, CHECKOUT_BUDGET, maxPathHint } = await import(`./${HANDLER}`);

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
}

// --- 2b. everything that starts Remotion routes through the handler -----------
// The unwired-mechanism guard. Grepped rather than reasoned about, because the
// way this fix dies is someone editing one npm script back to a bare `remotion`.
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const bypass = Object.entries(pkg.scripts)
  .filter(([, cmd]) => /(^|[\s"'[])remotion\b/.test(cmd) && !cmd.includes(HANDLER))
  .map(([name]) => name);
ok("wiring: no npm script starts Remotion directly", bypass.length === 0,
  bypass.length ? `${bypass.join(", ")} bypass ${HANDLER}, so their reader gets the bare ENOENT` : `${Object.keys(pkg.scripts).length} scripts checked`);

const CALLERS = ["clip.mjs", "probe-opening-frame.mjs", ".github/workflows/ci.yml"];
const unguarded = CALLERS.filter((f) => !readFileSync(f, "utf8").includes(HANDLER));
ok("wiring: every other file that starts Remotion reaches the handler", unguarded.length === 0,
  unguarded.length ? `${unguarded.join(", ")} start Remotion without reaching ${HANDLER}` : CALLERS.join(", "));

// --- receipt ------------------------------------------------------------------
const receipt = {
  probe: "max-path",
  defect: "D1 - on Windows, a checkout deep enough to push Remotion's browser past MAX_PATH fails with ENOENT about a file that is present",
  assertion: "the 260-character boundary is real on this machine, and this repository turns hitting it into a message that says MAX_PATH from every command that starts Remotion",
  producer: "node probe-max-path.mjs (npm run probe:maxpath)",
  measuredAt: new Date().toISOString(),
  node: process.version, platform: process.platform,
  maxPath: MAX_PATH, checkoutBudget: CHECKOUT_BUDGET,
  checkoutLength: process.cwd().length,
  measurement,
  checks,
  verdict: problems.length ? "FAIL" : (measurement.skipped ? "PASS (boundary skipped: not Windows)" : "PASS"),
};
mkdirSync(path.dirname(RECEIPT), { recursive: true });
writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2) + "\n");
if (scratch) rmSync(scratch, { recursive: true, force: true });

for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name} — ${c.detail}`);
console.log(`\n${receipt.verdict}: wrote ${RECEIPT}`);
if (problems.length) process.exit(1);
