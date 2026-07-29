#!/usr/bin/env node
/**
 * survey-story.mjs — map NodeRoom's #story surface before writing a spec.
 *
 * Captions must describe what the frame shows, so the spec gets written against
 * the page rather than against an intention. Prints the heading nearest the top
 * of the viewport at each offset, plus the interactive controls in view.
 */
import { requireChromium } from "../noderoom/scripts/playwright-peer.mjs";
const chromium = await requireChromium("survey-story");

const URL = "http://localhost:5260/#story";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto(URL, { waitUntil: "commit", timeout: 60_000 });
await page.waitForTimeout(9000);

const height = await page.evaluate(() => document.documentElement.scrollHeight);
console.log(`scrollHeight = ${height}px  (${Math.ceil(height / 720)} viewports)`);

const step = 620;
for (let y = 0; y < height - 300; y += step) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(1100);
  const seen = await page.evaluate(() => {
    const inView = (el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight - 30 && r.bottom > 30 && r.width > 0 && r.height > 0;
    };
    const heads = [...document.querySelectorAll("h1,h2,h3,h4")].filter(inView)
      .map((e) => e.textContent.trim().replace(/\s+/g, " ").slice(0, 66));
    const ctrls = [...document.querySelectorAll("button,[role=button],a[href],input,textarea,[role=tab]")]
      .filter(inView)
      .map((e) => (e.getAttribute("aria-label") || e.innerText || e.getAttribute("placeholder") || e.tagName).trim().replace(/\s+/g, " ").slice(0, 30))
      .filter(Boolean);
    return { heads, ctrls, y: Math.round(window.scrollY) };
  });
  console.log(`\ny=${String(y).padEnd(5)} (actual ${seen.y})`);
  console.log(`  headings: ${seen.heads.join("  //  ") || "(none)"}`);
  console.log(`  controls: ${seen.ctrls.join(" · ") || "(none)"}`);
}

await browser.close();
