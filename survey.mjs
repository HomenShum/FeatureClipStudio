#!/usr/bin/env node
/**
 * survey.mjs — what is actually on each landing page at each scroll position?
 *
 * Captions must describe what the frame SHOWS. Writing them from memory is how
 * a clip ends up claiming "the brief drives the deck" over a picture of an empty
 * composer. This prints the visible headings per scroll offset so the spec can
 * be written against the page rather than against an intention.
 */
import { chromium } from "playwright";

const TARGETS = [
  { app: "NodeRoom", url: "http://localhost:5260/", proof: "Review every change" },
  { app: "NodeSlide", url: "http://localhost:5180/", proof: "What presentation should we build" },
];
const OFFSETS = [0, 700, 1400, 2100, 2800];

const browser = await chromium.launch();
for (const t of TARGETS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByText(t.proof, { exact: false }).first().waitFor({ timeout: 25_000 });
  // NodeRoom defers importing the app module until the first pointerdown /
  // keydown / wheel / scroll (src/landing/boot.ts). A capture that never
  // interacts therefore films the SSR shell forever — and the shell contains
  // the same proof text, so it looks like a successful capture. Nudge it first.
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 1);
  await page.waitForTimeout(300);

  // The proof text exists in the SSR shell too, so it does NOT prove the app
  // hydrated. Wait for the document height to stop growing.
  let last = -1;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(500);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    if (h === last && h > 0) break;
    last = h;
  }
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`\n=== ${t.app}   scrollHeight=${height}px`);
  for (const y of OFFSETS) {
    if (y > height - 300) { console.log(`  y=${y}: past the end`); continue; }
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(900);
    const actualY = await page.evaluate(() => window.scrollY);
    const seen = await page.evaluate(() => {
      const inView = (el) => {
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight - 40 && r.bottom > 40 && r.width > 0 && r.height > 0;
      };
      return [...document.querySelectorAll("h1,h2,h3,[class*=kicker],[class*=eyebrow]")]
        .filter(inView)
        .map((el) => el.textContent.trim().replace(/\s+/g, " ").slice(0, 78))
        .filter(Boolean)
        .slice(0, 5);
    });
    console.log(`  y=${String(y).padEnd(5)} (actual ${actualY}): ${seen.join("  //  ") || "(no headings in view)"}`);
  }
  await page.close();
}
await browser.close();
