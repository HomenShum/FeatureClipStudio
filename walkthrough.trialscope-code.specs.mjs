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
        url: "file:///D:/VSCode%20Projects/feature-walkthrough-gif/decks/trialscope-decisions.html" },
    ],
    steps: [
      { act: "sleep", pane: 0, ms: 1200 },

      { cap: "Every number in this app came from the registry. None were made up.", hold: 70 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "Rule one. The model picks which questions to ask. It never answers one.", hold: 80 },
      { cap: "A chart with six bars is six real questions, not one question and five sums.", hold: 80 },
      { cap: "The cost is real. Six requests where one would do.", hold: 70 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "There is no database. A copy of the registry is a promise to be wrong later.", hold: 84 },
      { cap: "That sets a hard limit. If the API cannot ask it, neither can we.", hold: 76 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "Neo4j fit the job on paper. It could not ship here.", hold: 74 },
      { cap: "Its wire protocol needs a raw port. This host only serves web traffic.", hold: 80 },
      { cap: "So both back ends run in the test, and the results are diffed.", hold: 76 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "One trial can sit in two groups. So the bars do not add up.", hold: 78 },
      { cap: "I believed a matching sum proved the groups were clean. It does not.", hold: 80 },
      { cap: "Overlap and blanks cancel out. The sum matches while the groups still overlap.", hold: 84 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "Many users share one budget. Random waits felt like the fix.", hold: 76 },
      { cap: "They did almost nothing. Fairness went from 0.14 to 0.15.", hold: 76 },
      { cap: "Taking turns in order did work. It went to 0.99.", hold: 74 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "The worst bug here passed every test it had.", hold: 72 },
      { cap: "The code was right, tested, and written up. Nothing ever called it.", hold: 80 },
      { cap: "So now: if there is no screenshot of it, it has not been checked.", hold: 78 },
      { act: "click", pane: 0, sel: "testid:deck-next" },
      { act: "sleep", pane: 0, ms: 500 },

      { cap: "Twenty seven things I believed here turned out to be wrong.", hold: 78 },
      { cap: "That list is the best way in. It shows which hunches do not hold up.", hold: 82 },
      { cap: "Ask any of it one question. Which measurement would change your mind?", hold: 92 },
    ],
  },
];
