// TrialScope — the walkthrough in a REAL IDE.
//
// WHY THIS EXISTS, WHEN A DECK ALREADY DID.
//
// The decisions deck states eight conclusions. Measured against the genre it was
// pretending to belong to, it carries 3% of the content of a real code
// walkthrough: 262 words against 8,380 for a 48-minute Perplexica teardown. It is
// a summary, and it looks like slides, because it is slides.
//
// A code walkthrough shows the code. Folders opened, files clicked, source
// scrolled with a wheel, tests run in a terminal where they can fail. That is not
// a stylistic preference -- it is the difference between asserting a codebase
// exists and letting a viewer watch someone move through it.
//
// HOW IT IS CAPTURED WITHOUT A SCREEN RECORDER.
//
// `code serve-web` runs the actual VS Code over HTTP against the actual folder,
// so the existing Playwright pipeline drives a real IDE -- real explorer tree,
// real Monaco editor, real integrated terminal running real commands. Nothing
// here is a mock of an editor; the selectors below are VS Code's own DOM.
//
//   code serve-web --host 127.0.0.1 --port 8100 --without-connection-token \
//     --accept-server-license-terms
//
// SAFETY: `.env` is visible in the explorer tree of this repo and MUST NEVER be
// opened. The file name in a listing is harmless; its contents are an API key on
// a public video. No step below clicks it, and none should be added.
export const TRIALSCOPE_IDE_SPECS = [
  {
    id: "TSide",
    title: "TrialScope — the code",
    accent: "#38bdf8",
    frame: false,
    // dsf 1, not the default 2: xterm's canvas renderer paints nothing at
    // devicePixelRatio 2 in headless Chromium. A capture ran a real pytest whose
    // output existed server-side while every frame showed an empty terminal.
    dsf: 1,
    vw: 1600,
    vh: 1000,
    retries: 2,
    panes: [
      { label: "VS Code — cheiron-ai-take-home",
        url: "http://127.0.0.1:8100/?folder=/d%3A/VSCode%20Projects/cheiron-ai-take-home" },
    ],
    steps: [
      // VS Code web is slow to hydrate; a short wait here captures a half-built
      // workbench and makes the whole cut look broken.
      { act: "sleep", pane: 0, ms: 26000 },

      // The trust MODAL, not the banner. Workspace UI state lives server-side in
      // serve-web, so once any session has opened a terminal, every later client
      // restores that panel at startup -- and restoring a terminal in an
      // untrusted folder throws a blocking "Do you trust the authors?" dialog
      // over the whole workbench. Nothing is clickable until it is answered, so
      // it is answered first, on camera: a real trust prompt is more evidence of
      // a real IDE, not less.
      { cap: "First, tell the editor this folder is ours to run.", hold: 56 },
      { act: "click", pane: 0, sel: '.monaco-text-button:has-text("Trust Folder")' },
      { act: "sleep", pane: 0, ms: 3500 },

      { cap: "This is the whole repo. Let us open it.", hold: 74 },

      // ---------------------------------------------------------- the tree
      // Sequence borrowed from Hello Interview, which spends 15 of 53 minutes on
      // "Code Comprehension" BEFORE writing anything -- 28% of the video on
      // understanding, as chapter three of six. That is the right shape for a
      // repo an agent helped build, because comprehension is exactly what decays
      // when code arrives faster than it can be read.
      { act: "click", pane: 0, sel: ".monaco-list-row[aria-label='app']" },
      { act: "sleep", pane: 0, ms: 1400 },
      { cap: "The app folder. Each file does one job.", hold: 76 },

      // Rule 3: start at the ENTRY POINT and follow imports down, rather than
      // touring files alphabetically (Hello Interview 06:50).
      { act: "click", pane: 0, sel: ".monaco-list-row[aria-label='main.py']" },
      { act: "sleep", pane: 0, ms: 2200 },
      { cap: "Start where a request lands. Then follow it down.", hold: 74 },
      { act: "find", pane: 0, value: "from .executor" },
      { cap: "It hands the question to the executor.", hold: 70 },

      // -------------------------------------------------- the count client
      { act: "click", pane: 0, sel: ".monaco-list-row[aria-label='ctgov.py']" },
      { act: "sleep", pane: 0, ms: 2400 },
      { cap: "This file asks the registry for counts. Nothing else.", hold: 78 },
      // Rule 1: selection AS POINTER. The highlight is Monaco's own find, so the
      // viewer's eye lands on the line being talked about instead of hunting.
      { act: "find", pane: 0, value: "countTotal" },
      { cap: "There it is. Ask for the count, take no records back.", hold: 84 },
      { act: "find", pane: 0, value: "_single_flight" },
      { cap: "And here, the same question twice becomes one trip.", hold: 84 },

      // ------------------------------------------------------ the planner
      { act: "click", pane: 0, sel: ".monaco-list-row[aria-label='executor.py']" },
      { act: "sleep", pane: 0, ms: 2200 },
      { cap: "This one turns a question into a list of asks.", hold: 76 },
      { act: "find", pane: 0, value: "PHASES = " },
      { cap: "The groups are fixed. So the work has a ceiling.", hold: 80 },
      { act: "wheel", pane: 0, x: 950, y: 520, dy: 340, steps: 5, gap: 130 },
      { cap: "One ask per bar. Six bars is six trips to the site.", hold: 80 },

      // ------------------------------------------- run the tests, for real
      // Trust was granted at the startup modal, so the terminal is live.
      { act: "key", pane: 0, value: "Control+`" },
      { act: "sleep", pane: 0, ms: 4000 },
      { cap: "Now run the tests. Not a picture of tests. The tests.", hold: 70 },
      // serve-web keeps terminal PROCESSES alive server-side across clients, so
      // the restored buffer carries every previous session's commands. Wipe it
      // first or the video opens on someone else's history.
      { act: "type", pane: 0, sel: ".xterm-helper-textarea",
        value: "clear", delay: 30, commit: "Enter" },
      { act: "sleep", pane: 0, ms: 900 },
      { act: "type", pane: 0, sel: ".xterm-helper-textarea",
        value: "uv run --no-sync pytest -q tests/test_peer_sponsors.py", delay: 34, commit: "Enter" },
      // No waitText gate here, deliberately: terminal text lives in a canvas,
      // not the DOM, so a waitText on pytest output can only match something
      // ELSE on the page -- which is a check that passes for the wrong reason,
      // the exact thing this repo's review process exists to catch. The gate is
      // the burst duration (pytest measured 2.88s + uv startup, well inside
      // 16s) plus a human check of the captured still.
      { cap: "Watch it work.", burst: { ms: 16000, every: 420 }, hold: 70 },
      { act: "sleep", pane: 0, ms: 2000 },
      { cap: "Green. The two hop question, checked end to end, just now.", hold: 84 },

      // ------------------------------------------- the list of wrong beliefs
      // Explorer click, not Ctrl+P: with the terminal focused, quick-open
      // accepted the typed filename and then never switched the editor -- the
      // capture completed green while every following still showed executor.py.
      // Clicking the file in the tree is what a person does anyway, and it
      // cannot half-work.
      //
      // But fold `app` back up first. The explorer list is VIRTUALIZED: with the
      // folder expanded, MEASUREMENTS.md sits below the viewport and its row
      // does not exist in the DOM at all, so the click has nothing to find.
      // A person tidies the tree before reaching for the next file anyway.
      { act: "click", pane: 0, sel: ".monaco-list-row[aria-label='app']" },
      { act: "sleep", pane: 0, ms: 1200 },
      // ...and scroll the explorer back to the top. Opening four files walks the
      // tree's own scroll position down, so even after collapsing the folder the
      // root files can sit outside the rendered window — the same virtualization
      // trap, arrived at a different way.
      { act: "wheel", pane: 0, x: 200, y: 500, dy: -600, steps: 5, gap: 90 },
      { act: "sleep", pane: 0, ms: 800 },
      { act: "click", pane: 0, sel: ".monaco-list-row[aria-label='MEASUREMENTS.md']" },
      { act: "sleep", pane: 0, ms: 2600 },
      { cap: "And this is the best file in the repo.", hold: 76 },
      { act: "wheel", pane: 0, x: 950, y: 520, dy: 300, steps: 6, gap: 140 },
      { cap: "Every thing I believed here that turned out to be wrong.", hold: 84 },
      { act: "wheel", pane: 0, x: 950, y: 520, dy: 300, steps: 6, gap: 140 },
      { cap: "With the test that proved it wrong, and what I changed.", hold: 86 },
      { cap: "That list is how you read this repo.", hold: 92 },
    ],
  },
];
