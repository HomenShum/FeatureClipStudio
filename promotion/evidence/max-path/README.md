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
| `probe-maxpath.before-unwired.log` | `node probe-max-path.mjs` with the handler present but every caller reverted | exit 1, naming the bypasses Iteration 2's list-based check knew about — which was not all of them, see the Iteration 3 rows below |
| `probe-maxpath.after.log` | `npm run probe:maxpath` | exit 0, Iteration 2's nine assertions |
| `probe-receipt.long-checkout.json` | `npm run probe:maxpath` from the 172-character checkout | the receipt as written from the failing side; `checkoutLength: 172` |
| `render-example.fresh-clone-178.log` | `git clone` of the pushed commit into a 178-character directory → `npm ci` → `npm run render:example` | the cold reader's own path, from what is actually on origin rather than from a working tree: exit 1, one MAX_PATH message, browser path 283 characters, checkout 178, budget 154 |

**Iteration 3** — captured after an independent re-run refuted Iteration 2 at 2 of
4. Same rule as above: every file was produced by a command, none written by hand.

| File | Producer | What it shows |
|---|---|---|
| `iterate-188.before.log` | `node iterate.mjs --comp WT-NodeRoom --out out/it.mp4`, 188-character checkout, Iteration 2's tree | exit 1, **0** occurrences of MAX_PATH — `npm run iterate` was the ninth caller and was never wired, so its reader got the original unrepaired D1 |
| `iterate-188.after.log` | the same command, same checkout, after the repair | exit 1, **1** occurrence — the same explanation the npm scripts give |
| `spaced-output-path.before.log` | `node run-remotion.mjs render … "out/my clip.mp4" --frames=0-1` with the wrapper's quoting removed | exit **0** and `out/my.mp4`, 64,432 bytes: cmd.exe split the path and the render wrote the wrong file, silently. A wrapper added to improve an error message was corrupting the command |
| `spaced-output-path.after.log` | the same command, quoting in place | exit 0 and `out/my clip.mp4`, 64,432 bytes |
| `probe-maxpath.iteration2-tree.log` | `node probe-max-path.mjs` (Iteration 3's probe) with the five source files stashed back to Iteration 2 | exit 1, naming every bypass by `file:line` — `ci.yml:32, clip.mjs:40, iterate.mjs:66, probe-opening-frame.mjs:48` — plus both quoting rows. The check is confirmed failing before the fix, not only passing after |
| `probe-maxpath.ci-reverted.log` | the same probe with only the CI smoke render reverted to `npx remotion render` | exit 1, `.github/workflows/ci.yml:37`. Iteration 2's guard printed PASS on this exact mutation, because a comment two lines above still contained the string it grepped for |
| `probe-maxpath.quoting-removed.log` | the same probe with only the wrapper's quoting removed | exit 1 on both argument rows |

The live receipt is one directory up at `promotion/evidence/max-path.json` and is
rewritten every time the probe runs.

**The exit code did not change and was not supposed to.** From a deep checkout the
render still cannot start, so the command still fails. What changed is which cause
it names.
