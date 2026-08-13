#!/usr/bin/env node
// Every Remotion command this package owns is spawned from here, for one reason.
//
// THE FAILURE THIS EXISTS TO EXPLAIN. Someone clones this repository, runs the
// quickstart, and gets told a file is missing:
//
//     Error: Failed to launch the browser process!
//     Error: spawn …\chrome-headless-shell.exe ENOENT
//
// `ENOENT` means "no such file". The file is there — 202,939,392 bytes — and it
// runs: invoke it yourself and it prints `Google Chrome for Testing 149.0.7790.0`
// and exits 0. So the message is not merely unhelpful, it is false, and it sends
// the reader off to re-download a browser that is already on their disk. It is
// the single worst first impression this repository can make, and it is the first
// command a stranger types.
//
// WHAT IS ACTUALLY WRONG. Windows will not start a program whose full path is 260
// characters or longer, and it reports that refusal with the error code for a
// missing file. Remotion installs its browser INSIDE the checkout, which adds 105
// characters to whatever directory you cloned into, so a deep checkout crosses the
// line and a shallow one does not. That is why two people running the same command
// on the same machine disagree about whether it works: the only variable is how
// long their clone directory's name is. Measured boundary and reproduction:
// docs/codebase/CONCERNS.md, defect D1.
//
// WHAT THIS FILE DOES ABOUT IT. It cannot make Windows open the file — the fix is
// to clone somewhere shorter, and only a human can do that. What it can do is stop
// the tool from lying about the cause. When a Remotion command fails, this checks
// the one thing Remotion's error does not: whether the browser it named is present
// AND sitting past the limit. If it is, the reader gets a message that says
// MAX_PATH, gives the two numbers that decide it, and names the fix.
//
// WHY IT IS A WRAPPER AND NOT A NOTE IN EACH SCRIPT. Five npm scripts and two .mjs
// drivers start Remotion. A guard added to the one script a bug report names
// leaves the other six failing exactly as before. This is the single place they
// all route through, which is also why probe-max-path.mjs asserts that they do:
// an explanation nothing calls is not a fix.

import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Windows refuses to open a path of 260 characters or more through the ANSI path
// APIs `spawn` uses. Measured 2026-08-13 on Windows 11 / Node 22, one executable
// hard-linked to five path lengths: exit 0 at 259, ENOENT at 260. Re-measured on
// every `npm run probe:maxpath` rather than trusted from that table.
export const MAX_PATH = 260;

// Where Remotion puts Headless Shell, relative to the checkout. 105 characters
// with the separator, which is exactly the budget a clone directory loses.
const BROWSER_REL = path.join("node_modules", ".remotion", "chrome-headless-shell",
  "win64", "chrome-headless-shell-win64", "chrome-headless-shell.exe");

// The longest a checkout directory can be before the browser it holds is
// unstartable. 154 on Windows, and computed rather than written down so it stays
// true if Remotion ever moves the browser.
export const CHECKOUT_BUDGET = MAX_PATH - 1 - (BROWSER_REL.length + 1);

export const browserExe = (root = process.cwd()) => path.join(root, BROWSER_REL);

// The whole fix, and it is deliberately narrow: it returns an explanation ONLY
// when the file is present and over the limit. A browser that is genuinely
// absent, or a path that is short enough, gets `null` and Remotion's own ENOENT
// stands — because then ENOENT is the truth and replacing it would be the same
// mistake in the other direction.
export const maxPathHint = (exe = browserExe()) => {
  if (process.platform !== "win32") return null;
  if (exe.length < MAX_PATH) return null;
  if (!existsSync(exe)) return null;
  const bytes = statSync(exe).size.toLocaleString("en-US");
  const line = "─".repeat(72);
  return [
    "",
    line,
    "Windows MAX_PATH — nothing is missing and nothing is corrupted.",
    "",
    "Remotion starts its own copy of Chrome to draw the frames. Windows refuses",
    `to start a program whose full path is ${MAX_PATH} characters or longer, and reports`,
    'that refusal as ENOENT — "no such file" — about a file that is present and',
    "runs fine when you launch it yourself:",
    "",
    `  ${exe}`,
    `  ${exe.length} characters, ${bytes} bytes, exists: yes`,
    "",
    "Remotion installs that browser inside your checkout, so the length of the",
    "directory you cloned into is what decides whether the render can start.",
    "",
    "Fix — clone somewhere shorter and run again:",
    "",
    "  git clone https://github.com/HomenShum/FeatureClipStudio.git C:\\src\\fcs",
    "  cd C:\\src\\fcs && npm ci && npm run render:example",
    "",
    `This checkout is ${process.cwd().length} characters; it must be ${CHECKOUT_BUDGET} or fewer.`,
    "Measured boundary and reproduction: docs/codebase/CONCERNS.md, defect D1.",
    line,
    "",
  ].join("\n");
};

// `npx` + `shell` on win32 is the invocation probe-opening-frame.mjs already used
// to reach the local Remotion binary; kept identical so there is one way to do it.
export const runRemotion = (args) => {
  const run = spawnSync("npx", ["remotion", ...args], {
    stdio: "inherit", shell: process.platform === "win32",
  });
  if (run.error) console.error(`run-remotion: ${run.error.message}`);
  if (run.status !== 0) {
    const hint = maxPathHint();
    if (hint) console.error(hint);
  }
  return run.status ?? 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error("usage: node run-remotion.mjs <remotion args…>   e.g. render src/index.js WT-NodeRoom out/example.mp4");
    process.exit(2);
  }
  process.exit(runRemotion(args));
}
