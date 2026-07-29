#!/usr/bin/env node
/**
 * rehearse-story.mjs — run the intended journey once and screenshot it.
 *
 * The spec gets written from what this proves, not from what the DOM suggests.
 * The last cut shipped captions describing a deck that was never on screen; a
 * rehearsal is the cheapest way to not do that again.
 *
 * #story scrolls an INNER container (div.r-screen.rs-scroll, 664 -> 8570), so
 * window.scrollTo is useless here — every move is scrollIntoView on a target.
 */
import { requireChromium } from "../noderoom/scripts/playwright-peer.mjs";
const chromium = await requireChromium("rehearse-story");

const OUT = "C:/Users/hshum/AppData/Local/Temp/claude/C--Users-hshum-Downloads-Interview-items/e3836513-f1aa-4c47-9924-c47e6c3b1b3e/scratchpad/story";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const toText = async (t) => {
  const el = page.getByText(t, { exact: false }).first();
  await el.scrollIntoViewIfNeeded({ timeout: 8000 });
  await page.waitForTimeout(900);
};
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png`, animations: "disabled" }); console.log(`  shot ${n}`); };

await page.goto("http://localhost:5260/#story", { waitUntil: "commit", timeout: 60_000 });
await page.waitForTimeout(9000);
await shot("01-top");

await toText("Edit the cell. Ask the agent");
await shot("02-edit-cell");

// Drill 1 — no-clobber
await toText("No stale write gets through");
await shot("03-before-noclobber");
const d1 = page.getByRole("button", { name: /Run the no-clobber test/i }).first();
console.log(`  drill1 buttons: ${await d1.count()}`);
await d1.click({ timeout: 8000 }).catch((e) => console.log(`  drill1 click FAILED ${e.message.split("\n")[0]}`));
await page.waitForTimeout(3000);
await shot("04-after-noclobber");

// Drill 2 — lease + draft-around-lock
const d2 = page.getByRole("button", { name: /Run the lease \+ draft-around-lock/i }).first();
console.log(`  drill2 buttons: ${await d2.count()}`);
await d2.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(700);
await d2.click({ timeout: 8000 }).catch((e) => console.log(`  drill2 click FAILED ${e.message.split("\n")[0]}`));
await page.waitForTimeout(3200);
await shot("05-after-lease");

// Drill 3 — the trust surface: stale write becomes reviewable
const d3 = page.getByRole("button", { name: /Run the stale-write/i }).first();
console.log(`  drill3 buttons: ${await d3.count()}`);
await d3.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(700);
await d3.click({ timeout: 8000 }).catch((e) => console.log(`  drill3 click FAILED ${e.message.split("\n")[0]}`));
await page.waitForTimeout(3500);
await shot("06-after-stale-write");

await toText("The product demonstrates itself");
await shot("07-live-rooms");

await browser.close();
console.log("\nrehearsal complete");
