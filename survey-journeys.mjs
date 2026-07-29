#!/usr/bin/env node
/**
 * survey-journeys.mjs — enumerate every distinct SURFACE reachable in both apps
 * without auth, by driving the entry points a real user would hit.
 *
 * Output is a surface inventory: what renders, what it contains, what gates it.
 * The journey map gets written FROM this, not from memory of the apps.
 */
import { requireChromium } from "../noderoom/scripts/playwright-peer.mjs";
const chromium = await requireChromium("survey-journeys");

const browser = await chromium.launch();

const summarize = (page) =>
  page.evaluate(() => {
    const painted = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 3 && r.height > 3;
    };
    const heads = [...document.querySelectorAll("h1,h2,h3")].filter(painted)
      .map((e) => e.textContent.trim().replace(/\s+/g, " ").slice(0, 50)).slice(0, 6);
    const controls = [...document.querySelectorAll("button,[role=button],[role=tab],a[href],input,textarea,select")]
      .filter(painted).length;
    const gate = /sign in|log in|access code|join with a code/i.test(document.body.innerText || "");
    return { heads, controls, gate };
  });

const visit = async (name, url, actions) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(url, { waitUntil: "commit", timeout: 45_000 });
    await page.waitForTimeout(7000);
    if (actions) await actions(page);
    const s = await summarize(page);
    console.log(`\n### ${name}`);
    console.log(`  url: ${page.url()}`);
    console.log(`  controls=${s.controls} gate=${s.gate}`);
    console.log(`  heads: ${s.heads.join(" // ") || "(none)"}`);
  } catch (e) {
    console.log(`\n### ${name}\n  NOT_RUN ${e.message.split("\n")[0].slice(0, 100)}`);
  }
  await page.close();
};

const click = (rx) => async (page) => {
  const b = page.getByRole("button", { name: rx }).or(page.getByRole("link", { name: rx })).first();
  if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(5000); }
  else console.log(`  (entry control ${rx} not found)`);
};

// --- NodeRoom surfaces beyond what is already mapped -------------------------
await visit("NR architecture panel (from #story)", "http://localhost:5260/#story", click(/^architecture$/i));
await visit("NR mobile shell", "http://localhost:5260/#mobile");
await visit("NR create-room dialog", "http://localhost:5260/?create=1");

// --- NodeSlide surfaces beyond the deck editor ------------------------------
await visit("NS Artifact Lab", "http://localhost:5180/", click(/artifact lab/i));
await visit("NS BYOK / Agents", "http://localhost:5180/", click(/byok \/ agents/i));
await visit("NS deck: Present mode", "http://localhost:5180/?deck=deck_golden_0l66jpr", click(/present deck|present/i));
await visit("NS deck: Compare tab", "http://localhost:5180/?deck=deck_golden_0l66jpr", async (page) => {
  const t = page.getByRole("tab", { name: /^compare$/i }).or(page.getByRole("button", { name: /^compare$/i })).first();
  if (await t.count()) { await t.click().catch(() => {}); await page.waitForTimeout(4000); }
});
await visit("NS deck: Export menu", "http://localhost:5180/?deck=deck_golden_0l66jpr", click(/export deck|export/i));
await visit("NS deck mobile viewport", "http://localhost:5180/?deck=deck_golden_0l66jpr", async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(3500);
});

await browser.close();
