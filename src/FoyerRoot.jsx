import React from "react";
import { Composition } from "remotion";
import { Walkthrough, WT_FPS, WT_W, WT_H, wtDuration } from "./Walkthrough.jsx";
import { FOYER_WALKTHROUGHS } from "./walkthrough.foyer.data.js";

// FOYER-V3 R1: the three Node Foyer walkthroughs (FYwall, FYphone, FYagent), each its own
// composition ("WT-<id>", same convention as src/Root.jsx) so run-remotion.mjs can render
// one at a time — `remotion render src/foyer-index.js WT-FYwall out/foyer-FYwall.mp4`.
// Reuses Walkthrough.jsx unchanged: each entry's `captureViewport` (written by
// walkthrough.foyer.mjs) drives Walkthrough.jsx's geometryFor so the phone (390x844) and
// wall/agent (1440x900) captures each get their own aspect ratio instead of the historical
// 1280x800 default.
export const FoyerRoot = () => (
  <>
    {FOYER_WALKTHROUGHS.map((w) => (
      <Composition
        key={"WT-" + w.id}
        id={"WT-" + w.id}
        component={Walkthrough}
        durationInFrames={Math.max(1, wtDuration(w))}
        fps={WT_FPS}
        width={WT_W}
        height={WT_H}
        defaultProps={{ wt: w }}
      />
    ))}
  </>
);
