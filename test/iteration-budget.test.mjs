import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const iterator = fileURLToPath(new URL("../iterate.mjs", import.meta.url));
const audience = "a newcomer reviewing the release candidate";
// Fixed child outcomes isolate the real iterator's budget, history and exit contract.
const judge = `
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
const { statuses, missingVerdict } = JSON.parse(readFileSync("scenario.json", "utf8"));
appendFileSync("calls.jsonl", JSON.stringify(process.argv.slice(2)) + "\\n");
const count = readFileSync("calls.jsonl", "utf8").trim().split("\\n").length;
const status = statuses[Math.min(count - 1, statuses.length - 1)];
const base = process.argv[2].replace(/\\.(mp4|webm|mov)$/i, "");
if (!missingVerdict) writeFileSync(base + ".judge.json", JSON.stringify({
  scores: { craft: { score: status === 0 ? 32 : 12 } },
  verdict: status === 0 ? "pass" : "revise",
  weakest: "premise", weakest_comprehension: "context",
  next_cut: [{ dimension: "context", where: "opening", change: "Show the user goal" }]
}));
process.exit(status);
`;

function fixture(statuses = [0], missingVerdict = false) {
  const cwd = mkdtempSync(join(tmpdir(), "fcs-iteration-budget-"));
  writeFileSync(join(cwd, "judge-rubric.mjs"), judge);
  writeFileSync(join(cwd, "scenario.json"), JSON.stringify({ statuses, missingVerdict }));
  console.log(`[iteration fixture] ${cwd}`);
  return cwd;
}

async function run(cwd, budget = []) {
  const args = [iterator, "--comp", "OfflineRelease", "--no-render",
    "--out", "release clip.mp4", "--for", audience, "--gate", "28", ...budget];
  let result;
  try {
    result = { status: 0, ...await exec(process.execPath, args, {
      cwd, timeout: 10_000, maxBuffer: 256 * 1024,
    }) };
  } catch (error) {
    assert.equal(error.killed, false, "iterator must finish within the fixture deadline");
    assert.equal(typeof error.code, "number", "iterator must exit, not fail to launch");
    result = { status: error.code, stdout: error.stdout, stderr: error.stderr };
  }
  const read = (name) => existsSync(join(cwd, name)) ? readFileSync(join(cwd, name), "utf8") : "";
  result.calls = read("calls.jsonl").trim().split("\n").filter(Boolean).map(JSON.parse);
  result.history = read("release clip.rounds.md");
  result.brief = read("release clip.next-cut.md");
  // Retain observations with the fixture, including failing/original-source runs.
  writeFileSync(join(cwd, `observation-${Date.now()}.json`), JSON.stringify(result, null, 2));
  return result;
}

function assertCalls(result, count) {
  assert.equal(result.calls.length, count);
  assert.equal((result.history.match(/^## Round /gm) ?? []).length, count);
  for (const args of result.calls)
    assert.deepEqual(args, ["release clip.mp4", "--for", audience, "--gate", "28"]);
}

for (const value of ["0", "-1", "not-a-number", "1.5", "Infinity", "-Infinity", "9007199254740992", ""]) {
  test(`release agent refuses invalid round budget ${JSON.stringify(value)} before judging`, async () => {
    const result = await run(fixture(), ["--rounds", value]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--rounds must be a positive safe integer/);
    assertCalls(result, 0);
    assert.equal(result.brief, "");
  });
}

test("release agent refuses an explicitly missing budget", async () => {
  const result = await run(fixture(), ["--rounds"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--rounds must be a positive safe integer/);
  assertCalls(result, 0);
  assert.equal(result.brief, "");
});

test("a valid review passes once for default, explicit and large safe budgets", async () => {
  for (const budget of [[], ["--rounds", "1"], ["--rounds", "2"], ["--rounds", "3"], ["--rounds", "9007199254740991"]]) {
    const result = await run(fixture(), budget);
    assert.equal(result.status, 0);
    assertCalls(result, 1);
    assert.match(result.history, /32\/40 — pass/);
    assert.equal(result.brief, "");
  }
});

test("failed reviews exhaust exactly three rounds and preserve actionable feedback", async () => {
  const result = await run(fixture([1]), ["--rounds", "3"]);
  assert.equal(result.status, 1);
  assertCalls(result, 3);
  assert.match(result.brief, /round 3/);
  assert.match(result.brief, /Show the user goal/);
});

test("the second review can pass inside a two-round budget", async () => {
  const result = await run(fixture([1, 0]), ["--rounds", "2"]);
  assert.equal(result.status, 0);
  assertCalls(result, 2);
  assert.match(result.history, /12\/40 — revise[\s\S]*32\/40 — pass/);
  assert.equal(result.brief, "");
});

test("a judge failure without a scorecard remains a failed default round", async () => {
  const result = await run(fixture([1], true));
  assert.equal(result.status, 1);
  assertCalls(result, 1);
  assert.match(result.history, /no verdict/);
  assert.match(result.brief, /round 1/);
});

test("four simultaneous release jobs keep their histories and outcomes separate", async () => {
  const outcomes = await Promise.all([0, 1, 0, 1].map(async (status) => {
    const result = await run(fixture([status]), ["--rounds", "2"]);
    assert.equal(result.status, status);
    assertCalls(result, status === 0 ? 1 : 2);
    return result.status;
  }));
  assert.deepEqual(outcomes, [0, 1, 0, 1]);
});

test("twelve later attempts preserve earlier review history on the same output", async () => {
  const cwd = fixture();
  let previous = "";
  for (let attempt = 1; attempt <= 12; attempt++) {
    const result = await run(cwd);
    assert.equal(result.status, 0);
    assertCalls(result, attempt);
    assert.ok(result.history.startsWith(previous));
    previous = result.history;
  }
});
