// SlideLang production-proof capturer.
//
// This is intentionally a dedicated React/Convex adapter instead of a cosmetic
// selector list: every action advances the real production flow and every cap
// records the state that proves the preceding claim.
import { chromium } from "playwright";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SLIDELANG_SPECS } from "./walkthrough.slidelang.specs.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.DEMO_URL || "https://slidelang-challenge.vercel.app";
const OUTPUT_DIR = join(__dirname, "out");
const PUBLIC_DIR = join(__dirname, "public", "wt");
const DATA_FILE = join(__dirname, "src", "walkthrough.slidelang.data.js");
const DEFAULT_HOLD = 180;
const landingKey = (title) => {
  if (title.startsWith("Q3 Portfolio Review: Stability Amid")) return "q3-portfolio";
  if (title === "Monthly Product Review for Leadership Sync") return "monthly-product";
  if (title === "Quarterly Review") return "quarterly-review";
  return null;
};

const sleep = (page, ms) => page.waitForTimeout(ms);

function locator(page, selector) {
  if (selector.startsWith("btnRegex:")) {
    return page.getByRole("button", { name: new RegExp(selector.slice(9), "i") }).first();
  }
  if (selector.startsWith("btn:")) {
    return page.getByRole("button", { name: selector.slice(4), exact: true }).first();
  }
  if (selector.startsWith("testid:")) return page.getByTestId(selector.slice(7)).first();
  if (selector.startsWith("text:")) return page.getByText(selector.slice(5), { exact: false }).first();
  return page.locator(selector).first();
}

async function cursorOf(page, selector, viewport) {
  if (!selector) return null;
  const element = locator(page, selector);
  await element.waitFor({ state: "visible", timeout: 10000 });
  let box = await element.boundingBox();
  if (box && (box.y < 0 || box.y + box.height > viewport.height || box.x < 0 || box.x + box.width > viewport.width)) {
    await element.scrollIntoViewIfNeeded();
    box = await element.boundingBox();
  }
  if (!box) return null;
  return {
    x: Math.max(8, Math.min(viewport.width - 8, Math.round(box.x + box.width / 2))),
    y: Math.max(8, Math.min(viewport.height - 8, Math.round(box.y + Math.min(box.height / 2, 22)))),
  };
}

async function waitForText(page, value, timeoutMs = 60000) {
  await page.waitForFunction(
    (needle) => document.body.innerText.includes(needle),
    value,
    { timeout: timeoutMs, polling: 250 },
  );
}

async function curateLanding(page) {
  const grid = page.getByTestId("deck-grid");
  try {
    await grid.waitFor({ state: "visible", timeout: 15000 });
  } catch {
    console.log("  curated landing: no saved deck grid appeared");
    return;
  }
  const cards = grid.locator(":scope > div");
  for (;;) {
    const seen = new Set();
    const count = await cards.count();
    let removed = false;
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const open = card.locator('button[aria-label^="Open deck:"]').first();
      const title = ((await open.getAttribute("aria-label")) || "").replace(/^Open deck:\s*/, "");
      const key = landingKey(title);
      if (key && !seen.has(key)) {
        seen.add(key);
        continue;
      }
      const remove = card.locator('button[aria-label^="Delete deck:"]').first();
      page.once("dialog", (dialog) => dialog.accept());
      await remove.click();
      await sleep(page, 250);
      console.log(`  curated landing: deleted ${title}`);
      removed = true;
      break;
    }
    if (!removed) break;
  }
}

async function trimStoryboard(page, maxEntries) {
  const cards = page.getByTestId("storyboard-card");
  const waitForCount = (max) => page.waitForFunction(
    ({ selector, expectedMax }) => document.querySelectorAll(selector).length <= expectedMax,
    { selector: '[data-testid="storyboard-card"]', expectedMax: max },
    { timeout: 10000 },
  );
  const removeRole = async (role) => {
    const count = await cards.count();
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      if (!(await card.innerText()).includes(role)) continue;
      await card.locator('button[aria-label^="Remove slide "]').click();
      await waitForCount(count - 1);
      return true;
    }
    return false;
  };

  for (const role of ["COMPARISON", "RISKS"]) {
    if ((await cards.count()) <= maxEntries) break;
    await removeRole(role);
  }
  while ((await cards.count()) > maxEntries) {
    const count = await cards.count();
    const fallbackIndex = Math.max(1, count - 2);
    await cards.nth(fallbackIndex).locator('button[aria-label^="Remove slide "]').click();
    await waitForCount(count - 1);
  }
}

async function runAction(page, action) {
  const timeoutMs = action.timeoutMs || 60000;
  if (action.act === "fill") {
    const element = locator(page, action.sel);
    await element.waitFor({ state: "visible", timeout: timeoutMs });
    await element.fill(String(action.value));
    if (action.commit) await element.press(action.commit);
  } else if (action.act === "fillLast") {
    const elements = action.sel.startsWith("testid:")
      ? page.getByTestId(action.sel.slice(7))
      : page.locator(action.sel);
    const count = await elements.count();
    if (!count) throw new Error(`fillLast found no elements for ${action.sel}`);
    await elements.nth(count - 1).fill(String(action.value));
  } else if (action.act === "trimStoryboard") {
    await trimStoryboard(page, action.max);
  } else if (action.act === "click") {
    await locator(page, action.sel).click({ timeout: timeoutMs });
  } else if (action.act === "doubleclickIndex") {
    const elements = page.locator(action.sel);
    const count = await elements.count();
    if (action.index < 0 || action.index >= count) {
      throw new Error(`doubleclickIndex ${action.index} out of ${count} for ${action.sel}`);
    }
    await elements.nth(action.index).dblclick({ timeout: timeoutMs });
  } else if (action.act === "upload") {
    await locator(page, action.sel).setInputFiles(join(__dirname, "fixtures", action.file));
  } else if (action.act === "waitText") {
    await waitForText(page, action.value, timeoutMs);
  } else if (action.act === "waitFor") {
    await locator(page, action.sel).waitFor({ state: "visible", timeout: timeoutMs });
  } else if (action.act === "waitForNo") {
    await locator(page, action.sel).waitFor({ state: "detached", timeout: timeoutMs });
  } else if (action.act === "waitCount") {
    await page.waitForFunction(
      ({ selector, min }) => document.querySelectorAll(selector).length >= min,
      {
        selector: action.sel.startsWith("testid:")
          ? `[data-testid="${action.sel.slice(7)}"]`
          : action.sel,
        min: action.min,
      },
      { timeout: timeoutMs, polling: 250 },
    );
  } else if (action.act === "findSlideContaining") {
    const nav = page.getByTestId("nav-slide");
    const count = await nav.count();
    let found = false;
    for (let index = 0; index < count; index += 1) {
      await nav.nth(index).click();
      await sleep(page, 250);
      const canvas = page.locator("[data-slide-id]:visible").first();
      const hasText = (await canvas.innerText()).includes(action.value);
      const hasChart = !action.requireChart || (await canvas.locator("svg").count()) > 0;
      if (hasText && hasChart) {
        found = true;
        break;
      }
    }
    if (!found) throw new Error(`No visible ${action.requireChart ? "chart " : ""}slide contained ${action.value}`);
  } else if (action.act === "waitPublishEnabled") {
    const publish = page.getByRole("button", { name: "Publish", exact: true }).first();
    await page.waitForFunction(
      (button) => button instanceof HTMLButtonElement && !button.disabled,
      await publish.elementHandle(),
      { timeout: timeoutMs, polling: 250 },
    );
  } else if (action.act === "repairUntilClean") {
    const publish = page.getByRole("button", { name: "Publish", exact: true }).first();
    for (let round = 0; round < 5; round += 1) {
      if (await publish.isEnabled()) return;
      const repair = page.getByTestId("repair-button").first();
      if ((await repair.count()) === 0 || !(await repair.isVisible())) {
        throw new Error("Generated deck is publish-blocked without an available deterministic repair");
      }
      await repair.click();
      const accept = page.getByTestId("accept-proposal").first();
      await accept.waitFor({ state: "visible", timeout: timeoutMs });
      await accept.click();
      await accept.waitFor({ state: "detached", timeout: timeoutMs });
      await sleep(page, 500);
    }
    if (!(await publish.isEnabled())) throw new Error("Generated deck remained blocked after five repair rounds");
  } else if (action.act === "download") {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const pendingDownload = page.waitForEvent("download", { timeout: timeoutMs });
    await locator(page, action.sel).click();
    const download = await pendingDownload;
    await download.saveAs(join(OUTPUT_DIR, action.file));
  } else if (action.act === "gotoPublished") {
    const current = new URL(page.url());
    const deckId = decodeURIComponent(current.hash.replace(/^#/, ""));
    if (!deckId || deckId.startsWith("v/")) throw new Error(`Cannot derive deck id from ${current.href}`);
    await page.goto(`${current.origin}${current.pathname}#v/${deckId}`, { waitUntil: "domcontentloaded" });
  } else if (action.act === "scrollTop") {
    await page.evaluate(() => window.scrollTo(0, 0));
  } else if (action.act === "sleep") {
    await sleep(page, action.ms);
  } else {
    throw new Error(`Unknown SlideLang action: ${action.act}`);
  }
  await sleep(page, 250);
}

async function captureSpec(browser, spec) {
  const viewport = spec.captureViewport || { width: 1512, height: 900 };
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByTestId("prompt-input").waitFor({ state: "visible", timeout: 60000 });
  if (process.env.CURATE_LANDING === "1") await curateLanding(page);

  const frameDir = join(PUBLIC_DIR, spec.id);
  rmSync(frameDir, { recursive: true, force: true });
  mkdirSync(frameDir, { recursive: true });

  const steps = [];
  let frameIndex = 0;
  try {
    for (const operation of spec.steps) {
      if (operation.cap && operation.burst) {
        const every = operation.burst.every || 320;
        const count = Math.max(2, Math.round((operation.burst.ms || 2800) / every));
        const images = [];
        for (let burstIndex = 0; burstIndex < count; burstIndex += 1) {
          const name = `${String(frameIndex).padStart(2, "0")}_${String(burstIndex).padStart(2, "0")}.png`;
          await page.screenshot({ path: join(frameDir, name) });
          images.push(`wt/${spec.id}/${name}`);
          if (burstIndex < count - 1) await sleep(page, every);
        }
        steps.push({
          imgs: images,
          caption: operation.cap,
          cursor: null,
          click: false,
          hold: operation.hold || DEFAULT_HOLD,
          burst: true,
          scene: operation.scene,
        });
        console.log(`  burst ${frameIndex}: ${images.length} frames — ${operation.cap}`);
        frameIndex += 1;
      } else if (operation.cap) {
        const cursor = await cursorOf(page, operation.cursor, viewport);
        const name = `${String(frameIndex).padStart(2, "0")}.png`;
        await sleep(page, 250);
        await page.screenshot({ path: join(frameDir, name) });
        steps.push({
          img: `wt/${spec.id}/${name}`,
          caption: operation.cap,
          cursor,
          click: Boolean(operation.click),
          hold: operation.hold || DEFAULT_HOLD,
          scene: operation.scene,
        });
        console.log(`  cap ${frameIndex}: ${operation.cap}`);
        frameIndex += 1;
      } else {
        await runAction(page, operation);
      }
    }
  } catch (error) {
    await page.screenshot({ path: join(frameDir, "zz-fail.png") }).catch(() => {});
    const excerpt = await page.locator("body").innerText().catch(() => "(body unavailable)");
    writeFileSync(join(frameDir, "zz-fail.txt"), excerpt.slice(0, 4000));
    throw error;
  } finally {
    await context.close();
  }

  return {
    id: spec.id,
    title: spec.title,
    accent: spec.accent,
    captureViewport: viewport,
    story: spec.story,
    steps,
  };
}

async function main() {
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const walkthroughs = [];
    for (const spec of SLIDELANG_SPECS) walkthroughs.push(await captureSpec(browser, spec));
    writeFileSync(
      DATA_FILE,
      `// AUTO-GENERATED by walkthrough.slidelang.mjs — do not edit by hand.\nexport const SLIDELANG_WALKTHROUGHS = ${JSON.stringify(walkthroughs, null, 2)};\n`,
    );
    console.log(`SLIDELANG_CAPTURE_DONE — wrote ${DATA_FILE}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
