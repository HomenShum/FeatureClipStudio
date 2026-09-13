// FOYER-V3 R1 walkthrough specs — Node Foyer's own three surfaces.
// Consumed by walkthrough.foyer.mjs. Each spec carries the seven STORYBOARD.md
// beats as ONE `storyboard` object (matches node-foyer's WalkthroughCapture.storyboard
// type exactly: premise, question, axis, conflict, evidence, verdict, exit) plus an
// ORDERED list of cap/act ops:
//
//   { cap, cursor?, click?, hold?, assert }  -> CAPTURE a clean frame. `assert` is
//        checked right before the screenshot and MUST hold (fail-closed: the run
//        aborts and keeps zz-fail.png — see walkthrough.foyer.mjs). Shape:
//        { sel, count? | focused? | visible?, attr?, equals?, matches? }
//          - count:   locator(sel).count() === count
//          - focused: locator(sel) === document.activeElement
//          - attr+equals/matches: that attribute's value
//          - no attr, equals/matches: the element's innerText
//          - otherwise: locator(sel).first() is visible
//   { act, sel?, url?, value?, ms? }         -> PERFORM an action (hover/click/goto/
//        key/sleep — see walkthrough.foyer.mjs's doAct).
//
// Selectors (page-scoped resolver, adapted from walkthrough.collab.mjs's `testid:`
// and walkthrough.visual.mjs's btn:/link:/aria:/placeholder:/text:/css:):
//   testid:<id>  btn:<name>  link:<name>  aria:<label>  placeholder:<text>
//   text:<text>  css:<selector>           (bare string is also treated as css)
//
// DOM facts below were read from the LIVE production wall (node-foyer src/ui/
// FoyerWall.tsx, ProductCard.tsx, ApparatusBody.tsx) on 2026-09-12, not invented:
// data-testid="foyer-wall"/"foyer-card-<repo>"/"foyer-apparatus-<repo>", pill
// data-state/data-foyer-source/data-foyer-fetched-at, card data-foyer-stable-sweeps,
// apparatus [data-probe-row], sheet role="dialog" with a Close button and a
// .foyer-sheet-backdrop, Open link labelled "Open <repo>".

export const FOYER_SPECS = [
  {
    id: "FYwall",
    title: "Node Foyer — the wall",
    accent: "#3f7a5c",
    repo: "node-foyer",
    url: "https://node-foyer.vercel.app/",
    captureKind: "production",
    vw: 1440,
    vh: 900,
    // Full-bleed product page: no crop margin to spare (see Walkthrough.jsx's
    // chromeless-by-default note), and every frame here is evidence a reviewer
    // must be able to read whole, not a demo beauty shot.
    scales: { action: 1.0, result: 1.0, open: 1.0 },
    storyboard: {
      premise: "Node Foyer claims to read every product's own public files, live, on every sweep, and never invent a state.",
      question: "Does the grid actually reflect what each product currently serves, and does the apparatus behind every colour hold a real probe?",
      axis: "verified (two layers agree) vs reachable-only (answered, nothing to compare) vs unknown (never answered)",
      conflict: "a fixture adapter (__fixture_dead) wired to a URL that always fails, run on every sweep so the honest-failure path is exercised, not assumed",
      evidence: "hover apparatus: probe URL, HTTP status, fetch time, remote Date header, sha256, the per-layer match line, and the stated reason",
      verdict: "22 cards, one honest state each; the Foyer's own card is verified on both its frontend and backend layers; the dead fixture stays UNKNOWN with its tried URL on screen",
      exit: "trust the pill colour because the apparatus behind it is inspectable on this same screen, not because the pill says so",
    },
    steps: [
      {
        // Round-12 cycle 2 (Judge comprehension "mom test": wouldMomUnderstand false, citing
        // "sweeps" among the unexplained terms). "sweep" was flavor text here, not load-bearing —
        // nothing downstream requires the word (the caption-count assert on beat 03 already says
        // "checks", which the seal's regex accepts on its own) — so it is dropped rather than
        // re-explained.
        // Round-12 cycle 3 (Judge P0: "no target persona is defined"): names who this board is
        // for, up front, before anything else.
        // Round-13 repair (Steward critical, round-12 review): "checks every product's own live
        // pages" was false of this frame — the header itself says "22 repos, 10 hosted", and only
        // the ten hosted rows are ever probed (the other twelve are registry-only, see beat 01).
        // Narrowed to "the ten hosted products", and the header's own last-sweep timestamp is
        // named explicitly so the claim is checkable against what beat 00's frame shows.
        cap: "For a release lead who has to trust a status board without reading anyone's source code: this board checks the ten hosted products' own live pages on a fixed schedule (the header names the last sweep) and shows exactly what came back. Nobody typed these results in by hand.",
        cursor: "css:.foyer-header__line",
        hold: 96,
        assert: { sel: "css:.foyer-header__line", visible: true },
      },
      // Round-10 minor: frames 00-03 used to be byte-identical (nothing on the page moved between
      // them). Centering a different card before each beat guarantees a different scroll offset —
      // see walkthrough.foyer.mjs's "center" act.
      { act: "center", sel: "testid:foyer-card-__fixture_dead" },
      {
        // Round-13 repair (Steward critical, round-12 review): "every single one gets checked
        // the exact same way" overclaimed — 12 of these 22 cards are registry-only (never
        // probed; products.json: hosted=false). Narrowed to name the ten that ARE hosted, and
        // the assert now also proves a registry-only chip is really on this frame (not just
        // that the count is 22), so the claim about "the rest" is checkable too.
        cap: "Twenty-two products are tracked here, each with its own honest badge. The ten that are hosted get checked the exact same way; the rest are simply listed, never checked, and say so with a registry-only badge.",
        hold: 90,
        assert: [
          { sel: 'css:[data-testid^="foyer-card-"]', count: 22 },
          { sel: 'css:.foyer-pill[data-state="registry-only"]', visible: true },
        ],
      },
      // Round-12 repair (Steward critical, round-11 review): the old beat pointed this claim at
      // NodeVoice, whose own pill reads "1 layer" on the same frame — a caption saying both a
      // front door and a back door were checked, shown over a card admitting it only has one, is
      // false of its own frame. NodeSlide is verified on BOTH layers on production (ec2a44e), and
      // hovering its card reveals the apparatus line "frontend <sha> matches backend <sha>" — the
      // exact two-layer evidence the caption below claims, so the assert below checks that string
      // is really on screen (e2e/rules.ts's two-layer caption rule requires it). Caption reworded
      // in plain words too: round-11's judge failed the "mom test" on the jargon "front door and
      // back door" — this rewrite says what got checked instead of naming it with a metaphor.
      { act: "center", sel: 'css:[data-testid="foyer-card-NodeSlide"]' },
      { act: "hover", sel: "testid:foyer-card-NodeSlide" },
      {
        // Round-13 minor (round-12 review): the probe that decided this state ran on the last
        // half-hour sweep, not "a moment ago" — the apparatus's own fetched-at timestamp can be
        // minutes old by the time this frame is captured.
        cap: "Green means verified. For this product both the website people see and the service behind it were checked on the last sweep, and both reported the same version. An amber Reachable badge means it answered, but there was nothing to compare against; an amber Unknown badge means it never answered.",
        cursor: 'css:[data-testid="foyer-card-NodeSlide"] .foyer-pill',
        hold: 120,
        assert: { sel: "testid:foyer-apparatus-NodeSlide", matches: "matches backend" },
      },
      // NodeRoom sits close enough to the top of the page that centering it would need a
      // NEGATIVE scroll, which clamps to 0 — the same position frame 00 already used. An
      // explicit small absolute offset keeps the card fully visible while staying distinct.
      { act: "scrollAbs", y: 60 },
      {
        // Round-13 repair (round-12 review): the review offered two fixes for this beat's
        // mismatch ("hover NodeRoom before the shot, OR assert on NodeSlide"). Hovering NodeRoom
        // was tried first, but node-foyer's own CSS reveals the FULL apparatus on any card hover
        // (`.foyer-card:hover .foyer-apparatus`), not just the stable badge — so that fix made
        // this frame leak NodeRoom's raw sha256/HTTP-status receipt a beat early, with no caption
        // explaining it yet, and the comprehension judge failed the video on exactly that ("mom
        // loses them" at this timestamp, citing unexplained sha256/HTTP jargon). Taking the
        // review's OTHER offered fix instead: this beat now reads NodeSlide's own stable badge
        // (still hovered from the beat above, same value — every non-flapping hosted card shows
        // "same state for 21 sweeps"), so the highlighted card matches the caption/assert again
        // with no new hover and no early apparatus reveal. NodeRoom's own apparatus is still
        // introduced next beat, paired with the caption that explains it.
        // {n} is filled in at capture time from the LIVE attribute value (round-10 minor: this
        // caption once said "11" while the real count was 12) — see walkthrough.foyer.mjs.
        cap: "This green badge has held steady for {n} checks in a row, back to back — not just one lucky moment.",
        cursor: 'css:[data-testid="foyer-card-NodeSlide"] .foyer-card__stable',
        hold: 100,
        assert: { sel: "testid:foyer-card-NodeSlide", attr: "data-foyer-stable-sweeps", matches: "^\\d+$" },
      },
      { act: "hover", sel: "testid:foyer-card-NodeRoom" },
      {
        cap: "Hovering shows the receipt behind the badge: the exact address it checked, when it checked, whether it answered successfully, and a short fingerprint of what came back. Nobody needs to understand that fingerprint themselves — it just lets anyone compare notes later and catch a fake.",
        hold: 118,
        assert: { sel: "testid:foyer-apparatus-NodeRoom", visible: true },
      },
      { act: "hover", sel: "testid:foyer-card-__fixture_dead" },
      {
        cap: "One product here is deliberately broken on purpose, to prove the checker doesn't fake results: it always shows unknown, and shows the exact address it tried and failed to reach.",
        hold: 112,
        assert: { sel: "testid:foyer-apparatus-__fixture_dead", matches: "foyer-fixture\\.invalid" },
      },
      // Round-13 minor (round-12 review): centering the CARD first still let the apparatus
      // panel's last line ("Layers: frontend <sha> matches backend <sha>") land below the fold
      // — the panel is taller than the headroom a centered card leaves below it (confirmed by
      // reading the captured frame). Hovering first (so the apparatus is expanded and has a
      // real height), then centering the APPARATUS element itself, keeps its own last line
      // inside the viewport regardless of how tall the panel is.
      { act: "hover", sel: "testid:foyer-card-node-foyer" },
      { act: "center", sel: "testid:foyer-apparatus-node-foyer" },
      {
        // Round-12 cycle 2: "deploy workflow" was the other jargon the comprehension judge cited.
        cap: "This board even checks itself — the highlighted card is this board's own card (node-foyer). Verified means that after a new version of this board goes live, it reads its own page back and confirms the version numbers match — that is what makes it verified.",
        hold: 118,
        assert: { sel: "testid:foyer-apparatus-node-foyer", matches: "matches backend" },
      },
    ],
  },
  {
    id: "FYphone",
    title: "Node Foyer — the phone sheet",
    accent: "#3f7a5c",
    repo: "node-foyer",
    url: "https://node-foyer.vercel.app/",
    captureKind: "production",
    vw: 390,
    vh: 844,
    scales: { action: 1.0, result: 1.0, open: 1.0 },
    storyboard: {
      premise: "At phone width there is no hover, so the same apparatus a desktop reviewer sees on mouseover has to become a real, tappable dialog.",
      question: "Is the bottom sheet an actual modal — focus trapped, background inert, closes cleanly — or a menu that only looks like one?",
      axis: "desktop hover apparatus vs mobile tap-opened sheet: same ApparatusBody, two entry points",
      conflict: "a long product name (NodeBenchBoilerplate) has to wrap without breaking mid-word inside a 390px card",
      evidence: "the sheet's role=\"dialog\", its backdrop over the now-inert wall, the same [data-probe-row] apparatus, and a 44px Open target",
      verdict: "the name soft-hyphenates cleanly, Details opens a real dialog with the wall inert behind it, Open stays a full 44px target, and Close returns focus to Details",
      exit: "the mobile sheet is not a stripped-down view — it is the same evidence, reachable by tap instead of hover",
    },
    steps: [
      {
        // Round-10 P0 (judge): captions relied on frontend jargon ("soft-hyphenated", "inert
        // backdrop", "stranded on body") a non-developer can't parse. Rewritten in plain words
        // throughout this spec — say what the visitor sees and why it matters, no jargon.
        cap: "A visitor checking this board from their phone gets the same trustworthy detail a desktop visitor gets — starting with something small: even a long product name breaks cleanly onto the next line, never chopped mid-word, even on a screen this narrow.",
        cursor: 'css:[data-testid="foyer-card-NodeBenchBoilerplate"] .foyer-card__name',
        hold: 100,
        assert: { sel: 'css:[data-testid="foyer-card-NodeBenchBoilerplate"] .foyer-card__name', attr: "aria-label", equals: "NodeBenchBoilerplate" },
      },
      {
        cap: "There's no mouse to hover with on a phone, so tapping \"Details\" opens the same information a desktop visitor gets just by hovering.",
        cursor: 'css:[data-testid="foyer-card-NodeRoom"] button.foyer-details-btn',
        hold: 96,
        assert: { sel: 'css:[data-testid="foyer-card-NodeRoom"] button.foyer-details-btn', visible: true },
      },
      { act: "click", sel: 'css:[data-testid="foyer-card-NodeRoom"] button.foyer-details-btn' },
      {
        cap: "The details panel slides up, and everything behind it stops responding to taps while it's open — it's dimmed on purpose, not just for looks.",
        hold: 110,
        assert: { sel: "css:.foyer-sheet-backdrop", visible: true },
      },
      { act: "click", sel: 'css:[role="dialog"] button', settle: 400 },
      {
        cap: "The Open button stays big enough to tap accurately with a thumb — it never shrinks down to a sliver of text.",
        cursor: 'css:[data-testid="foyer-card-NodeRoom"] a[href]',
        hold: 96,
        assert: { sel: 'css:[data-testid="foyer-card-NodeRoom"] a[href]', visible: true },
      },
      // These last two beats describe the same still moment from two angles (the button, then
      // where focus landed) — round-10 minor: without a real change between them, the frames
      // were byte-identical. A small scroll keeps both facts true while giving each its own frame.
      { act: "scrollAbs", y: 14 },
      {
        cap: "After closing the panel, the keyboard cursor lands right back on the Details button — nothing gets lost when you close it.",
        cursor: 'css:[data-testid="foyer-card-NodeRoom"] button.foyer-details-btn',
        hold: 96,
        assert: { sel: 'css:[data-testid="foyer-card-NodeRoom"] button.foyer-details-btn', focused: true },
      },
    ],
  },
  {
    id: "FYagent",
    title: "Node Foyer — the honest fallback",
    accent: "#3f7a5c",
    repo: "node-foyer",
    // Built preview, HEAD, VITE_CONVEX_URL unset — see the R1 build instructions in
    // docs/campaign/MANIFEST.md's FOYER-V3 section. Not production; every caption says so.
    url: "http://127.0.0.1:5270/",
    captureKind: "preview",
    vw: 1440,
    vh: 900,
    retries: 1,
    scales: { action: 1.0, result: 1.0, open: 1.0 },
    // Round-10 verdict: REWORK — "no persona, no cursor interaction". Rewritten around an
    // explicit persona (an integrator wiring their own agent to this board) with a full loop:
    // wall (file-labelled) -> the two machine-readable files that agent would fetch -> back to
    // the wall, same honest label. Every beat's cursor lands on something real that beat's
    // frame actually shows (the wall root, then the JSON body itself) — never a fabricated
    // click on a link that doesn't exist (STORYBOARD.md's rule the round-10 commit already
    // named and left unresolved).
    storyboard: {
      premise: "An engineer wiring their own AI agent to this board needs to know, before connecting anything real: does it still work with no live database configured, and does it tell the truth about where its data came from?",
      question: "With no live data feed set up at all, does the board quietly break, silently make something up, or say plainly where its numbers are coming from?",
      axis: "a live database feed (what production normally uses) vs a saved file baked into this exact build (what happens with nothing configured yet)",
      conflict: "no live database address is set for this build — the exact situation an integrator hits on day one, before wiring anything up",
      evidence: "the page's own on-screen label naming its data source, plus the two machine-readable summary files a real agent would fetch directly",
      verdict: "the board keeps working, honestly labels its data as coming from a saved file, both machine-readable files answer correctly from this same build, and the label is still honest after a full round trip back to the board",
      exit: "an integrator with nothing wired up yet still gets a working page and an honest label — never a blank screen, never a silent guess",
    },
    steps: [
      {
        cap: "Picture an engineer wiring their own AI agent to this board. The point: even with nothing live wired up yet, the page still works and never lies about where its data comes from — right now it plainly labels itself as a saved file, not a live feed.",
        cursor: "testid:foyer-wall",
        hold: 140,
        assert: { sel: "testid:foyer-wall", attr: "data-foyer-snapshot-source", equals: "file" },
      },
      // `settle: 700` (on top of doAct's own default sleep) — a longer dwell after each
      // direct-URL fetch, since this beat's "interaction" is typing a fixed address rather than
      // clicking inside the wall's UI. The cursor still lands on something real (the loaded JSON
      // body), never a fabricated click on a link that isn't there (STORYBOARD.md's rule).
      { act: "goto", url: "/.well-known/agent-ui.json", settle: 700 },
      {
        // Round-12 repair (Judge P0: non_expert_sense scored 0, "unexplained developer jargon";
        // momLosesThemAt this exact beat). The old caption named the technical address BEFORE
        // saying what it is for; a non-expert loses the thread at the first unexplained term. This
        // rewrite states the everyday purpose first — an AI agent needs its own copy of the same
        // information, written for a program instead of a person — and only THEN names the address.
        cap: "An AI agent can't read this page the way a person does, so it needs its own copy of the same honest information, written for a program instead of a person to read. That copy lives at a fixed address, /.well-known/agent-ui.json, and what's on screen now comes from that very same build.",
        cursor: "css:pre",
        hold: 140,
        assert: { sel: "css:pre", matches: '"schema"' },
      },
      { act: "goto", url: "/api/apps.json", settle: 700 },
      {
        cap: "Some other agent tools expect that same list laid out a little differently, so there's a second copy just for them — still the same build, still the same honest data, just organized the way that kind of tool reads it. Its address is /api/apps.json.",
        cursor: "css:pre",
        hold: 140,
        assert: { sel: "css:pre", matches: '"apps"' },
      },
      { act: "goto", url: "/", settle: 1200 },
      // Otherwise byte-identical to frame 00 — same page, same scroll position, same state.
      { act: "scrollAbs", y: 40 },
      {
        cap: "Back on the board after that round trip, the label still honestly says this data came from a saved file, not a live database — the same plain label that engineer's agent can rely on either way.",
        cursor: "testid:foyer-wall",
        hold: 140,
        assert: { sel: "testid:foyer-wall", attr: "data-foyer-snapshot-source", equals: "file" },
      },
    ],
  },
];
