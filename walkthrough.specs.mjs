// Walkthrough specs for the NodeBench surfaces.
//
// Each spec is an ORDERED list of ops:
//   { cap, cursor?, click?, hold? }  -> CAPTURE a clean frame of the CURRENT UI
//        state. `cursor` marks where the pointer glides to; `click:true` draws a
//        ripple there; `hold` = frames to dwell (30 fps).
//   { act, ... }                     -> PERFORM an action to advance the UI.
//
// These replace the ParselyFi specs, kept at walkthrough.specs.parselyfi.bak.mjs.
//
//   NodeRoom   :5260   shared workrooms, review-first agent edits
//   NodeSlide  :5180   decks built from a brief, reviewable rather than static
//
// `chromeUrl` fills the rendered address bar. It used to be hardcoded to
// parselyfi.streamlit.app, so every clip shipped with another product's URL over
// its own UI. The address bar is part of the claim; it comes from the spec now.
//
// TWO RULES LEARNED FROM REVIEWING THE FIRST RENDER, both the hard way:
//
// 1. A CAPTION MAY ONLY DESCRIBE WHAT THE FRAME SHOWS. The first cut captioned
//    "the brief drives the deck" and "route, tokens and cost are recorded in
//    Trace" over a picture of an empty composer. No deck was ever on screen.
//    That is a fabricated claim in the artifact most people will only skim.
//
// 2. EVERY STEP MUST SHOW SOMETHING NEW. The first cut had four captioned steps
//    over ONE frozen viewport, because the spec used `scroll` — which is not a
//    valid act — and the handler silently ignored it. Both landings are exactly
//    one viewport tall, so there was never anything to scroll to either. Real
//    second views come from interacting, not from paging a page with no pages.

export const SPECS = [
  {
    id: "NodeRoom",
    title: "NodeRoom — review every agent change",
    accent: "#E0653A",
    url: "http://localhost:5260/#story",
    chromeUrl: "noderoom.app",
    ready: "Excel-like editing for humans",
    // Flat camera. #story is full-bleed dense text, so the default 1.14 result
    // scale cropped ~12% of width and cut every left margin mid-word — the
    // closing frame read "oved — re-applied at the current version". Legibility
    // beats the zoom on a page where the words ARE the evidence.
    scales: { action: 1.0, result: 1.0, open: 1.0 },
    // The marketing landing is one viewport and touches 0 of its 6 controls, so
    // a clip of it is a captioned screenshot. #story is the actual product tour:
    // an 8570px inner scroller (div.r-screen.rs-scroll — window.scrollTo does
    // NOT move it) with three drills that run the same engine calls as a live
    // room, ending in a real review proposal with an Approve button.
    //
    // Every caption below was written after watching that step in a rehearsal
    // run, not from reading the DOM. The drill outputs are quoted from what the
    // engine actually printed.
    steps: [
      { cap: "If your team lives in a spreadsheet, this is for you: an AI helper that cannot wreck your numbers.", hold: 78 },
      { act: "scrollEl", sel: 'text=Edit the cell. Ask the agent' },
      { cap: "You change one number. The AI checks it. Only that one cell changes — nothing else moves.", hold: 88 },

      // Drill 1 — no-clobber. Same compare-and-swap path as the live room.
      { act: "scrollEl", sel: 'text=No stale write gets through' },
      { cap: "Press the button: the AI tries to overwrite your edit — and gets told no.", cursor: 'text=Let the AI try to overwrite my edit', click: true, hold: 72 },
      { act: "click", sel: 'text=Let the AI try to overwrite my edit' },
      { act: "sleep", ms: 3200 },
      { cap: "When you and the AI disagree, you see both versions side by side. Nothing is lost.", hold: 96 },

      // Drill 2 — lease + draft-around-lock.
      { act: "scrollEl", sel: 'text=Draft-around-lock, then smart-merge' },
      { act: "click", sel: 'text=Reserve a cell and let the AI work around me' },
      { act: "sleep", ms: 3400 },
      { cap: "Reserve a cell while you think. The AI works around you and waits its turn.", hold: 96 },

      // Drill 3 — the trust surface. An agent write that lost the race becomes a
      // reviewable proposal instead of an overwrite.
      { act: "scrollEl", sel: 'text=Watch a late AI edit become a suggestion' },
      { act: "click", sel: 'text=Watch a late AI edit become a suggestion' },
      { act: "sleep", ms: 3600 },
      { cap: "A late AI edit becomes a suggestion you approve — never a surprise.", hold: 104 },

      // The decision itself: a human approves, and it re-applies at the CURRENT
      // version rather than the stale baseline.
      { cap: "You tap approve. The change lands on today's numbers, not yesterday's.", cursor: 'text=Approve proposal', click: true, hold: 76 },
      { act: "click", sel: 'text=Approve proposal' },
      { act: "sleep", ms: 2600 },
      // Re-centre on the RESULT before the closing frame. Without this the camera
      // stays panned toward the Approve button it just clicked and crops the left
      // edge, so the confirmation rendered as "oved — re-applied at the current
      // version". An unreadable closing frame is not a closing frame.
      { act: "scrollEl", sel: "text=re-applied at the current version" },
      { cap: "Nothing changes your sheet without being seen first. That is the whole promise.", hold: 100 },
    ],
  },
  {
    // R2/R3 from JOURNEYS.md — the fresh-user flow, a SEPARATE clip from the
    // #story drills. This journey only exists after hydration: boot.ts defers
    // the app until first interaction, and the React landing that replaces the
    // SSR shell has the inline join-code control and the LIVE DEMO card. The
    // scrollY(1) fires the scroll listener boot.ts is waiting on; "LIVE DEMO"
    // exists only in the hydrated page, so waiting on it is proof, not a timer.
    //
    // Both dialogs in this spec were ILLEGIBLE until tonight: every dialog on
    // the FocusTrapDialog path rendered position:static behind its own blur
    // scrim (Radix portals overlay/content as siblings; `unstyled` dropped the
    // Tailwind positioning). Fixed in noderoom/src/app/styles.css — this clip
    // films the repaired product, and every caption quotes a rehearsed frame.
    id: "NodeRoomFresh",
    title: "NodeRoom — from landing to a room",
    accent: "#E0653A",
    url: "http://localhost:5260/",
    chromeUrl: "noderoom.app",
    ready: "Review every change",
    scales: { action: 1.0, result: 1.0, open: 1.0 },
    steps: [
      { act: "scrollY", y: 1 },
      { act: "waitText", value: "LIVE DEMO" },
      { act: "sleep", ms: 1500 },
      { cap: "A fresh visitor lands — a live agent room, source-backed, join by code", hold: 92 },

      { cap: "Start a room", cursor: "link:^create a room$", click: true, hold: 62 },
      { act: "click", sel: "link:^create a room$" },
      { act: "sleep", ms: 3000 },
      { cap: "One question before anything else: how should agent edits land?", hold: 106 },

      { act: "press", key: "Escape" },
      { act: "sleep", ms: 900 },
      { act: "fill", sel: 'input[placeholder*="CODE" i]', value: "Q3X-7K" },
      { cap: "Or join with a code — a room shares a code, not a seat", hold: 88 },

      { cap: "Try the sample", cursor: 'a:has-text("Try sample"), button:has-text("Try sample")', click: true, hold: 60 },
      { act: "click", sel: 'a:has-text("Try sample"), button:has-text("Try sample")' },
      { act: "sleep", ms: 3000 },
      { cap: "The sample tells you it is synthetic — not live research", hold: 104 },
    ],
  },
  {
    id: "NodeSlide",
    title: "NodeSlide — decks that stay editable",
    accent: "#3E6FF0",
    url: "http://localhost:5180/",
    chromeUrl: "nodeslide.app",
    ready: "What presentation should we build",
    // Same flat camera as NodeRoom: the deck editor is a dense three-pane
    // workspace and the inspector text is the evidence. Cropping 12% off the
    // right would cut the panel the clip exists to show.
    scales: { action: 1.0, result: 1.0, open: 1.0 },
    // Deliberately does NOT click "Propose edit". That fires a real model call —
    // slow, and non-deterministic, and a capture that sometimes catches a spinner
    // is a capture that sometimes lies. The inspector tabs carry the same claim
    // (reviewable, versioned, evidence-backed, traced) and are deterministic.
    //
    // Every caption below quotes what the panel actually says, checked in a
    // rehearsal run first.
    steps: [
      { cap: "Start from an idea, a spec, or evidence", cursor: "textarea", hold: 74 },
      { act: "fill", sel: "textarea", value: "A deck on agent evaluation: what ground truth actually means" },
      { act: "sleep", ms: 1200 },
      { cap: "A brief, not a template", hold: 78 },

      { cap: "Open the sample workspace", cursor: 'text="Explore the editable sample workspace"', click: true, hold: 64 },
      { act: "click", sel: 'text="Explore the editable sample workspace"' },
      { act: "sleep", ms: 6000 },
      { cap: "A real deck — outline rail, canvas, inspector", hold: 90 },

      // A deck here is a typed structure, so individual elements are selectable.
      { act: "click", sel: '[aria-label^="Headline, text slide element"]' },
      { act: "sleep", ms: 2000 },
      { cap: "Every element is typed and addressable — not flattened to an image", hold: 92 },

      { act: "click", sel: '[role=tab]:has-text("Versions")' },
      { act: "sleep", ms: 2400 },
      { cap: "Revisions you can compare and restore", hold: 88 },

      { act: "click", sel: '[role=tab]:has-text("Evidence")' },
      { act: "sleep", ms: 2400 },
      { cap: "Citations stay attached — and it states plainly it does not verify facts", hold: 96 },

      { act: "click", sel: '[role=tab]:has-text("Trace")' },
      { act: "sleep", ms: 2600 },
      { cap: "One auditable run — and cost reads 'not recorded' rather than guessed", hold: 100 },
    ],
  },
];
