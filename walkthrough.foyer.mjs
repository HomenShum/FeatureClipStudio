// FOYER-V3 R1 capturer — Node Foyer's own three walkthroughs (FYwall, FYphone, FYagent).
// Single-pane, adapted from walkthrough.mjs (single-pane capture loop, per-spec retries,
// fail-closed forensics) with the selector resolver widened to walkthrough.visual.mjs's
// btn:/link:/aria:/placeholder:/text:/css: plus walkthrough.collab.mjs's testid: prefix.
//
// NEW here (not in any existing capturer): every `cap` op MUST carry an `assert` that is
// checked immediately BEFORE the screenshot and must hold, or the run aborts (fail-closed,
// same zz-fail.png contract as walkthrough.mjs) — see walkthrough.foyer.specs.mjs for the
// assert shape. This capturer also reads node-foyer's own build provenance at the first and
// last frame (the FOYER-V3 council ruling: bind each capture to the live foyer-build-sha,
// discard the run if it moved mid-capture, and record whether that sha is already promoted)
// and writes a full per-capture record (WalkthroughCapture minus the render-stage fields:
// poster/gif/mp4/judge/e2e are added later, once the frames are rendered and sealed).
//
//   DEMO_URL=https://node-foyer.vercel.app node walkthrough.foyer.mjs
//   FOYER_ONLY=FYwall DEMO_URL=https://node-foyer.vercel.app node walkthrough.foyer.mjs
//   NODE_FOYER_REPO=../node-foyer node walkthrough.foyer.mjs   # for reading PROMOTED.md
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { FOYER_SPECS } from "./walkthrough.foyer.specs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "public", "wt");
const NODE_FOYER_REPO = resolve(__dirname, process.env.NODE_FOYER_REPO || "../node-foyer");
const PROMOTED_PATH = join(NODE_FOYER_REPO, "docs", "campaign", "PROMOTED.md");

// No fallback BASE (unlike walkthrough.mjs's http://127.0.0.1:8502 default): FYwall/FYphone
// point at production and FYagent at a local built preview, and getting that wrong silently
// (a leftover dev-server default) is exactly the kind of mistake this contract exists to catch.
const BASE = process.env.DEMO_URL;
if (!BASE) {
  console.error(
    "DEMO_URL is required (no default) — e.g.:\n" +
    "  DEMO_URL=https://node-foyer.vercel.app node walkthrough.foyer.mjs\n" +
    "Each spec also carries its own `url` (production for FYwall/FYphone, the local built\n" +
    "preview for FYagent); DEMO_URL is the fallback for a spec that omits one.",
  );
  process.exit(1);
}

const sleep = (p, ms) => p.waitForTimeout(ms);
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// Page-scoped selector resolver — testid:/btn:/link:/aria:/placeholder:/text:/css:, else raw
// css. Returns the FULL locator (may match more than one element) — every call site below
// narrows with `.first()` itself, except the `count` assert, which needs the unnarrowed set.
const locAll = (p, sel) => {
  if (sel.startsWith("testid:")) return p.getByTestId(sel.slice(7));
  if (sel.startsWith("btn:")) return p.getByRole("button", { name: new RegExp(sel.slice(4), "i") });
  if (sel.startsWith("link:")) return p.getByRole("link", { name: new RegExp(sel.slice(5), "i") });
  if (sel.startsWith("aria:")) return p.locator(`[aria-label="${sel.slice(5).replace(/"/g, '\\"')}"]`);
  if (sel.startsWith("placeholder:")) return p.getByPlaceholder(sel.slice(12), { exact: true });
  if (sel.startsWith("text:")) return p.getByText(sel.slice(5), { exact: false });
  if (sel.startsWith("css:")) return p.locator(sel.slice(4));
  return p.locator(sel);
};
const loc = (p, sel) => locAll(p, sel).first();

// Viewport-relative center of an element (CSS px, clamped) — where the cursor points.
const cursorOf = async (p, sel, vw, vh) => {
  if (!sel) return null;
  try {
    const el = loc(p, sel);
    await el.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
    const box = await el.evaluate((n) => {
      const r = n.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 22) };
    });
    return { x: Math.max(8, Math.min(vw - 8, Math.round(box.x))), y: Math.max(8, Math.min(vh - 8, Math.round(box.y))) };
  } catch { return null; }
};

// The fail-closed proof gate: every `cap` op's `assert` is checked right before the
// screenshot. Returns a short human-readable string for capture.json's frames[].asserted
// on success; throws (caller aborts the spec, keeps zz-fail.png) on failure.
const assertHolds = async (p, a) => {
  if (a.count !== undefined) {
    const n = await locAll(p, a.sel).count();
    if (n !== a.count) throw new Error(`assert failed: ${a.sel} count=${n}, expected ${a.count}`);
    return `${a.sel} count=${a.count}`;
  }
  const L = loc(p, a.sel);
  if (a.focused) {
    const isFocused = await L.evaluate((n) => n === document.activeElement).catch(() => false);
    if (!isFocused) throw new Error(`assert failed: ${a.sel} is not the focused element`);
    return `${a.sel} focused`;
  }
  const visible = await L.first().isVisible().catch(() => false);
  if (a.visible !== false && !visible) throw new Error(`assert failed: ${a.sel} is not visible`);
  if (a.attr) {
    const val = await L.first().getAttribute(a.attr);
    if (a.equals !== undefined && val !== a.equals)
      throw new Error(`assert failed: ${a.sel}[${a.attr}] = ${JSON.stringify(val)}, expected ${JSON.stringify(a.equals)}`);
    if (a.matches !== undefined && !new RegExp(a.matches).test(val ?? ""))
      throw new Error(`assert failed: ${a.sel}[${a.attr}] = ${JSON.stringify(val)} does not match /${a.matches}/`);
    return `${a.sel}[${a.attr}]=${JSON.stringify(val)}`;
  }
  if (a.equals !== undefined || a.matches !== undefined) {
    const text = (await L.first().innerText().catch(() => "")).trim();
    if (a.equals !== undefined && text !== a.equals)
      throw new Error(`assert failed: ${a.sel} text=${JSON.stringify(text.slice(0, 80))}, expected ${JSON.stringify(a.equals)}`);
    if (a.matches !== undefined && !new RegExp(a.matches).test(text))
      throw new Error(`assert failed: ${a.sel} text does not match /${a.matches}/: ${JSON.stringify(text.slice(0, 160))}`);
    return `${a.sel} text matches`;
  }
  return `${a.sel} visible`;
};

const doAct = async (p, a, baseUrl) => {
  if (a.act === "hover") await loc(p, a.sel).hover();
  else if (a.act === "click") await loc(p, a.sel).click();
  else if (a.act === "goto") await p.goto(new URL(a.url, baseUrl).toString(), { waitUntil: "domcontentloaded" });
  else if (a.act === "key") await p.keyboard.press(a.value);
  else if (a.act === "sleep") await sleep(p, a.ms);
  else throw new Error(`unknown act "${a.act}" — valid: hover, click, goto, key, sleep`);
  await sleep(p, a.settle ?? 300);
};

// The served build's own sha, read via a same-origin fetch of "/" rather than the CURRENT
// page's DOM — FYagent's last frame is a raw JSON response page with no <meta> tag at all,
// and a locator miss there is not the build moving, it is the capture having navigated away
// from the wall on purpose. A fresh fetch works from any page on the same origin (CSP's
// connect-src 'self' allows it) and is what "did the served build change mid-capture" means.
const freshBuildSha = async (page) => {
  try {
    const html = await page.evaluate(() => fetch("/", { cache: "no-store" }).then((r) => r.text()));
    return html.match(/<meta\s+name="foyer-build-sha"\s+content="([^"]+)"/)?.[1] ?? null;
  } catch { return null; }
};

// The wall's own honesty attributes — read once at the first frame (the capturer always
// starts every spec on the wall page). types.ts's BUILD_SHA_META_NAME; FoyerWall.tsx's
// data-foyer-snapshot-*.
const readProvenance = async (page) => {
  const buildSha = await freshBuildSha(page);
  const wall = page.getByTestId("foyer-wall");
  const source = await wall.getAttribute("data-foyer-snapshot-source").catch(() => null);
  const snapshotSha256 = await wall.getAttribute("data-foyer-snapshot-sha256").catch(() => null);
  const generatedAt = await wall.getAttribute("data-foyer-snapshot-generated-at").catch(() => null);
  return { buildSha, source, snapshotSha256, generatedAt };
};

const run = async () => {
  const ONLY = process.env.FOYER_ONLY ? process.env.FOYER_ONLY.split(",").map((s) => s.trim()) : null;
  const invalid = ONLY?.filter((id) => !FOYER_SPECS.some((s) => s.id === id));
  if (invalid?.length) throw new Error(`Unknown FOYER_ONLY selector(s): ${invalid.join(", ")}. Choose: ${FOYER_SPECS.map((s) => s.id).join(", ")}`);
  const specs = ONLY ? FOYER_SPECS.filter((s) => ONLY.includes(s.id)) : FOYER_SPECS;

  const promotedText = existsSync(PROMOTED_PATH) ? readFileSync(PROMOTED_PATH, "utf8") : "";
  if (!promotedText) console.log(`(no PROMOTED.md found at ${PROMOTED_PATH} — capturePromoted will be recorded false for every capture)`);

  const browser = await chromium.launch({ headless: true });
  const rendererOut = [];
  try {
    for (const spec of specs) {
      const dir = join(PUB, spec.id);
      const maxAttempts = 1 + (spec.retries || 0);
      let renderSteps = [];
      let frames = [];
      let provenanceFirst, buildShaLast;
      let capturedAt;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        rmSync(dir, { recursive: true, force: true });
        mkdirSync(dir, { recursive: true });
        const page = await browser.newPage({ viewport: { width: spec.vw, height: spec.vh }, deviceScaleFactor: 2 });
        page.setDefaultTimeout(60000);
        const baseUrl = spec.url || BASE;
        await page.goto(baseUrl, { waitUntil: "networkidle" });
        await sleep(page, 1000);
        provenanceFirst = await readProvenance(page);

        renderSteps = [];
        frames = [];
        let n = 0;
        try {
          const capOps = spec.steps.filter((op) => op.cap);
          let capIndex = 0;
          for (const op of spec.steps) {
            if (op.cap) {
              capIndex++;
              const isLast = capIndex === capOps.length;
              const asserted = await assertHolds(page, op.assert);
              const cur = await cursorOf(page, op.cursor, spec.vw, spec.vh);
              await sleep(page, 250);
              const fn = String(n).padStart(2, "0") + ".png";
              const path = join(dir, fn);
              await page.screenshot({ path });
              const bytes = readFileSync(path);
              frames.push({ path: `wt/${spec.id}/${fn}`, sha256: sha256(bytes), caption: op.cap, asserted });
              renderSteps.push({ img: `wt/${spec.id}/${fn}`, caption: op.cap, cursor: cur, click: !!op.click, hold: op.hold || 60 });
              console.log(`  ${spec.id} cap ${n}: ${op.cap}`);
              n++;
              if (isLast) buildShaLast = await freshBuildSha(page);
            } else {
              await doAct(page, op, baseUrl);
            }
          }
          if (provenanceFirst.buildSha !== buildShaLast) {
            throw new Error(
              `foyer-build-sha moved mid-capture (${provenanceFirst.buildSha} -> ${buildShaLast}); ` +
              `discarding this run rather than binding a capture to two different builds`,
            );
          }
          capturedAt = new Date().toISOString();
          await page.close().catch(() => {});
          break; // attempt succeeded
        } catch (e) {
          await page.screenshot({ path: join(dir, "zz-fail.png") }).catch(() => {});
          const bodyText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 200)).catch(() => "(unreadable)");
          console.log(`${spec.id} attempt ${attempt}/${maxAttempts} err: ${e.message.split("\n")[0]}`);
          console.log(`  fail-state: ${bodyText}`);
          await page.close().catch(() => {});
          if (attempt === maxAttempts) throw e;
          console.log(`  retrying ${spec.id} in a fresh page`);
        }
      }

      const capturePromoted = !!provenanceFirst.buildSha && promotedText.includes(provenanceFirst.buildSha);
      const capture = {
        id: spec.id,
        repo: spec.repo,
        title: spec.title,
        demoUrl: spec.url,
        captureKind: spec.captureKind,
        capturedAt,
        captureBuildSha: provenanceFirst.buildSha,
        capturePromoted,
        snapshot: {
          source: provenanceFirst.source,
          sha256: provenanceFirst.snapshotSha256,
          generatedAt: provenanceFirst.generatedAt,
        },
        storyboard: spec.storyboard,
        frames,
        // poster / gif / mp4 / judge / e2e are filled in at the render+seal stage,
        // once the frames above have an MP4 and a judge verdict to report.
      };
      writeFileSync(join(dir, "capture.json"), JSON.stringify(capture, null, 2) + "\n");
      console.log(`  ${spec.id}: wrote ${join(dir, "capture.json")} (buildSha=${provenanceFirst.buildSha}, promoted=${capturePromoted})`);

      rendererOut.push({
        id: spec.id,
        title: spec.title,
        accent: spec.accent,
        scales: spec.scales,
        captureViewport: { width: spec.vw, height: spec.vh },
        steps: renderSteps,
      });
    }
  } finally {
    await browser.close();
  }

  const data = "// AUTO-GENERATED by walkthrough.foyer.mjs — do not edit by hand.\n" +
    "export const FOYER_WALKTHROUGHS = " + JSON.stringify(rendererOut, null, 2) + ";\n";
  writeFileSync(join(__dirname, "src", "walkthrough.foyer.data.js"), data);
  console.log("WALKTHROUGH_FOYER_CAPTURE_DONE — wrote src/walkthrough.foyer.data.js");
};
run().catch((e) => { console.error(e); process.exit(1); });
