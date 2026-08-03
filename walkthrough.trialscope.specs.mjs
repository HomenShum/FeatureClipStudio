// TrialScope — ClinicalTrials.gov query-to-visualization agent, captured LIVE:
//   web  https://web-jade-two-d7v7jv0nvu.vercel.app
//   api  https://trialscope-api-7xtb75zi5q-uc.a.run.app  (Cloud Run, no database)
//
// THE INVERTED CUT, and why it replaced the previous structure.
//
// The first version opened on a phase bar chart and built to the trace
// disclosure, because the trace is the intellectually important moment. The
// judge, watching Raycast 39-second launch film as a reference, named the
// NETWORK GRAPH as the peak on three separate cuts -- including after the trace
// was moved earlier, zoomed to 1.85x, and given the longest hold in the film.
// Three consistent readings is a fact about the viewer, not a scoring artefact:
// a table of URLs does not out-compete an animating graph.
//
// So the STORY was inverted rather than the polish increased.
//
//   HOOK    The graph. 37 probes fan out and a sponsor-drug network assembles.
//           The most visually arresting thing the product does, arriving first
//           instead of at 0:27.
//   DOUBT   Stated out loud, because the viewer is already thinking it: a
//           network diagram is exactly the kind of artifact a model invents.
//   PROOF   Open the trace. 37 rows, each the literal URL and params that
//           produced one edge weight.
//   SPREAD  Not a one-trick shot -- the same contract on a simple distribution
//           (overlap declared), and on a two-hop question a single count cannot
//           answer at all.
//
// Proving a GRAPH is real is a harder claim than proving a bar chart is, so the
// inversion makes the proof land harder rather than softer. The reference shape
// is respected: product on screen in the first second, peak near the midpoint.
export const TRIALSCOPE_SPECS = [
  {
    id: "TShero",
    title: "TrialScope — a graph you can audit, edge by edge",
    accent: "#0f766e",
    vw: 1440,
    vh: 900,
    retries: 3,
    panes: [
      { label: "TrialScope — live on Vercel + Cloud Run",
        url: "https://web-jade-two-d7v7jv0nvu.vercel.app" },
    ],
    steps: [
      { act: "sleep", pane: 0, ms: 3000 },

      // ---------------------------------------------------------------- HOOK
      // No title card: Raycast puts the product on screen at 0:01, and the
      // previous cut spent 62 frames orienting a viewer already looking at it.
      { act: "type", pane: 0, sel: "textarea[name=\"input\"]",
        value: "Show a network of sponsors and drugs for melanoma trials.", delay: 26 },
      { cap: "Which sponsors and drugs co-occur across melanoma trials?",
        cursor: "btn:Send message", cursorPane: 0, click: true, hold: 34 },
      { act: "click", pane: 0, sel: "btn:Send message" },
      { act: "sleep", pane: 0, ms: 700 },

      // The fan-out as motion -- the part a viewer assumes is a canned animation.
      { cap: "37 probes fan out across the registry",
        burst: { ms: 11000, every: 320 }, hold: 64 },
      { act: "waitText", pane: 0, value: "co-occurring" },
      { act: "sleep", pane: 0, ms: 700 },

      { cap: "A sponsor-drug network, built entirely from exact counts",
        cursor: "btn:interactive map", cursorPane: 0, click: true, hold: 44 },
      { act: "click", pane: 0, sel: "btn:interactive map" },
      { act: "sleep", pane: 0, ms: 5000 },
      { cap: "Node size is trial count. Edge thickness is co-occurring trials.",
        zoom: "testid:neuromap-frame", zoomScale: 1.3, hold: 96 },

      // --------------------------------------------------------------- DOUBT
      // Said plainly. A demo that will not name the obvious objection reads as
      // though it is hiding from it.
      { cap: "A network diagram is exactly what a model would invent.",
        zoom: "testid:neuromap-frame", zoomScale: 1.42, hold: 80 },

      // --------------------------------------------------------------- PROOF
      { act: "scrollEl", pane: 0, sel: "testid:trace-disclosure" },
      { cap: "So every edge is one row here",
        cursor: "testid:trace-disclosure", cursorPane: 0, click: true,
        zoom: "testid:trace-disclosure", zoomScale: 1.4, hold: 34 },
      { act: "click", pane: 0, sel: "testid:trace-disclosure" },
      { act: "sleep", pane: 0, ms: 1100 },
      // Tightest zoom, longest hold: this frame has to be READ, not glanced at,
      // because it is the entire claim.
      { cap: "37 URLs. Re-issue any one and it returns the same number.",
        zoom: "testid:trace-disclosure", zoomScale: 1.85, hold: 176 },

      // -------------------------------------------------------------- SPREAD
      { act: "click", pane: 0, sel: "btn:New Thread" },
      { act: "sleep", pane: 0, ms: 1100 },
      { act: "type", pane: 0, sel: "textarea[name=\"input\"]",
        value: "How are melanoma trials distributed across phases?", delay: 24 },
      { cap: "The same contract on a simpler question",
        cursor: "btn:Send message", cursorPane: 0, click: true, hold: 32 },
      { act: "click", pane: 0, sel: "btn:Send message" },
      { act: "sleep", pane: 0, ms: 600 },
      { cap: "It plans the dimension, then probes each bucket",
        burst: { ms: 5400, every: 300 }, hold: 52 },
      { act: "waitText", pane: 0, value: "Reconciliation" },
      { act: "scrollEl", pane: 0, sel: "testid:panel-reconciliation" },
      { cap: "And it declares the overlap itself -- so nobody draws a pie",
        zoom: "testid:panel-reconciliation", zoomScale: 1.4, hold: 104 },

      // The hardest question, and the reason the index exists at all.
      { act: "click", pane: 0, sel: "btn:New Thread" },
      { act: "sleep", pane: 0, ms: 1100 },
      { act: "type", pane: 0, sel: "textarea[name=\"input\"]",
        value: "Which sponsors also work on what the National Cancer Institute (NCI) works on?", delay: 22 },
      { cap: "And one a single count cannot answer at all",
        cursor: "btn:Send message", cursorPane: 0, click: true, hold: 34 },
      { act: "click", pane: 0, sel: "btn:Send message" },
      { act: "sleep", pane: 0, ms: 700 },
      { cap: "Two hops through the index -- then every peer probed, every claim checked",
        burst: { ms: 8000, every: 320 }, hold: 76 },
      { act: "sleep", pane: 0, ms: 900 },
      { cap: "The graph proposed them. The registry confirmed each one.",
        zoom: "testid:panel-distribution", zoomScale: 1.32, hold: 104 },

      // ------------------------------------------------------------- VERDICT
      { cap: "The model chose the questions. ClinicalTrials.gov gave every answer.",
        hold: 200 },
    ],
  },
];
