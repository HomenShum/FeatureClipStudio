import React from "react";
import { Composition } from "remotion";
import { Walkthrough, WT_FPS, WT_W, WT_H, wtDuration } from "./Walkthrough.jsx";
import { SLIDELANG_WALKTHROUGHS } from "./walkthrough.slidelang.data.js";

export const SlideLangRoot = () => (
  <>
    {SLIDELANG_WALKTHROUGHS.map((walkthrough) => (
      <Composition
        key={`WT-${walkthrough.id}`}
        id={`WT-${walkthrough.id}`}
        component={Walkthrough}
        durationInFrames={Math.max(1, wtDuration(walkthrough))}
        fps={WT_FPS}
        width={WT_W}
        height={WT_H}
        defaultProps={{ wt: walkthrough }}
      />
    ))}
  </>
);
