#!/usr/bin/env node
/**
 * probe-r4-r6.mjs — the last two NodeRoom journeys, measured before any spec.
 *
 * R4: the #mobile shell at a phone viewport. R6: the Architecture control in
 * #story, which survey-journeys.mjs could not find by role — it reported the
 * control as a button while the earlier probe looked for a link. Find out what
 * it actually is and what it opens.
 */
import { requireChromium } from "../noderoom/scripts/playwright-peer.mjs";
const chromium = await requireChromium("probe-r4-r6");

const OUT = "C:/Users/hshum/AppData/Local/Temp/claude/C--Users-hshum-Downloads-Interview-items/e3836513-f1aa-4c47-9924-c47e6c3b1b3e/scratchpad/r4r6";
const browser = await chromium.launch();

// --- R4: mobile shell --------------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto("http://localhost:5260/#mobile", { waitUntil: "commit", timeout: 45_000 });
  await p.waitForTimeout(7000);
  await p.screenshot({ path: `${OUT}/r4-mobile.png` });
  console.log("R4 text:", await p.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 240)));
  console.log("R4 controls:", await p.evaluate(() =>
    [...document.querySelectorAll("button,[role=button],a[href],input")]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map((e) => (e.getAttribute("aria-label") || e.innerText || e.getAttribute("placeholder") || "").trim().slice(0, 30))
      .filter(Boolean).join(" · ")));
  await ctx.close();
}

// --- R6: architecture --------------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:5260/#story", { waitUntil: "commit", timeout: 45_000 });
  await p.getByText("Excel-like editing for humans").first().waitFor({ timeout: 25_000 });
  await p.waitForTimeout(2000);

  const arch = p.locator('button:has-text("Architecture"), a:has-text("Architecture")').first();
  console.log("R6 control count:", await arch.count());
  if (await arch.count()) {
    console.log("R6 tag:", await arch.evaluate((n) => n.tagName.toLowerCase() + " href=" + (n.getAttribute("href") ?? "-")));
    await arch.click().catch((e) => console.log("R6 click failed:", e.message.split("\n")[0]));
    await p.waitForTimeout(6000);
    await p.screenshot({ path: `${OUT}/r6-architecture.png` });
    console.log("R6 url:", p.url());
    console.log("R6 heads:", await p.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3")].map((e) => e.textContent.trim().slice(0, 46)).slice(0, 8).join(" // ")));
  }
  await ctx.close();
}

await browser.close();
