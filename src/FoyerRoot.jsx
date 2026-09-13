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
//
// Round-3 repair: the composition CANVAS also has to match that aspect, or a portrait capture
// still letterboxes inside the fixed 1920x1080 (16:9) default (round-10 finding: FYphone's GIF
// was a 390x219 letterboxed 16:9 clip). canvasFor scales captureViewport up to a sane render
// resolution while keeping its exact aspect: portrait doubles (390x844 -> 780x1688, the round-10
// council's own example), landscape renders 1:1 (1440x900 is already plenty of resolution).
const canvasFor = (vp) => {
  if (!vp || !vp.width || !vp.height) return { w: WT_W, h: WT_H };
  const portrait = vp.height > vp.width;
  const k = portrait ? 2 : 1;
  return { w: vp.width * k, h: vp.height * k };
};

export const FoyerRoot = () => (
  <>
    {FOYER_WALKTHROUGHS.map((w) => {
      const canvas = canvasFor(w.captureViewport);
      return (
        <Composition
          key={"WT-" + w.id}
          id={"WT-" + w.id}
          component={Walkthrough}
          durationInFrames={Math.max(1, wtDuration(w))}
          fps={WT_FPS}
          width={canvas.w}
          height={canvas.h}
          defaultProps={{ wt: { ...w, canvasW: canvas.w, canvasH: canvas.h } }}
        />
      );
    })}
  </>
);
