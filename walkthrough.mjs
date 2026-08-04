// Workflow-walkthrough capturer (reusable). Drives the no-auth Streamlit harness
// (dev_preview_tabs.py, DEMO_CLEAN=1) through each feature spec, capturing a CLEAN
// frame at every UI state plus the pointer target for each step. Emits:
//   demo/public/wt/<id>/NN.png        (one frame per `cap` op)
//   demo/src/walkthrough.data.js      (per-feature steps -> consumed by Walkthrough.jsx)
// Remotion then overlays an animated cursor + click ripple + step caption so the
// rendered GIF shows exactly where the user clicked and what happened next.
//
//   DEMO_CLEAN=1 streamlit run dev_preview_tabs.py --server.port 8502
//   node demo/walkthrough.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SPECS } from "./walkthrough.specs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "public", "wt");
const BASE = process.env.DEMO_URL || "http://127.0.0.1:8502";
const VW = 1280, VH = 800, DEFAULT_HOLD = 60;

const sleep = (p, ms) => p.waitForTimeout(ms);
// Streamlit scopes everything to a tab panel. A plain React/Vite app has none,
// and scoping to a selector that does not exist makes every step fail while the
// run still "completes" — a walkthrough that captures nothing looks the same as
// one that captured a blank app. So: use the panel when present, else the page.
const panel = (p) => p.locator('[data-baseweb="tab-panel"]:visible, body').first();
// PRESENCE BEFORE NEGATIVE ASSERTION: "the status widget is gone" passes vacuously on a page
// that never rendered at all (blank tab, crashed app) — so first require the active panel to
// exist, THEN wait for the spinner's absence. A negative wait without a presence guard is the
// most common source of walkthroughs that "pass" while capturing an empty screen.
const notRunning = async (p, t = 220000) => {
  await panel(p).waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
  await p.waitForFunction(() => !document.querySelector('[data-testid="stStatusWidget"]'), { timeout: t, polling: 1000 }).catch(() => {});
};
const waitText = (p, s, t = 220000) => p.waitForFunction((x) => new RegExp(x).test(document.body.innerText), s, { timeout: t, polling: 1500 }).catch(() => {});

// Resolve a spec selector to a Playwright Locator scoped to the ACTIVE tab panel.
const loc = (p, sel) => {
  const P = panel(p);
  if (sel === "textarea") return P.locator('[data-testid="stTextArea"] textarea, textarea, [contenteditable="true"]').first();
  if (sel === "input") return P.locator('[data-testid="stTextInput"] input, input[type="text"], input:not([type])').first();
  if (sel === "file") return P.locator('input[type="file"]').first();
  if (sel === "drop") return P.locator('[data-testid="stFileUploaderDropzone"]').first();
  if (sel === "chat") return P.locator('[data-testid="stChatInput"] textarea').first();
  if (sel.startsWith("btn:")) return P.getByRole("button", { name: new RegExp(sel.slice(4), "i") }).first();
  // Landing CTAs are anchors, not buttons — a btn: selector for "Create a room"
  // times out against the hydrated NodeRoom landing. Roles are facts, not vibes.
  if (sel.startsWith("link:")) return P.getByRole("link", { name: new RegExp(sel.slice(5), "i") }).first();
  if (sel.startsWith("aria^:")) return P.locator(`input[aria-label^="${sel.slice(6)}"]`).first();
  if (sel.startsWith("aria:")) return P.locator(`input[aria-label="${sel.slice(5)}"]`).first();
  return P.locator(sel).first();
};

// Viewport-relative center of an element (CSS px, clamped) — where the cursor points.
const cursorOf = async (p, sel) => {
  if (!sel) return null;
  try {
    const el = loc(p, sel);
    await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
    const box = await el.evaluate((n) => {
      const r = n.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 22) };
    });
    return { x: Math.max(8, Math.min(VW - 8, Math.round(box.x))), y: Math.max(8, Math.min(VH - 8, Math.round(box.y))) };
  } catch { return null; }
};

const clickTab = async (p, text) => { await p.locator('[data-baseweb="tab"]', { hasText: text }).first().click(); await sleep(p, 1200); };

const doAct = async (p, a) => {
  if (a.act === "fill") { const el = loc(p, a.sel); await el.click(); await el.fill(String(a.value)); if (a.commit) await el.press(a.commit); await sleep(p, 600); }
  else if (a.act === "click") { await loc(p, a.sel).click(); await sleep(p, 300); }
  else if (a.act === "upload") { await loc(p, a.sel).setInputFiles(join(__dirname, "fixtures", a.file)); }
  else if (a.act === "press") { await p.keyboard.press(a.key); await sleep(p, 500); }
  else if (a.act === "sleep") { await sleep(p, a.ms); }
  else if (a.act === "waitText") { await waitText(p, a.value); }
  else if (a.act === "notRunning") { await notRunning(p); }
  else if (a.act === "scrollTop") { await p.evaluate(() => window.scrollTo(0, 0)); await sleep(p, 300); }
  else if (a.act === "scrollY") { await p.evaluate((y) => window.scrollTo(0, y), a.y); await sleep(p, 300); }
  else if (a.act === "scrollText") { await p.evaluate((s) => { const rx = new RegExp(s); const el = [...document.querySelectorAll("*")].find((n) => rx.test(n.textContent || "") && n.children.length < 6); if (el) el.scrollIntoView({ block: "center" }); }, a.value); await sleep(p, 400); }
  else if (a.act === "scrollLastChat") { await p.evaluate(() => { const m = document.querySelectorAll('[data-testid="stChatMessage"]'); if (m.length) m[m.length - 1].scrollIntoView({ block: "center" }); }); await sleep(p, 500); }
  else if (a.act === "scrollEl") {
    // Center the RESULT WIDGET in the viewport (window.scrollTo doesn't move
    // Streamlit's inner scroll container — scrollIntoView on the element does).
    const map = { df: '[data-testid="stDataFrame"]', iframe: "iframe", metric: '[data-testid="stMetric"]' };
    const css = map[a.sel] || a.sel;
    const L = panel(p).locator(css);
    // A scroll to a target that does not exist used to be swallowed by
    // .catch(() => {}), so a mistyped selector produced a step that captured the
    // PREVIOUS position under a new caption — indistinguishable from a scroll
    // that worked. Same shape as the unknown-act no-op below: an instrument
    // reporting success about something it never touched.
    const n = await L.count();
    if (n === 0) throw new Error(`scrollEl: no element matches ${JSON.stringify(css)} — nothing was scrolled to`);
    const el = a.last ? L.last() : L.first();
    await el.evaluate((node) => node.scrollIntoView({ block: "center", inline: "nearest" }));
    await sleep(p, 600);
  }
  else {
    // An unrecognised act used to fall out of this chain doing NOTHING, with no
    // error. A spec written with `scroll` instead of `scrollY` therefore produced
    // a clip where the page never moved — four captioned steps over one frozen
    // viewport, which looks exactly like a walkthrough that worked.
    //
    // A capture tool that silently does nothing is worse than one that crashes:
    // it emits something that passes for evidence.
    throw new Error(
      `unknown act "${a.act}" — valid: fill, click, upload, sleep, waitText, notRunning, ` +
      `scrollTop, scrollY, scrollText, scrollLastChat, scrollEl`,
    );
  }
};

// Fresh harness page — used at start AND for per-spec retries. A retried spec must run in a
// brand-new page (LLM-backed steps flake ~50% in our experience, and a half-driven UI poisons
// every frame after the failure; reusing the page just re-captures the poisoned state).
const openHarness = async (browser, spec) => {
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2 });
  page.setDefaultTimeout(60000);
  // A spec may carry its own url, so one run can walk through several apps on
  // different dev servers instead of assuming a single DEMO_URL.
  await page.goto(spec?.url || BASE, { waitUntil: "networkidle" });
  if (spec?.ready) {
    // PRESENCE BEFORE CAPTURE. A proof selector, not a sleep: if the app never
    // renders, fail here rather than emit frames of a blank page.
    await page.getByText(new RegExp(spec.ready, "i")).first()
      .waitFor({ state: "visible", timeout: 30000 });
  } else if (!spec?.url) {
    await page.waitForFunction(() => [...document.querySelectorAll('[data-baseweb="tab"]')].some((t) => /List Intelligence/.test(t.innerText)), { timeout: 60000 });
  }
  await sleep(page, 1500);
  return page;
};

const run = async () => {
  // WT_ONLY=<id> captures one walkthrough against its own dev server without destroying the
  // others' frames. The global wipe only runs on a full capture — each spec already wipes its own
  // dir, so a scoped run loses nothing it did not remake.
  const ONLY = process.env.WT_ONLY;
  if (!ONLY) rmSync(PUB, { recursive: true, force: true });
  const browser = await chromium.launch({ headless: true });
  let page = null;

  const out = [];
  for (const spec of SPECS.filter((s) => !ONLY || s.id === ONLY)) {
    const dir = join(PUB, spec.id);
    // Per-spec retries (opt-in via `retries: N` on the spec — give it to any spec whose steps
    // call an LLM or other nondeterministic backend). Each attempt wipes the frame dir and runs
    // in a FRESH page so retried captures never inherit poisoned UI state.
    const maxAttempts = 1 + (spec.retries || 0);
    let steps = [];
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (page) await page.close().catch(() => {});
    page = await openHarness(browser, spec);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    steps = [];
    try {
      if (spec.tab) await clickTab(page, spec.tab);
      let n = 0;
      for (const op of spec.steps) {
        if (op.cap && op.burst) {
          // BURST: rapidly capture a SEQUENCE of the loading/streaming state so the
          // rendered clip shows real motion — the spinner spinning, the status text
          // updating, results streaming in — instead of a frozen snapshot.
          const every = op.burst.every || 320;
          const count = Math.max(2, Math.round((op.burst.ms || 2800) / every));
          const imgs = [];
          for (let b = 0; b < count; b++) {
            const fn = `${String(n).padStart(2, "0")}_${String(b).padStart(2, "0")}.png`;
            await page.screenshot({ path: join(dir, fn) });
            imgs.push(`wt/${spec.id}/${fn}`);
            if (b < count - 1) await sleep(page, every);
          }
          steps.push({ imgs, caption: op.cap, cursor: null, click: false, hold: op.hold || 72, burst: true });
          console.log(`  ${spec.id} burst ${n}: ${imgs.length} frames — ${op.cap}`);
          n++;
        } else if (op.cap) {
          const cur = await cursorOf(page, op.cursor);
          const name = String(n).padStart(2, "0") + ".png";
          await sleep(page, 350);
          await page.screenshot({ path: join(dir, name) });
          steps.push({ img: `wt/${spec.id}/${name}`, caption: op.cap, cursor: cur, click: !!op.click, hold: op.hold || DEFAULT_HOLD });
          console.log(`  ${spec.id} cap ${n}: ${op.cap}`);
          n++;
        } else {
          await doAct(page, op);
        }
      }
      break; // attempt succeeded
    } catch (e) {
      // FAILURE FORENSICS: freeze the exact UI state + a body-text snippet before retrying or
      // shipping a partial — "which state was the page actually in" ends debugging guesswork.
      // zz-fail.png sorts last in the frame dir and is never referenced by walkthrough.data.js.
      await page.screenshot({ path: join(dir, "zz-fail.png") }).catch(() => {});
      const bodyText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 200)).catch(() => "(unreadable)");
      console.log(`${spec.id} attempt ${attempt}/${maxAttempts} err: ${e.message.split("\n")[0]}`);
      console.log(`  fail-state: ${bodyText}`);
      if (attempt < maxAttempts) {
        await page.close().catch(() => {});
        page = await openHarness(browser);
        console.log(`  retrying ${spec.id} in a fresh page`);
      }
    }
    }
    // chromeUrl must be carried through: the renderer falls back to a generic
    // "localhost" when it is missing, which silently discards the spec's value.
    out.push({ id: spec.id, title: spec.title, accent: spec.accent, chromeUrl: spec.chromeUrl, scales: spec.scales, steps });
  }
  await browser.close();

  const data = "// AUTO-GENERATED by demo/walkthrough.mjs — do not edit by hand.\n" +
    "export const WALKTHROUGHS = " + JSON.stringify(out, null, 2) + ";\n";
  writeFileSync(join(__dirname, "src", "walkthrough.data.js"), data);
  console.log("WALKTHROUGH_CAPTURE_DONE — wrote src/walkthrough.data.js");
};
run().catch((e) => { console.error(e); process.exit(1); });
