#!/usr/bin/env node
/**
 * survey-deck.mjs — map NodeSlide's deck workspace before writing its spec.
 *
 * 78 interactive controls, of which the current clip opens 4. This prints them
 * grouped by screen region so the journey can be designed around what a new user
 * would actually do, rather than around whatever is easiest to click.
 */
import { requireChromium } from "../noderoom/scripts/playwright-peer.mjs";
const chromium = await requireChromium("survey-deck");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
await page.goto("http://localhost:5180/", { waitUntil: "domcontentloaded", timeout: 45_000 });
await page.getByText("What presentation should we build", { exact: false }).first().waitFor({ timeout: 25_000 });
await page.getByRole("link", { name: /explore the editable sample workspace/i })
  .or(page.getByRole("button", { name: /explore the editable sample workspace/i })).first().click();
await page.waitForTimeout(9000);
console.log(`url: ${page.url()}`);

const groups = await page.evaluate(() => {
  const W = window.innerWidth, H = window.innerHeight;
  const region = (r) => {
    if (r.top < 60) return "topbar";
    if (r.left < W * 0.2) return "left rail";
    if (r.left > W * 0.68) return "right inspector";
    if (r.top > H - 110) return "bottom";
    return "canvas";
  };
  const out = {};
  for (const el of document.querySelectorAll('button,[role=button],[role=tab],a[href],input,textarea,select,[contenteditable="true"]')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const label = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || el.tagName)
      .trim().replace(/\s+/g, " ").slice(0, 40);
    if (!label) continue;
    const g = region(r);
    (out[g] ??= new Set()).add(label);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]));
});

let total = 0;
for (const [g, items] of Object.entries(groups)) {
  console.log(`\n${g} (${items.length}):`);
  items.forEach((i) => console.log(`  ${i}`));
  total += items.length;
}
console.log(`\ntotal distinct labels: ${total}`);
await browser.close();
