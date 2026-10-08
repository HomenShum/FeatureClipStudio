# Run the reviewed local collaboration example

A developer can use FeatureClipStudio to turn a recorded two-client interaction into a movie and GIF. Start with the preserved LiveSync example: it shows an added card, a fixed-text agent response and the same selected result in both clients. Its title identifies local, in-memory behavior. This example does not establish a cloud service, model response or durable collaboration.

**Re your request:** make the current tool usable for developer handoff with actual exported proof — the commands below reproduce the scoped example from this checkout. The [evidence index](promotion/evidence/local-livesync-handoff-20260907/README.md) separates the original failures, corrected capture behavior and accepted encoded output.

## First render

The observed lane used Windows, Node 22.22.2, the locked Remotion 4.0.479 and Playwright 1.60.0. Use a short checkout path on Windows. Have ffmpeg and ffprobe on PATH; Python 3 is needed only for the evidence verifier. Other host/version combinations were not certified by this run.

Run from the repository root, choosing fresh output names:

```sh
npm ci
npm run check
node run-remotion.mjs browser ensure
node run-remotion.mjs render src/index.js WTC-LiveSync out/local-livesync.mp4 --concurrency=2
ffmpeg -v error -i out/local-livesync.mp4 -vf "fps=15,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" -loop 0 out/local-livesync.gif
ffprobe -v error -show_streams -show_format -of json out/local-livesync.mp4
```

This uses 54 checked-in captures and authored presentation metadata; it performs no new browser interaction. The [accepted movie](promotion/evidence/local-livesync-handoff-20260907/after-output/readable-livesync.mp4) has 588 video frames, 1920×1080 at 30 fps and 19.600 seconds of video. Its container is 19.648 seconds because of the AAC stream. The [actual GIF](promotion/evidence/local-livesync-handoff-20260907/after-output/readable-livesync.gif) has 294 frames, 720×405 at nominal 15 fps. Both fully decoded without errors. Encoded bytes can differ across environments; the supplied files have exact hashes in the packet.

The dependency follow-up repeated the normal source check: 39 JavaScript parses, 36 tour anchors and 34 prose citations passed. Its [dated evidence](promotion/evidence/local-livesync-handoff-20260907/dependency-20260907/README.md) includes the new movie and GIF, installed identities and actual audit. All 44 matched stills, 117 encoded LiveSync samples and five default-example samples matched their retained references in decoded pixels. Both full movies and the GIF decoded without errors. The original files above remain historical accepted outputs; this paragraph does not assert a new shared CI result.

## Optional: capture the local interaction again

Recapture deliberately replaces the selected LiveSync frame directory and generated data module. Keep a baseline or backup first. Install the capture browser once:

```sh
node node_modules/playwright/cli.js install chromium
```

Keep the local demo running in a separate terminal:

```sh
node examples/collab-demo/server.mjs
```

The demo listens on port 8930 by default and does not enforce a loopback-only bind. It uses fixed text and in-memory state. In Bash, capture only this example:

```sh
COLLAB_ONLY=LiveSync node walkthrough.collab.mjs
```

In PowerShell, scope that selection to the command and restore the previous value:

```powershell
$previousCollabOnly = [Environment]::GetEnvironmentVariable('COLLAB_ONLY', 'Process')
try {
    $env:COLLAB_ONLY = 'LiveSync'
    node walkthrough.collab.mjs
    if ($LASTEXITCODE -ne 0) { throw "LiveSync capture failed with exit $LASTEXITCODE" }
} finally {
    [Environment]::SetEnvironmentVariable('COLLAB_ONLY', $previousCollabOnly, 'Process')
}
```

Then render and export with fresh output names. Stop the demo you started when finished. No provider key, voice pipeline or external product target is required for these commands.

## Failure and recovery

Unknown or mixed-unknown selections, whitespace-only values and comma-created empty entries fail before browser/output work. An absent variable or explicit empty string follows the existing refusal to capture all specs without a deliberate broad selection. These two meanings of “empty” are distinct.

An unavailable demo or exhausted action failure now exits nonzero, preserves diagnostic output and leaves the generated data module unchanged. Attempted selected frame directories can be incomplete, including earlier specs in a multi-spec run; they are not rolled back. Restore the demo/control and explicitly recapture the selected example successfully before rendering it. Existing swallowed `waitText` timeouts remain a limitation, so exit success alone does not prove every desired text assertion.

## What the evidence supports

The accepted framing makes the selected control/result and both client labels readable in the actual movie and GIF. The longest card has a tight lower margin. The previous card is partly cropped, and early camera travel does not show every complete stream state. These are disclosed presentation limits, not synchronization latency measurements. Audio was not listened to; no full continuous-motion or human-comprehension grade was granted.

The default `npm run render:example` still renders historical WT-NodeRoom inputs and retains a separate output-quality hold. LiveSync acceptance does not certify other examples, responsive browser behavior, physical devices, provider behavior or production. The earlier install reported 12 affected packages (2 low, 10 high). The normal installed-tree audit for the exact Remotion 4.0.479 lock reported zero on September 7, 2026. That is a dated dependency result, not a full security assessment. Full criterion and overall grades remain null.

Verify the retained packet from the repository root. Check its selected historical source bindings only against the matching retained source checkout:

```sh
python promotion/evidence/local-livesync-handoff-20260907/verify.py
python promotion/evidence/local-livesync-handoff-20260907/verify.py --source-root "<matching-historical-checkout>"
```

The first command checks exact packet bytes. The optional source check compares its original selected snapshot, allowing only each row's demonstrated Git checkout newline transformation. Use the checkout matching those recorded bindings; later code or documentation changes do not re-certify that snapshot. It does not rerun capture/render or certify the whole repository. The evidence index records raw versus minimized receipts and which historical artifacts remain operator-local.

## Local evidence bridge

For a Change Story or deck, use the [NodeKit Present evidence bridge](docs/NODEKIT_PRESENT_EVIDENCE.md)
for its commands, actual baseline/new comparison and declared limits. It projects
selected historical media as `observed`, with `productWorkflowProof: not-certified`
and `releaseReady: false`. Receipt references and retained supporting-file byte
guards do not establish passing outcomes or capture provenance. This local protocol
adds no new capture, render, provider, production or visual-quality certification.
## Local presentation-file proof update (2026-10-08)

The no-key bridge's named proof is `CURRENT-GATES-RETAINED-EVIDENCE-OBSERVED-DRIFT-REJECTED-01`. Unchanged main passed 43 parses, 36 tour assertions, 34 prose citations and three render records. The candidate passed 45 parses (two protocol files added), the same 36/34/3 assertions and 20 local scenarios with no failures or skips. The preserved old 13-scenario suite had passed while labelling a schema-only receipt verified; the corrected scenario returns observed, including failed and unbound references. These are different suites, not a speed comparison.

The actual projection contains three observed historical assets and zero workflow receipt references, with not-certified/releaseReady false. Stale proof did not rewrite outputs; redirected directory/file outputs were rejected with foreign files unchanged; eight repeated rounds and two simultaneous disjoint fixture jobs passed. The [bridge update log](docs/NODEKIT_PRESENT_EVIDENCE.md) records the source/claim boundaries and preserved Windows launcher failure. No capture/render, provider, production, physical-device or pixel result was added by this work.

## Transitive dependency audit update (2026-10-08)

A developer using the retained Remotion 4.0.479 toolchain can install the patched lock without changing its top-level dependency versions or parent ranges. The pre-update lock audit reported one moderate [fast-uri advisory](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj) and one high [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). The normal `npm update fast-uri source-map-js --package-lock-only` changed fast-uri 3.1.7 to 3.1.8 and source-map-js 1.2.1 to 1.2.2. Only their version, registry URL and integrity fields changed; the 233 lock entries and all other dependency records stayed the same.

Named local proof `FEATURECLIP-TWO-TRANSITIVE-AUDIT-FIXES-01` passed: the new `npm audit --package-lock-only --json` returned zero findings, and `npm run check` passed 45 source parses, 36 tour assertions, 34 prose citations, three render-record byte bindings and all 20 existing scenarios with no failures or skips. The evidence proof still reports three observed historical assets, zero workflow receipt references and `releaseReady: false`.

This run updated the lock only; it did not install dependencies, capture or render media, or certify security, pixels or release readiness. Remote CI, a fresh installed-tree audit and render compatibility remain pending at this proof capture time. The earlier dated output and audit results above remain historical.
