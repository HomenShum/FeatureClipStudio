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

      { cap: "This is the whole repo. Let us open it.", hold: 74 },

      // ---------------------------------------------------------- the tree
      { act: "click", pane: 0, sel: ".monaco-list-row[aria-label='app']" },
      { act: "sleep", pane: 0, ms: 1400 },
      { cap: "The app folder. Each file does one job.", hold: 76 },

      // -------------------------------------------------- the count client
      { act: "click", pane: 0, sel: ".monaco-list-row[aria-label='ctgov.py']" },
      { act: "sleep", pane: 0, ms: 2600 },
      { cap: "This file asks the registry for counts. Nothing else.", hold: 80 },
      { act: "wheel", pane: 0, x: 950, y: 520, dy: 320, steps: 6, gap: 130 },
      { cap: "Read down and you can see the cache, and the queue for one call at a time.", hold: 92 },
      { act: "wheel", pane: 0, x: 950, y: 520, dy: 320, steps: 6, gap: 130 },
      { cap: "All of that exists to pay for one rule. Ask, never guess.", hold: 84 },

      // ------------------------------------------------------ the planner
      { act: "click", pane: 0, sel: ".monaco-list-row[aria-label='executor.py']" },
      { act: "sleep", pane: 0, ms: 2400 },
      { cap: "This one turns a question into a list of asks.", hold: 78 },
      { act: "wheel", pane: 0, x: 950, y: 520, dy: 340, steps: 7, gap: 130 },
      { cap: "One ask per bar. Six bars is six trips to the site.", hold: 82 },

      // NOT SHOWN, AND WHY: running pytest live in the integrated terminal.
      //
      // VS Code opens an untrusted folder in Restricted Mode, which disables the
      // terminal. Three ways in were tried and all failed inside the capture:
      // a server-side settings.json (VS Code WEB keeps user settings in browser
      // storage, so it never applied), the banner's "Manage" link (present from
      // load, but not reliably clickable once an editor has focus), and the
      // command palette's Manage Workspace Trust (the resulting dialog's Trust
      // control does not expose a button role).
      //
      // So this cut shows the code and not the test run. That is a real gap --
      // "run things live" is one of the four things the long-form reference genre
      // does that a deck cannot -- and it is recorded here rather than papered
      // over with a screenshot of a passing test.

      // ------------------------------------------- the list of wrong beliefs
      { act: "key", pane: 0, value: "Control+p" },
      { act: "sleep", pane: 0, ms: 1200 },
      { act: "type", pane: 0, sel: ".quick-input-box input",
        value: "MEASUREMENTS.md", delay: 40, commit: "Enter" },
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
