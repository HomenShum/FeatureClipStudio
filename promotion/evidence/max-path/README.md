# Evidence — defect D1, Windows MAX_PATH

What a stranger hit: they cloned this repository, ran the one command the README
leads with, and were told a file was missing. The file was not missing. It was a
203 MB copy of Chrome that Remotion had just downloaded, and it started fine when
invoked directly. Windows will not *start* a program whose full path reaches 260
characters, and it reports that refusal using the error code for a missing file —
so the tool blamed a download, and the re-download landed at the same path.

The limit is Windows'. What Iteration 2 changed is that the tool now names it.

Every file here was captured by a command that is committed in this repository and
re-runnable from a clone. No file here was written by hand.

| File | Producer | What it shows |
|---|---|---|
| `render-example.before.log` | `npm run render:example`, 172-character checkout, pre-fix tree | exit 1, `spawn …chrome-headless-shell.exe ENOENT`, **0** occurrences of MAX_PATH |
| `render-example.after.log` | `npm run render:example`, same 172-character checkout, post-fix tree | exit 1, same ENOENT, **1** occurrence of MAX_PATH — the message naming the cause, both lengths, and the fix |
| `render-example.short-checkout.after.log` | `npm run render:example`, 149-character checkout, post-fix tree | exit 0, `out/example.mp4` 5,777,972 bytes, 0 occurrences of MAX_PATH — the wrapper is transparent where the defect does not apply |
| `probe-maxpath.before.log` | `node probe-max-path.mjs` against the pre-fix tree | exit 1 — the regression check fails before the fix, which is the only thing that makes it a regression check |
| `probe-maxpath.before-unwired.log` | `node probe-max-path.mjs` with the handler present but every caller reverted | exit 1, naming all eight bypasses — the shape this fix would rot into, caught |
| `probe-maxpath.after.log` | `npm run probe:maxpath` | exit 0, all nine assertions |
| `probe-receipt.long-checkout.json` | `npm run probe:maxpath` from the 172-character checkout | the receipt as written from the failing side; `checkoutLength: 172` |

The live receipt is one directory up at `promotion/evidence/max-path.json` and is
rewritten every time the probe runs.

**The exit code did not change and was not supposed to.** From a deep checkout the
render still cannot start, so the command still fails. What changed is which cause
it names.
