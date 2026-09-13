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
        cap: "Every push to main deploys both layers; this wall reads back what each product actually serves, right now.",
        cursor: "css:.foyer-header__line",
        hold: 84,
        assert: { sel: "css:.foyer-header__line", visible: true },
      },
      {
        cap: "22 repos, one honest card each — hosted products probed live, everything else marked registry-only.",
        hold: 72,
        assert: { sel: 'css:[data-testid^="foyer-card-"]', count: 22 },
      },
      {
        cap: "Same colour rule for both: NodeProof only answered (amber, reachable) — NodeVoice's two layers agreed (green, verified).",
        cursor: 'css:[data-testid="foyer-card-NodeVoice"] .foyer-pill',
        hold: 84,
        assert: { sel: 'css:[data-testid="foyer-card-NodeVoice"] .foyer-pill', attr: "data-state", equals: "verified" },
      },
      {
        cap: "\"same state for 11 sweeps\" — the ledger's own stability count, not a claim about one lucky probe.",
        cursor: 'css:[data-testid="foyer-card-NodeRoom"] .foyer-card__stable',
        hold: 72,
        assert: { sel: "testid:foyer-card-NodeRoom", attr: "data-foyer-stable-sweeps", matches: "^\\d+$" },
      },
      { act: "hover", sel: "testid:foyer-card-NodeRoom" },
      {
        cap: "Hover reveals the apparatus: the exact URL probed, its HTTP status, when it answered, and the sha256 of what it returned.",
        hold: 96,
        assert: { sel: "testid:foyer-apparatus-NodeRoom", visible: true },
      },
      { act: "hover", sel: "testid:foyer-card-__fixture_dead" },
      {
        cap: "The dead fixture stays UNKNOWN, forever — its apparatus shows the exact URL it tried and failed, never a guess.",
        hold: 90,
        assert: { sel: "testid:foyer-apparatus-__fixture_dead", matches: "foyer-fixture\\.invalid" },
      },
      { act: "hover", sel: "testid:foyer-card-node-foyer" },
      {
        cap: "The Foyer probes itself, too: frontend and backend agree on the same build sha, so its own card is verified on both layers.",
        hold: 96,
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
        cap: "Long product names soft-hyphenate instead of breaking mid-word, even in a 390px card.",
        cursor: 'css:[data-testid="foyer-card-NodeBenchBoilerplate"] .foyer-card__name',
        hold: 84,
        assert: { sel: 'css:[data-testid="foyer-card-NodeBenchBoilerplate"] .foyer-card__name', attr: "aria-label", equals: "NodeBenchBoilerplate" },
      },
      {
        cap: "No hover on a phone — Details is the real, tappable path to the same apparatus.",
        cursor: 'css:[data-testid="foyer-card-NodeRoom"] button.foyer-details-btn',
        hold: 72,
        assert: { sel: 'css:[data-testid="foyer-card-NodeRoom"] button.foyer-details-btn', visible: true },
      },
      { act: "click", sel: 'css:[data-testid="foyer-card-NodeRoom"] button.foyer-details-btn' },
      {
        cap: "The sheet opens as a real dialog over a backdrop — the wall behind it is now inert, not just visually dimmed.",
        hold: 96,
        assert: { sel: "css:.foyer-sheet-backdrop", visible: true },
      },
      { act: "click", sel: 'css:[role="dialog"] button', settle: 400 },
      {
        cap: "Open stays a full 44px target on the card face, never a text sliver.",
        cursor: 'css:[data-testid="foyer-card-NodeRoom"] a[href]',
        hold: 78,
        assert: { sel: 'css:[data-testid="foyer-card-NodeRoom"] a[href]', visible: true },
      },
      {
        cap: "Close returned focus to Details — nothing is left stranded on body.",
        cursor: 'css:[data-testid="foyer-card-NodeRoom"] button.foyer-details-btn',
        hold: 78,
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
    scales: { action: 1.0, result: 1.0, open: 1.0 },
    storyboard: {
      premise: "The ledger URL an agent would read the wall from is unset in this build — no dev, no prod Convex.",
      question: "Does the wall degrade to the committed snapshot file honestly, or does it hang, blank, or lie about where its data came from?",
      axis: "ledger-backed snapshot (production) vs file-fallback snapshot (this preview, no ledger URL at all)",
      conflict: "no VITE_CONVEX_URL — the exact condition an agent hits before any ledger is configured",
      evidence: "the wall root's own data-foyer-snapshot-source=\"file\" attribute, and the same two machine-readable contract files production serves",
      verdict: "the wall renders the committed snapshot and says so on its own root node; /.well-known/agent-ui.json and /api/apps.json are still served from this build, unchanged",
      exit: "an agent with no ledger configured gets a working wall and an honest source attribute — never a blank screen or a silent lie",
    },
    steps: [
      {
        cap: "Picture an agent-workspace harness opening this build with no ledger URL configured: the wall falls back to the committed snapshot file, and says so on its own root node — not a blank screen, not a silent lie.",
        cursor: "testid:foyer-wall",
        hold: 130,
        assert: { sel: "testid:foyer-wall", attr: "data-foyer-snapshot-source", equals: "file" },
      },
      // `settle: 700` (on top of doAct's own default sleep) — a longer dwell after each
      // direct-URL fetch, since this beat's "interaction" is a machine fetching a fixed URL, not
      // a click inside the wall's UI: an honest cursor animation is not available here (there is
      // no in-app link to it), so the fix for cursor_truth/state_coverage findings is pacing and
      // captioned context, not a fabricated click (STORYBOARD.md: never claim an interaction the
      // frame does not show).
      { act: "goto", url: "/.well-known/agent-ui.json", settle: 700 },
      {
        cap: "That agent fetches this fixed URL directly — no browser click, no ledger: the same build still serves its machine-readable contract file.",
        hold: 120,
        assert: { sel: "css:pre", matches: '"schema"' },
      },
      { act: "goto", url: "/api/apps.json", settle: 700 },
      {
        cap: "And the plain apps.json an agent-workspace harness already knows how to read, from the exact same build.",
        hold: 120,
        assert: { sel: "css:pre", matches: '"apps"' },
      },
    ],
  },
];
