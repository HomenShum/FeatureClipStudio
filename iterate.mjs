// The default loop: RENDER -> JUDGE -> REVISE -> re-render, until the gate passes
// or the round budget runs out.
//
// WHY THIS IS THE DEFAULT AND NOT AN EXTRA STEP.
//
// Every video this repo has produced was judged exactly once, by whoever
// remembered to run the judge, at the end, when the storyboard was already
// expensive to change. The predictable result: the judge's findings became
// release notes instead of edits. The TrialScope cut shipped at 20/40 -- craft
// 11, comprehension 9 -- and the comprehension half had never been measured at
// all, because nobody had thought to ask "did anyone understand it" as a
// separate question from "is it well made".
//
// A gate that runs once, after the work, is a grade. A gate that runs every
// round, before the work is called done, is a process. This file is the second
// thing. `npm run clip` goes through it; there is no shorter path that skips it.
//
// WHAT IT DOES NOT DO, deliberately: it does not edit your storyboard for you.
// The judge's next_cut brief is written to disk as a revision brief and the
// process exits non-zero. A loop that auto-applied its own critic's notes would
// converge on whatever the critic likes, which is not the same as a good demo,
// and there would be no human or agent left holding the taste. Round N+1 starts
// when someone applies the brief.
//
//   node iterate.mjs --comp WTC-TShero --out out/trialscope.mp4
//   node iterate.mjs --comp WTC-TShero --out out/x.mp4 --for "a frontend engineer" --gate 30
//
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const has = (n) => argv.includes(`--${n}`);

const comp = flag("comp");
const out = flag("out", "out/clip.mp4");
const audience = flag("for", "a smart newcomer who has never seen this product and does not know the domain jargon");
const gate = flag("gate", "28");           // 28/40 — see README for where this number came from
const rounds = Number(flag("rounds", "1"));
const entry = flag("entry", "src/index.js");

if (!comp) {
  console.error(`usage: node iterate.mjs --comp <CompositionId> --out <file.mp4> [--for "<audience>"] [--gate 28] [--rounds N] [--no-render]`);
  process.exit(1);
}

// `shell: true` is required on win32 for `npx` (a .cmd shim), but it makes the
// runtime re-split every argument on whitespace -- which silently truncated the
// audience string to its first word, so a run that reported `--for "a
// non-technical person..."` was actually judged for an audience literally named
// "a". The scores looked plausible, which is what made it survive a read.
// So: shell ONLY where the shim needs it, and quote when it is on.
const sh = (cmd, args, shell = false) =>
  execFileSync(
    cmd,
    shell ? args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)) : args,
    { stdio: "inherit", shell },
  );
const base = out.replace(/\.(mp4|webm|mov)$/i, "");
const LOG = `${base}.rounds.md`;

for (let r = 1; r <= rounds; r++) {
  console.log(`\n=== round ${r}/${rounds} — ${comp} for "${audience}" ===\n`);

  if (!has("no-render")) {
    sh("npx", ["remotion", "render", entry, comp, out, "--concurrency=2"], true);
  }

  // The judge exits non-zero below the gate; that is the signal, not a crash.
  let passed = true;
  try {
    sh("node", ["judge-rubric.mjs", out, "--for", audience, "--gate", gate]);
  } catch {
    passed = false;
  }

  const verdict = existsSync(`${base}.judge.json`) ? JSON.parse(readFileSync(`${base}.judge.json`, "utf8")) : null;
  const total = verdict ? Object.values(verdict.scores).reduce((a, v) => a + v.score, 0) : 0;

  // Append rather than overwrite: the ROUND HISTORY is the artefact worth having.
  // A single final score cannot tell you whether the cut improved or whether the
  // judge simply drifted, and "20 -> 31 after adding a premise beat" is the only
  // form of that claim anyone should believe.
  appendFileSync(LOG, [
    `\n## Round ${r} — ${total}/40 — ${verdict?.verdict ?? "no verdict"}`,
    `audience: ${audience}`,
    `weakest: ${verdict?.weakest ?? "-"} · weakest comprehension: ${verdict?.weakest_comprehension ?? "-"}`,
    ...(verdict?.next_cut ?? []).map((n) => `- **${n.dimension}** @ ${n.where} — ${n.change}`),
    ``,
  ].join("\n"));

  if (passed) {
    console.log(`\n[iterate] round ${r}: ${total}/40 >= ${gate} — shippable. History in ${LOG}`);
    process.exit(0);
  }

  console.log(`\n[iterate] round ${r}: ${total}/40 < ${gate}.`);
  if (r === rounds) {
    writeFileSync(`${base}.next-cut.md`, [
      `# Revision brief — ${comp}, round ${r}`,
      ``,
      `Scored ${total}/40 for: *${audience}*. Gate is ${gate}.`,
      `Weakest comprehension dimension: **${verdict?.weakest_comprehension ?? "unknown"}**`,
      ``,
      `Apply these to the storyboard spec, then re-run \`npm run clip\`:`,
      ``,
      ...(verdict?.next_cut ?? []).map((n, i) => `${i + 1}. **${n.dimension}** (${n.where}) — ${n.change}`),
      ``,
      `Full scorecard: ${base}.judge.md · round history: ${LOG}`,
    ].join("\n") + "\n");
    console.error(`[iterate] revision brief written to ${base}.next-cut.md — apply it and re-run.`);
    process.exit(1);
  }
}
