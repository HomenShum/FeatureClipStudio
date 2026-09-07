# Reviewed LiveSync example and capture-status evidence

Start with the [developer handoff](../../../HANDOFF.md). A developer can render the preserved two-client example, or deliberately recapture the local demo and recover from a failed capture. This packet supports those scoped jobs; it is not a whole-product readiness certificate.

The [movie](after-output/readable-livesync.mp4) and [actual palette GIF](after-output/readable-livesync.gif) are the accepted encoded files. Their [independent final review](judgments/E6o_FEATURECLIPSTUDIO_READABILITY_FINAL_JUDGE.md.txt) covers selected controls/results, both clients and the persistent local/fixed-text/in-memory disclosure. Both files fully decoded. Audio listening, every motion frame and human comprehension remain unverified.

## Read the evidence by claim

| Claim | Physical payload |
|---|---|
| Normal locked setup and current source check | [Install output](setup/normal-ci.stdout.txt), [Node version](setup/node-version.stdout.txt), [normal check](checks/normal-check.stdout.txt). The install recorded 12 advisories; they remain unresolved. |
| Original false success | [Unknown selector exit](before-status/unknown-selector-command.json), [unavailable demo exit](before-status/unavailable-demo-command.json), [original completion output](before-status/unavailable-demo.stdout.txt). These are historical failures, not passing examples. |
| Corrected selection boundary | [Six selector cases](after-status/02-selection-negatives/selection-semantics.json), including absent/explicit empty versus whitespace/comma semantics. |
| Failed work exits with its cause; explicit recovery succeeds | [Unavailable demo](after-status/04-unavailable/unavailable-command.json), [missing control](after-status/05-missing-control/missing-control-command.json), [successful recapture](after-status/06-recovery/selected-livesync-command.json), [native observation](after-status/native-observation.json), [54 native-buffer/generated/disk bindings](after-status/06-recovery/native-generated-disk-bijection.json). |
| Same native captures, changed presentation | [Labelled prior boundary](scope/change-boundary.png), [state contract](scope/change-boundary.md.txt), [eight selected legacy comparisons](checks/legacy-parity.json). |
| Actual encoded outputs | [Render command](encoding/render-readable-command.json), [documented GIF command](encoding/documented-gif-command.json), [movie probe](encoding/readable-ffprobe.stdout.txt), [GIF probe](encoding/gif-probe.stdout.txt), [movie decode](encoding/readable-decode-command.json), [GIF decode](encoding/gif-decode-command.json). |
| Final source/process closure | [Stage04 summary](encoding/stage04-receipt.json), [stage05 receipt](encoding/stage05-receipt.json), [stage05 closing guard](encoding/stage05-closed.json). Command success itself does not grant visual acceptance. |

The 54 native PNGs are already part of the repository's `public/wt-collab/LiveSync` cohort. They are not recopied here. The first render reuses those inputs; it is not another native interaction, a synchronization-latency measurement or a durable-state result.

## Actual before and after pixels

These pairs use the same output frame and preserved input sequence:

| Frame | Before | After |
|---|---|---|
| MP4 0 | [Before](before-output/repaired-frame-0.png) | [After](after-output/movie-0.png) |
| MP4 147 | [Before](before-output/repaired-frame-147.png) | [After](after-output/movie-147.png) |
| MP4 294 | [Before](before-output/repaired-frame-294.png) | [After](after-output/movie-294.png) |
| MP4 587 | [Before](before-output/repaired-frame-587.png) | [After](after-output/movie-587.png) |
| Actual GIF 293 | [Before](before-output/gif-frame-293.png) | [After](after-output/gif-293.png) |

All eight settled steps have MP4/GIF samples: [1](after-output/movie-26.png), [2](after-output/movie-96.png), [3](after-output/movie-156.png), [4](after-output/movie-210.png), [5](after-output/movie-294.png), [6](after-output/movie-372.png), [7](after-output/movie-432.png), [8](after-output/movie-518.png). Their GIF files use the corresponding nominal half-frame numbers. [GIF216](after-output/gif-216.png) retains the longest card's lower border with tight clearance. [Early402](after-output/movie-402.png), [408](after-output/movie-408.png) and [420](after-output/movie-420.png) preserve the disclosed camera travel: not every early stream state is fully visible. The previous card is partly cropped in result focus. Fixed output dimensions do not prove responsive browser behavior.

The [historical assessment](judgments/E6o_FEATURECLIPSTUDIO_CRITERION_ASSESSMENT.json) stays a distinct prior observation. The [scoped successor](judgments/E6o_FEATURECLIPSTUDIO_READABILITY_CRITERION_ASSESSMENT.json) updates evidence supported by LiveSync's output, retaining 21 partial observations, 23 not run and all full scores null. Its [precise field correction](judgments/final-judge-field-correction.json) explains the final judgment's inherited nested pending-review label; the top-level approval is unchanged. The [reviewer's resolved reading concern](judgments/reviewer-reading-correction.json) is also preserved.

The default WT-NodeRoom example, recorded dependency advisories, inherited swallowed `waitText` timeout, provider/model paths and production remain held. This scoped approval does not certify those surfaces.

## Portability and verification

From the repository root:

```sh
python promotion/evidence/local-livesync-handoff-20260907/verify.py
python promotion/evidence/local-livesync-handoff-20260907/verify.py --source-root .
```

[The manifest](manifest.json) checks strict packet bytes, including logs and inert historical text. [The copy map](copy-map.json) distinguishes exact raw copies from explicit derivatives and binds each to its original hash. Derivatives remove named operator/home path prefixes or redundant recorder fields; they are never labelled exact raw copies. The narrow `.gitattributes` preserves raw packet bytes under Git.

[Selected source bindings](source-bindings.json) separately record raw working SHA-256/Git blob and the actual Git-filtered canonical identities. Optional source verification permits CRLF→LF only for rows where the native Git filter demonstrated that equivalence; binary and other exact rows stay strict. This is a selected-source check, not a full repository or installed-dependency inventory. The current behavior proof precedes this documentation-only addition; it does not assert a new shared CI run.

[Omissions](omissions.json) identify hash-bound operator-local groups. Unselected pictures, full DOM/session state, old movies, controller histories, private path/environment inventories, databases and caches are not portable. Hashes do not reconstruct them. Inert historical reports may reference those local originals; use the copy map to find the files actually supplied. The correct historical generated-custody origin is plan01, as recorded in omissions, rather than the missing relative plan03 link.
