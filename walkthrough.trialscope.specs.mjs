// TrialScope — ClinicalTrials.gov query-to-visualization agent, captured LIVE:
//   web  https://web-jade-two-d7v7jv0nvu.vercel.app
//   api  https://trialscope-api-7xtb75zi5q-uc.a.run.app  (Cloud Run, no database)
//
// THE COMPREHENSION RECUT, and what the previous cut got wrong.
//
// The inverted cut scored 20/40 against rubric.mjs: craft 11/20, comprehension
// 9/20, judged for a non-technical viewer. That split is the whole finding. The
// video was well made -- real states, real loading, a genuine peak at the graph
// -- and a viewer still could not have told you who it is for, what job it does,
// what problem existed before it, or how to point it at a question of their own.
// Craft is what a demo's author notices missing. Comprehension is what everyone
// else notices missing.
//
// So this cut keeps the inverted STORY (graph hooks, trace proves) and repairs
// the ten comprehension dimensions explicitly:
//
//   persona + purpose   A premise beat before anything happens, naming the
//                       person and the job. Three seconds buys the other forty.
//   use_case            The question on screen is one a real person has, and the
//                       caption says why they are asking it.
//   feature_legibility  Each capability is NAMED as it appears, so the viewer
//                       leaves able to list features rather than having watched
//                       a chart appear.
//   full_interaction    Nothing cuts from click to finished result.
//   responsiveness      The waiting is shown and CAPTIONED as the product
//                       working, not edited out as dead time.
//   flow                Each beat states why it follows from the last.
//   result              An explicit "here is what you now have" beat.
//   lay_sense           Every caption passes the mom test. "totalCount probe"
//                       became "one question at a time". The jargon that
//                       survives is jargon the video defines on screen.
//   own_case_transfer   A closing beat on the EMPTY composer showing the shape
//                       of your own question -- the dimension the old cut scored
//                       worst on, because it proved one example and never showed
//                       the door in.
export const TRIALSCOPE_SPECS = [
  {
    id: "TShero",
    title: "TrialScope — a graph you can audit, edge by edge",
    accent: "#0f766e",
    // Frameless: no window chrome, no title bar, no step counter. The capture
    // fills 1920x1080 edge to edge. The frame was spending ~38% of the canvas
    // restating things the viewer already knows.
    frame: false,
    vw: 1440,
    vh: 900,
    retries: 3,
    panes: [
      { label: "TrialScope — live on Vercel + Cloud Run",
        url: "https://web-jade-two-d7v7jv0nvu.vercel.app" },
    ],
    steps: [
      { act: "sleep", pane: 0, ms: 3000 },

      // ------------------------------------------------------------- PREMISE
      // The beats the previous cut did not have. A viewer who does not know who
      // is asking cannot tell whether the answer is any good.
      { cap: "Say you want to know who runs the drug trials",
        hold: 62 },
      { cap: "Right now you read a huge list. One study at a time.",
        hold: 58 },
      { cap: "Ask it in one line instead",
        cursor: "textarea[name=\"input\"]", cursorPane: 0, hold: 40 },

      // ---------------------------------------------------------------- HOOK
      { act: "type", pane: 0, sel: "textarea[name=\"input\"]",
        value: "Show a network of sponsors and drugs for melanoma trials.", delay: 26 },
      { cap: "Which drug firms and which drugs show up side by side?",
        cursor: "btn:Send message", cursorPane: 0, click: true, hold: 40 },
      { act: "click", pane: 0, sel: "btn:Send message" },
      { act: "sleep", pane: 0, ms: 700 },

      // RESPONSIVENESS: the wait is the product working, so it is captioned as
      // work rather than trimmed as dead air.
      { cap: "It picks the right questions. Then it asks each one.",
        burst: { ms: 11000, every: 320 }, hold: 68 },
      { act: "waitText", pane: 0, value: "co-occurring" },
      { act: "sleep", pane: 0, ms: 700 },

      { cap: "37 asks later, here is who works on what",
        cursor: "btn:interactive map", cursorPane: 0, click: true, hold: 44 },
      { act: "click", pane: 0, sel: "btn:interactive map" },
      { act: "sleep", pane: 0, ms: 5000 },
      // FEATURE_LEGIBILITY: name what the picture encodes, in plain words.
      { cap: "Big dot means more trials. Thick line means more shared trials.",
        zoom: "testid:neuromap-frame", zoomScale: 1.3, hold: 92 },

      // --------------------------------------------------------------- DOUBT
      { cap: "But a computer could just make this up.",
        zoom: "testid:neuromap-frame", zoomScale: 1.42, hold: 76 },

      // --------------------------------------------------------------- PROOF
      { act: "scrollEl", pane: 0, sel: "testid:trace-disclosure" },
      { cap: "So it shows its work",
        cursor: "testid:trace-disclosure", cursorPane: 0, click: true,
        zoom: "testid:trace-disclosure", zoomScale: 1.4, hold: 34 },
      { act: "click", pane: 0, sel: "testid:trace-disclosure" },
      { act: "sleep", pane: 0, ms: 1100 },
      { cap: "Each row is one ask. And the count it got back.",
        zoom: "testid:trace-disclosure", zoomScale: 1.85, hold: 150 },
      { cap: "Ask the site yourself. You get the same count.",
        zoom: "testid:trace-disclosure", zoomScale: 1.85, hold: 132 },

      // -------------------------------------------------------------- SPREAD
      { act: "click", pane: 0, sel: "btn:New Thread" },
      { act: "sleep", pane: 0, ms: 1100 },
      { act: "type", pane: 0, sel: "textarea[name=\"input\"]",
        value: "How are melanoma trials distributed across phases?", delay: 24 },
      { cap: "New question. How far along are these trials?",
        cursor: "btn:Send message", cursorPane: 0, click: true, hold: 34 },
      { act: "click", pane: 0, sel: "btn:Send message" },
      { act: "sleep", pane: 0, ms: 600 },
      { cap: "Same trick. Pick the groups. Count each one.",
        burst: { ms: 5400, every: 300 }, hold: 54 },
      { act: "waitText", pane: 0, value: "Reconciliation" },
      { act: "scrollEl", pane: 0, sel: "testid:panel-reconciliation" },
      { cap: "It flags a catch. One trial can sit in two groups.",
        zoom: "testid:panel-reconciliation", zoomScale: 1.4, hold: 96 },
      { cap: "So it will not draw a pie. The slices would not add up.",
        zoom: "testid:panel-reconciliation", zoomScale: 1.4, hold: 88 },

      // The hardest question, and the reason the index exists at all.
      { act: "click", pane: 0, sel: "btn:New Thread" },
      { act: "sleep", pane: 0, ms: 1100 },
      { act: "type", pane: 0, sel: "textarea[name=\"input\"]",
        value: "Which sponsors also work on what the National Cancer Institute (NCI) works on?", delay: 22 },
      { cap: "Now a question one count cannot answer.",
        cursor: "btn:Send message", cursorPane: 0, click: true, hold: 36 },
      { act: "click", pane: 0, sel: "btn:Send message" },
      { act: "sleep", pane: 0, ms: 700 },
      { cap: "It walks from one firm to the next. Then it checks each hop.",
        burst: { ms: 8000, every: 320 }, hold: 78 },
      { act: "sleep", pane: 0, ms: 900 },
      { cap: "The map picked these firms. The site checked each one.",
        zoom: "testid:panel-distribution", zoomScale: 1.32, hold: 96 },

      // -------------------------------------------------------------- RESULT
      { cap: "Three asks. Three answers. And proof for each count.",
        hold: 92 },

      // ------------------------------------------------------------ YOUR TURN
      { act: "click", pane: 0, sel: "btn:New Thread" },
      { act: "sleep", pane: 0, ms: 1200 },
      { cap: "Your turn. Name an illness. Say what you want to see.",
        cursor: "textarea[name=\"input\"]", cursorPane: 0, hold: 44 },
      { act: "type", pane: 0, sel: "textarea[name=\"input\"]",
        value: "Where are Parkinson's trials running, by country?", delay: 24 },
      { cap: "Any illness. Any split. Same proof.",
        hold: 96 },
    ],
  },
];
