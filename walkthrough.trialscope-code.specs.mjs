// TrialScope — the CODEBASE walkthrough, not the product demo.
//
// WHY A SECOND VIDEO EXISTS AT ALL.
//
// An agent produces more work per hour than its author can absorb, and the gap
// compounds: by the time a repo is shippable, the person whose name is on it has
// often not held the whole shape of it in their head at once. The product demo
// does not close that gap -- it shows that the thing works, which is the question
// nobody asks in a technical interview.
//
// This cut answers the question that IS asked: why is it built this way, what
// else was on the table, what did the choice cost, and what would prove it wrong.
// Its first audience is the author. Making it forces the recall, and a decision
// you cannot narrate in one plain sentence is one you have not finished making.
//
// EVERY SLIDE IS FOUR ZONES: chosen / rejected / cost / falsifier. The last one
// is what separates an engineering walkthrough from a tour. A "decision" with no
// statable falsifier is a preference nobody has examined yet, and an interviewer
// finds those in about ninety seconds.
//
// The content is deliberately the MEASUREMENTS, not the architecture: jitter
// failing to fix fairness, the buckets that sum correctly while overlapping, the
// module that was correct, tested, documented and never called. Those are the
// parts an author forgets first and an interviewer probes first.
//
// Judge it with the interview lens, not the lay one:
//   npm run judge -- out/trialscope-code.scored.mp4 --for "a senior engineer interviewing the author"
export const TRIALSCOPE_CODE_SPECS = [
  {
    id: "TScode",
    title: "TrialScope — decisions and tradeoffs",
    accent: "#2dd4bf",
    frame: false,
    vw: 1440,
    vh: 900,
    retries: 2,
    panes: [
      { label: "TrialScope — decisions",
        // A local file, so the capture never depends on a dev server being up.
        url: "file:///D:/VSCode%20Projects/feature-walkthrough-gif/decks/trialscope-design.html" },
    ],
    steps: [
      { act: "sleep", pane: 0, ms: 1200 },

      // Narration follows the 26Agent shape measured in REFERENCES-FORMAT.md:
      // name the failure, then the number that killed the belief. Never a
      // feature, never an adjective.
      { cap: "The demo worked. Then it met real use.", hold: 62 },
      { cap: "Six things I believed. Each one measured. Each one wrong.", hold: 74 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "One. A model that adds up is a model that makes things up.", hold: 78 },
      { cap: "So it never adds. It asks the site once per bar.", hold: 74 },
      { cap: "37 asks behind one graph. Each one you can send yourself.", hold: 80 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "Two. The totals matched, and the groups still overlapped.", hold: 80 },
      { cap: "Off by plus 290 one way. Off by minus 136 the other.", hold: 78 },
      { cap: "The two errors cancel out. A match is luck, not proof.", hold: 80 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "Three. Many users, one budget. Random waits felt right.", hold: 78 },
      { cap: "Fairness went from 0.14 to 0.15. That is nothing.", hold: 74 },
      { cap: "Taking turns in order took it to 0.99.", hold: 72 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "Four. A shared cache leaks who asked what.", hold: 72 },
      { cap: "A cached answer came back thirty thousand times faster.", hold: 78 },
      { cap: "That gap is a signal. So each user got their own cache.", hold: 78 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "Five. Eight of the same question should cost one answer.", hold: 78 },
      { cap: "And a fake test hides this. The calls merge on their own.", hold: 78 },
      { cap: "With the wrong key, the same cache gave two wild numbers.", hold: 78 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "Six, and the worst. The code was right and never ran.", hold: 78 },
      { cap: "Tests green. Written up. Nothing in the app called it.", hold: 76 },
      { cap: "Now the rule is simple. No picture of it, no proof of it.", hold: 78 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "So done here means numbers, not adjectives.", hold: 74 },
      { cap: "Ask any of it one thing. What would change your mind?", hold: 90 },
    ],

  },
];
