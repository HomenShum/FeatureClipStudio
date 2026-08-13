# Simplification report — wave 3, human readiness

Gate: <https://raw.githubusercontent.com/HomenShum/NodeKit/main/templates/promotion/HUMAN_READY.md>
(single source; not restated here)

Measured on Windows 11 10.0.26200 / Node v22.22.2 / npm 10.9.7 / ffmpeg 6.0, against
a fresh `git clone --depth 20` at `341fd20` ("Every clip stops opening on a white
flash, in all three renderers"), 2026-08-13. Every "before" number was taken from a
clean `git worktree add --detach <dir> HEAD` of that commit so the deletions could not
contaminate it.

## The table

| Measure | Before | After | Change | Evidence command |
|---|---:|---:|---:|---|
| Production files (JS/JSX shipped by this package) | 56 | 41 | **−15** | `git ls-files '*.mjs' '*.js' '*.jsx' \| grep -v -E '^(examples\|argo-demos)/' \| wc -l` |
| Production source lines | 11,172 | 10,207 | **−965** (−1,050 deleted, +85 added by `check.mjs`) | same list piped to `xargs wc -l \| tail -1` |
| Direct dependencies (deps + devDeps) | 6 | 5 | **−1** | `node -p "const p=require('./package.json');Object.keys(p.dependencies).length+Object.keys(p.devDependencies).length"` |
| Tracked files, whole repo | 862 | 859 | −3 | `git ls-files \| wc -l` |
| Unused files | 47 | 16 | **−31** | `npx knip@5 --no-progress` |
| Unused dependencies | 1 | 0 | **−1** | `npx knip@5 --no-progress` |
| Unused exports | 4 | 6 | +2 | `npx knip@5 --no-progress` |
| Duplicate blocks (whole repo) | 34 | 33 | −1 | `npx jscpd@4 . --ignore "node_modules/**,out/**,public/**,assets/**,promotion/evidence/**,package-lock.json,argo-demos/package-lock.json"` |
| Duplicate percentage (whole repo) | 2.43% | 2.30% | −0.13 | same |
| Duplicate blocks (JavaScript only) | 26 | 25 | −1 | same, `statistics.formats.javascript` |
| Duplicate percentage (JavaScript only) | 3.29% | 3.50% | **+0.21** | same — see note 1 |
| Circular dependencies | 0 | 0 | 0 | `npx dependency-cruiser@16 --no-config --output-type json --exclude node_modules src *.mjs > d.json` then `node -e "const r=require('./d.json');console.log(r.modules.flatMap(m=>m.dependencies.filter(d=>d.circular)).length)"` — see note 2 |
| Modules in the dependency graph | 61 | 46 | −15 | same command, `summary.totalCruised` — both measured with `node_modules` installed; a clone without them reports 49 because unresolved externals are counted as modules |
| Canonical workflow tests | none (`npm test` absent) | none (`npm test` still absent) | 0 | `node -p "require('./package.json').scripts.test ?? 'absent'"` |
| No-key gate coverage | 15 of 45 JS files | **36 of 36** JS files + 36 tour steps | +21 files | `npm run check` |
| Render gate (`probe:opening`) | PASS, exit 0 | PASS, exit 0 | unchanged | `npm run probe:opening` — see note 3 |
| Clean install from lockfile | exit 0 | exit 0 | unchanged | `rm -rf node_modules && npm ci` |
| Browser workflow passes | not applicable — no browser UI is authored here; the only browser surfaces are third-party Remotion Studio and `examples/collab-demo/` | | | |
| Production bundle size | not applicable — no bundler and no build step; Remotion compiles at render time | | | |
| Additions/deletions | — | — | 34 files changed, +1,715 / −1,059 | `git diff --cached --shortstat` |
| — of which **source** (excluding `docs/`, `.tours/`, lockfile, evidence) | — | — | 20 files changed, +115 / −1,053 | `git diff --cached --shortstat -- '*.mjs' '*.js' '*.jsx' package.json README.md JOURNEYS.md` |

### Note 0 — four numbers in this table were corrected after the first push

The adversarial pass caught them, which is the pass doing its job. Commit
`994a630` published production files as 40, production lines as 10,122, tracked
files as 858 and graph modules as 47. All four were **stale**: the first three
were counted with `git ls-files` while `check.mjs` and this report were still
untracked, and the fourth was measured before `soundtrack.mjs` was deleted. The
corrected numbers above were re-measured against a fresh `git clone` of the
pushed commit. The direction of every change is unaffected; the magnitudes are
now right.

### Note 1 — duplication percentage went up while duplication went down

Absolute duplicated JavaScript fell from 268 lines to 262. The *percentage* rose
because the denominator fell faster: the deletions took 663 JavaScript lines out of
the total while removing only 6 duplicated ones. The clone count also fell, 26 → 25. **No new duplicate was
introduced**, verified by diffing the two clone lists:

```
node -e "const b=require('./jscpd-before/jscpd-report.json').duplicates.map(d=>d.firstFile.name+'|'+d.secondFile.name+'|'+d.lines);
         const a=require('./jscpd-after/jscpd-report.json').duplicates.map(d=>d.firstFile.name+'|'+d.secondFile.name+'|'+d.lines);
         const bs=new Set(b); console.log(a.filter(x=>!bs.has(x)))"
→ []
```

That diff earned its keep: the first run of it flagged two *new* clones between
`docs/START_HERE.md` and the source it walks — my own quoted snippets were long enough
to register as near-copies. The gate says to keep copied snippets short, and jscpd
proved they were not. Both were trimmed, and the re-run shows none.

### Note 2 — dependency-cruiser without a rule set

`npx dependency-cruiser --validate` needs a rule file, and adding one would be a new
config concept for a repository with no cycles to police. Reading the graph directly
is the same measurement without the file. **A bare `--no-config --output-type err` run
prints "no dependency violations found" because there are no rules loaded — that is a
vacuous pass, not a result**, which is why the row above reads the `circular` flags out
of the JSON instead.

### Note 3 — behavior preservation

`npm run probe:opening` renders frame 0 and frame 4 of one composition per renderer
through real Remotion and ffmpeg, and asserts they are the same picture. It is the only
committed gate that exercises the rendering path end to end. Identical before and
after, to the digit:

```
PASS  WT-NodeRoom        frame0=#15161a frame4=#15161a diff=0.0%
PASS  WTC-LiveSync       frame0=#0d1722 frame4=#0d1722 diff=0.0%
PASS  WTG-RoomOSV0123    frame0=#151824 frame4=#151824 diff=0.0%
```

No file on the capture → render → encode path was edited. The only source change is
one new file (`check.mjs`) and one `package.json` edit.

---

## What was deleted, and why each deletion was safe

### 15 scripts that could not run from a clone (818 lines)

`probe-r4-r6.mjs`, `probe-room-routes.mjs`, `probe-story-dom.mjs`, `rehearse-deck.mjs`,
`rehearse-extras.mjs`, `rehearse-fresh.mjs`, `rehearse-story.mjs`, `survey-deck.mjs`,
`survey-journeys.mjs`, `survey-story.mjs`, `calibration/probe.mjs`

Eleven of these imported `../noderoom/scripts/playwright-peer.mjs` or read
`../noderoom/.env.local` — a *sibling checkout* that nobody cloning this repository
has. **Proven, not assumed**: copied into a directory with no siblings and run.

```
$ node probe-story-dom.mjs
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…\noderoom\scripts\playwright-peer.mjs'
    imported from …\probe-story-dom.mjs
```

Five of them additionally wrote their screenshots to a hard-coded absolute path inside
a *previous session's* temp directory
(`C:/Users/hshum/AppData/Local/Temp/claude/C--Users-hshum-Downloads-Interview-items/e3836513-…/scratchpad/deck`).

`probe-depth.mjs`, `survey.mjs`, `journey-coverage.mjs` resolved their imports but
hard-coded another product's URLs (`localhost:5260`, `localhost:5180`), proof strings
and DOM selectors. Nothing in this repository serves those ports.

`run-loop.mjs` was a superseded predecessor of `clip.mjs`: same two imports, same
opening block that refits step holds and rewrites `src/walkthrough.data.js`, no npm
script, no documentation reference, and `clip.mjs` does all of it plus the judge.

**What was preserved instead:** these scripts are the *provenance* of the measurements
in `JOURNEYS.md`, so that file now carries a note saying they were removed, why, and
that `git show 341fd20:survey-journeys.mjs` still has them. The working practice they
automated — rehearse the journey before writing a spec — is written down in
`docs/codebase/CONVENTIONS.md`.

### 1 module superseded by an in-repo capability (232 lines)

`soundtrack.mjs` — a second audio subsystem. It exported `FPS`, loudness measurement,
storyboard→cue mapping, track building and `muxOnto`; `score.mjs` exports the same
shape and is the one `clip.mjs` actually imports. Nothing imported `soundtrack.mjs`
(knip, plus `grep -rn "soundtrack" *.mjs`), and the two README mentions of the word
refer to a rubric dimension, not the file. **Reuse-ladder rung (b), "does this
repository already contain it?" — yes.**

### 1 dependency: the package depending on itself

```diff
 "dependencies": {
   "@remotion/cli": "^4.0.474",
-  "feature-clip-studio": "file:",
   "react": "^18.3.1",
```

Nothing imports the name `feature-clip-studio`. knip flagged it; `npm install
--package-lock-only` removed it from the lockfile; `rm -rf node_modules && npm ci`
then `npm run check` both exit 0.

## What custom code an existing capability replaced

**A hand-maintained fifteen-file list → a directory walk.** `npm run check` was
fifteen `node --check` calls chained with `&&` inside `package.json`. The list had
drifted to covering **15 of 45** `.mjs` files, and the thirty it never opened included
`walkthrough.collab.mjs` and `walkthrough.roomos.mjs` — two of the four capture
drivers — and the whole audio module. `nodekit.yaml` maps **both** `doctor` and `check`
to this command, so a green exit was answering "is the toolkit intact?" about a third
of the toolkit.

`check.mjs` walks the tree with `node:fs` `readdirSync` (stdlib, rung c) and prints
what it covered, so the gate cannot silently shrink again. It also validates every
CodeTour step — 36 of them — because a tour pointing at a line that has moved teaches
the reader something false and nothing fails. **Both halves are proven to fail**, not
just to pass:

```
$ node -e "…set .tours/01 step 1 line to 99999…" && node check.mjs
[check] parsed 37/37 JavaScript files; resolved 34/35 tour steps across 3 tours
[check] 1 problem(s):
  - 01-primary-user-flow.tour step 1 (package.json:99999) — file has 55 lines
$ echo $?
1
```

**Entry points moved out of a 1,373-line README and into `npm run`.** Five capture and
studio commands, and three judging/reference commands, existed only as
`node <file>.mjs` instructions buried in prose. They are npm scripts now
(`capture:collab`, `capture:roomos`, `capture:visual`, `capture:solo`, `studio:roomos`,
`judge:rubric`, `references:find`, `references:analyze`). That is the package manager's
own registry doing a job the README was doing badly — and it is why knip's unused-file
count fell honestly rather than by configuration.

## Findings left unresolved, with reasons

| Finding | Why it is still here |
|---|---|
| **16 knip "unused files"** | 12 belong to the two nested projects `argo-demos/` and `examples/` — separate npm packages with their own lockfiles, deliberately outside this package's graph. The other 4 (`src/roomos-index.js`, `src/RoomOsRoot.jsx`, `src/WalkthroughGrid.jsx`, `src/walkthrough.roomos.data.js`) are **false positives**: they are reached through `npm run render:roomos` / `studio:roomos`, whose entry file is a Remotion CLI argument that knip cannot follow. `src/index.js` escapes only because it matches knip's default entry glob. Adding a `knip.json` to silence four false positives is a config knob bought for a metric; the explanation costs nothing and is more honest. |
| **6 knip "unused exports"** (was 4) | The count rose because `judge-rubric.mjs` became a reachable entry point, which made `rubric.mjs` reachable, which exposed two of its exports (`ALL`, `MAX`) as unused. The repository did not get worse; more of it is now described. All six are library exports kept for symmetry (`score.mjs` `FPS`/`arrangementFor`/`sliceLevel`, `comprehension-rubric.mjs` `COMPREHENSION_DIMENSIONS`) and deleting them is a judgement call about a public surface, not a measured win. |
| **Three capture drivers are near-copies** — 25 duplicated lines between `walkthrough.mjs` and `walkthrough.visual.mjs`, 18 between `walkthrough.mjs` and `walkthrough.solo-founder.mjs` | This is the largest remaining structural duplication and it is deliberately untouched. Rule 2 of the gate requires a characterization test before refactoring an important unprotected path. Writing one needs the three target applications — a Streamlit harness, a "visual labs" app, a 3D React SPA — and none is in this repository. A blind merge would produce exactly the failure this tool exists to expose: a change that looks correct and silently captures the wrong screen. Recorded with a migration sketch in `docs/codebase/CONCERNS.md`. |
| **65 duplicated lines across `Walkthrough.jsx` and `Walkthrough2up.jsx`** | Same rule. This one is more tractable — `probe:opening` gives a real before/after signal on the shared cross-fade — but it is a refactor of the rendering path, and this wave's contract was to delete before abstracting. Documented in CONCERNS.md, including the fact that this shared code is *why* defect D2 hit three renderers at once. |
| **Defect D1 — `npm run render:example` failed once on Windows, unexplained** | Not reproducible in this wave (`exit 0`, twice, same OS and Node). An unreproducible defect is not a repaired one, and inventing a fix for a failure you cannot trigger is worse than leaving it recorded. Carried into `docs/codebase/CONCERNS.md` with the exact error and the `npx remotion browser ensure` workaround. |
| **No test suite** | Adding one is feature work, which rule 3 forbids mixing into a structural wave. What exists is now documented honestly, gate by gate, with what each does and does not prove, in `docs/codebase/TESTING.md`. |
| **`argo-demos/` — a second npm project with a hand-patch-your-node_modules doc** | It produced two published videos that `JOURNEYS.md` cites, so deleting it would delete the provenance of shipped artifacts. Flagged in CONCERNS.md as an archive, not a component. |
| **689 committed PNG captures and 3,774 lines of generated data** | Both are load-bearing: they are what makes `npm run render:example` work on a fresh clone with no application running, which is the repository's only no-setup demonstration. Deleting them to shrink the tree would break the one journey that currently works. |
| **`voice.mjs` contains a literal NUL byte** | Inside a legitimate `.replace(/\0/g, "")`. Harmless to Node; makes `git`/`grep` treat the file as binary. Editing source to please a search tool is not a simplification. Noted in CONCERNS.md with the `grep -a` workaround. |
| **The 1,373-line README** | Rewriting it is a product decision, not a structural one, and its length is defensible for a tool's landing page. Answered by adding a pointer at the top to `docs/START_HERE.md` rather than by cutting content nobody asked to lose. |

## What a reader gets that they did not have before

- `docs/START_HERE.md` — the code in the order it executes, nine stages, each naming
  its file, symbol, caller, callee, inputs, outputs and failure behaviour. Two stages
  the template expects are answered as *absences with evidence* rather than invented:
  there is no HTTP route, and there is no agent on the capture/render path.
- `docs/codebase/` — stack, structure, architecture, conventions, integrations,
  testing, concerns. Every claim cites a path and a line.
- `.tours/` — three CodeTours, 36 steps, every one machine-validated by `npm run check`
  on every run.
- `npm run` — now a complete index of the entry points, instead of a subset.
