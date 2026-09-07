# Dependency update with preserved output

A developer installing the example previously received an audit with 12 affected packages. The current lock aligns Remotion at 4.0.479, and its normal installed-tree audit reported zero on September 7, 2026. React 18.3.1, React DOM 18.3.1 and Playwright 1.60.0 stayed unchanged. The observed host was Windows, Node 22.22.2, Chrome Headless Shell 149.0.7790.0, with the existing short-path wrapper.

Use the [normal handoff commands](../../../../HANDOFF.md). This update rendered the same preserved inputs; it did not recapture a browser interaction or request a model, provider or voice service.

| Observed result | Evidence |
|---|---|
| Normal clean install, aligned cohort and audit zero | [Install](setup/npm-ci.stdout.txt), [audit](setup/npm-audit.stdout.txt), [versions](setup/remotion-versions.stdout.txt), [installed identities](setup/installed-identities.json) |
| Source check and real Windows path boundary passed | [Check](checks/normal-check.stdout.txt), [boundary](checks/max-path-observed.json), [browser](checks/browser-identity.json). The already dirty operator probe was saved and restored byte-for-byte. |
| 44 preserved stills matched decoded pixels | [Stage summary](stage-summary.json); old-cohort outputs were retained, not rerendered |
| 588-frame 1920×1080/30 fps movie and 294-frame 720×405 GIF fully decoded; 117 sampled frames matched | [New movie](03-livesync/livesync.mp4), [new GIF](03-livesync/livesync.gif), [media identities](03-livesync/media-bindings.json), [movie probe](03-livesync/livesync-probe.stdout.txt), [GIF probe](03-livesync/gif-probe.stdout.txt) |
| Default 1,142-frame example fully decoded; five sampled frames matched | [New default movie](04-legacy/legacy-noderoom.mp4), [probe](04-legacy/legacy-probe.stdout.txt), [media identities](04-legacy/media-bindings.json) |

Inspect [LiveSync start](03-livesync/movie-0.png), [long card](03-livesync/movie-432.png), [last state](03-livesync/movie-587.png), [actual GIF long card](03-livesync/gif-216.png), and [default midpoint](04-legacy/legacy-571.png). MP4 container hashes changed; matching selected decoded pixels does not assert identical every-frame pixels or audio. The GIF bytes remained exact. Existing default readability, tight LiveSync lower margin, partly cropped previous card, early camera travel, audio listening, continuous-motion and human comprehension limits remain open. Full grades remain null.

The [copy map](copy-map.json) declares exact raw payloads and explicit path-minimized derivatives. [Stage summary](stage-summary.json) is an authored receipt summary, not a raw controller log. [Omissions](omissions.json) bind the private complete runs without claiming their caches or inventories are supplied. Four previous metadata files under lineage remain exact and historical. The parent verifier binds the whole updated packet and 77 selected current source files. The [independent media judgment](review/RECEIPT.json) approved the finite dependency handoff with the stated pixel and audio limits. Its [native media readback](review/native-media-verification.json) distinguishes frame and container durations. New shared CI remains pending until the updated commit runs there.
