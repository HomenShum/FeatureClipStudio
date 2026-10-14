// Request-shape test (model-defaults SPEC Part A §A.0.6 / §A.2.4): run each real Gemini-calling
// script as a subprocess with a fake fetch and assert the model in the request URL, and that the
// keys Gemini 3.6+ rejects are absent. Scenario: one operator sets GEMINI_JUDGE_MODEL to pin an
// older judge; the observer (analyze-reference) must follow the same pin as the judge scripts.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const preload = pathToFileURL(path.join(root, "test/support/fake-gemini-fetch.mjs")).href;
const DEFAULT = "gemini-3.6-flash"; // SPEC-v3 §1.2 `google` wire id

const scripts = {
  "judge-video.mjs": (dir) => ["judge-video.mjs", path.join(dir, "clip.mp4"), "--no-reference"],
  "judge-rubric.mjs": (dir) => ["judge-rubric.mjs", path.join(dir, "clip.mp4")],
  "find-references.mjs": () => ["find-references.mjs", "--url=https://youtu.be/abcdefghijk"],
  "analyze-reference.mjs": () => ["analyze-reference.mjs", "--url", "https://youtu.be/abcdefghijk"],
};

function firstRequest(script, judgeModel) {
  const dir = mkdtempSync(path.join(tmpdir(), "fcs-judge-"));
  mkdirSync(path.join(dir, "out"));
  writeFileSync(path.join(dir, "clip.mp4"), Buffer.alloc(64));
  const log = path.join(dir, "requests.jsonl");
  const env = { ...process.env, GEMINI_API_KEY: "test-key", FAKE_FETCH_LOG: log };
  delete env.GEMINI_JUDGE_MODEL;
  if (judgeModel) env.GEMINI_JUDGE_MODEL = judgeModel;
  const [file, ...args] = scripts[script](dir);
  // exit code is irrelevant: the fake answers "{}", so the script may fail after its first request
  spawnSync(process.execPath, ["--import", preload, path.join(root, file), ...args], { cwd: dir, env, timeout: 30000 });
  assert.ok(existsSync(log), `${script} made no Gemini request`);
  return JSON.parse(readFileSync(log, "utf8").split("\n")[0]);
}

for (const script of Object.keys(scripts)) {
  test(`${script}: default model is ${DEFAULT} and request carries no rejected keys`, () => {
    const { url, body } = firstRequest(script);
    assert.match(url, new RegExp(`/models/${DEFAULT}:generateContent\?`));
    const json = JSON.stringify(body);
    for (const forbidden of ["thinking_budget", "thinkingBudget", "candidate_count", "candidateCount"]) {
      assert.ok(!json.includes(forbidden), `${script} sends ${forbidden}`);
    }
  });
  test(`${script}: GEMINI_JUDGE_MODEL is honoured`, () => {
    const { url } = firstRequest(script, "gemini-3.5-flash");
    assert.match(url, /\/models\/gemini-3\.5-flash:generateContent\?/);
  });
}

test("lib/judge-model.mjs exports the one constant", async () => {
  const saved = process.env.GEMINI_JUDGE_MODEL;
  delete process.env.GEMINI_JUDGE_MODEL;
  try {
    const mod = await import(pathToFileURL(path.join(root, "lib/judge-model.mjs")).href + "?default");
    assert.equal(mod.JUDGE_MODEL, DEFAULT);
  } finally {
    if (saved !== undefined) process.env.GEMINI_JUDGE_MODEL = saved;
  }
});
