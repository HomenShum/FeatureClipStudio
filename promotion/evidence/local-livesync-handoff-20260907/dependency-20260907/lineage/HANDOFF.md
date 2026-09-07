# Run the reviewed local collaboration example

A developer can use FeatureClipStudio to turn a recorded two-client interaction into a movie and GIF. Start with the preserved LiveSync example: it shows an added card, a fixed-text agent response and the same selected result in both clients. Its title identifies local, in-memory behavior. This example does not establish a cloud service, model response or durable collaboration.

**Re your request:** make the current tool usable for developer handoff with actual exported proof — the commands below reproduce the scoped example from this checkout. The [evidence index](promotion/evidence/local-livesync-handoff-20260907/README.md) separates the original failures, corrected capture behavior and accepted encoded output.

## First render

The observed lane used Windows, Node 22.22.2, the locked Remotion 4.0.474 and Playwright 1.60.0. Use a short checkout path on Windows. Have ffmpeg and ffprobe on PATH; Python 3 is needed only for the evidence verifier. Other host/version combinations were not certified by this run.

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

The normal source check passed 39 JavaScript parses, 36 tour anchors and 34 prose citations on the reviewed behavior source. This handoff and its evidence index were added afterward; they do not imply another runtime run or shared CI result.

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

The default `npm run render:example` still renders historical WT-NodeRoom inputs and retains a separate output-quality hold. LiveSync acceptance does not certify other examples, responsive browser behavior, physical devices, provider behavior or production. The recorded install reported 12 dependency advisories (2 low, 10 high), which remain unresolved. Full criterion and overall grades remain null.

Verify the packet and its selected current source bindings from the repository root:

```sh
python promotion/evidence/local-livesync-handoff-20260907/verify.py
python promotion/evidence/local-livesync-handoff-20260907/verify.py --source-root .
```

The first command checks exact packet bytes. The optional source check accepts only each row's demonstrated Git checkout newline transformation; it does not rerun capture/render or certify the whole repository. The evidence index records raw versus minimized receipts and which historical artifacts remain operator-local.
