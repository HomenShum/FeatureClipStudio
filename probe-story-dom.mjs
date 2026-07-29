#!/usr/bin/env node
/** Find #story's real scroll container, its tabs, and its sections. */
import { requireChromium } from "../noderoom/scripts/playwright-peer.mjs";
const chromium = await requireChromium("probe-story-dom");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:5260/#story", { waitUntil: "commit", timeout: 60_000 });
await page.waitForTimeout(9000);

const info = await page.evaluate(() => {
  const scrollers = [...document.querySelectorAll("*")]
    .filter((el) => el.scrollHeight > el.clientHeight + 80 && el.clientHeight > 200)
    .map((el) => ({
      sel: el.tagName.toLowerCase() + (el.className?.toString?.().trim().split(/\s+/).slice(0, 2).map((c) => "." + c).join("") ?? ""),
      testid: el.getAttribute("data-testid") ?? null,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
  const controls = [...document.querySelectorAll("button,[role=button],[role=tab],a[href]")]
    .filter((e) => e.getBoundingClientRect().width > 0)
    .map((e) => ({
      tag: e.tagName.toLowerCase(),
      role: e.getAttribute("role"),
      label: (e.getAttribute("aria-label") || e.innerText || "").trim().replace(/\s+/g, " ").slice(0, 40),
    }));
  const heads = [...document.querySelectorAll("h1,h2,h3,h4")].map((e) => e.textContent.trim().replace(/\s+/g, " ").slice(0, 60));
  return { scrollers, controls, heads };
});

console.log("SCROLLERS:");
for (const s of info.scrollers) console.log(`  ${s.sel}  testid=${s.testid}  ${s.clientHeight} -> ${s.scrollHeight}`);
console.log("\nCONTROLS (" + info.controls.length + "):");
for (const c of info.controls) console.log(`  ${c.tag}${c.role ? "[" + c.role + "]" : ""}  ${c.label}`);
console.log("\nHEADINGS (" + info.heads.length + "):");
for (const h of info.heads) console.log(`  ${h}`);

await browser.close();
