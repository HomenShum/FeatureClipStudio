#!/usr/bin/env node
/**
 * rehearse-deck.mjs — walk the deck journey once and screenshot every step.
 *
 * Deliberately avoids "Propose edit": that fires a real model call, which is slow
 * and non-deterministic, and a capture that sometimes shows a spinner is a
 * capture that sometimes lies. The inspector tabs carry the same claim —
 * reviewable, versioned, evidence-backed, traced — and they are deterministic.
 */
import { requireChromium } from "../noderoom/scripts/playwright-peer.mjs";
const chromium = await requireChromium("rehearse-deck");

const OUT = "C:/Users/hshum/AppData/Local/Temp/claude/C--Users-hshum-Downloads-Interview-items/e3836513-f1aa-4c47-9924-c47e6c3b1b3e/scratchpad/deck";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png`, animations: "disabled" }); console.log(`  shot ${n}`); };

await page.goto("http://localhost:5180/", { waitUntil: "domcontentloaded", timeout: 45_000 });
await page.getByText("What presentation should we build", { exact: false }).first().waitFor({ timeout: 25_000 });
await page.locator("textarea").first().fill("A deck on agent evaluation: what ground truth actually means");
await page.waitForTimeout(1200);
await shot("01-brief");

await page.getByRole("link", { name: /explore the editable sample workspace/i })
  .or(page.getByRole("button", { name: /explore the editable sample workspace/i })).first().click();
await page.waitForTimeout(9000);
await shot("02-deck");

// Select a real slide element — the claim is that a deck is structured, not flat.
const headline = page.getByRole("button", { name: /Headline, text slide element/i }).first();
console.log(`  headline: ${await headline.count()}`);
await headline.click({ timeout: 8000 }).catch((e) => console.log(`  headline click FAILED ${e.message.split("\n")[0]}`));
await page.waitForTimeout(2200);
await shot("03-element-selected");

for (const tab of ["Design", "Versions", "Evidence", "Trace"]) {
  const t = page.getByRole("tab", { name: new RegExp(`^${tab}$`, "i") })
    .or(page.getByRole("button", { name: new RegExp(`^${tab}$`, "i") })).first();
  const n = await t.count();
  console.log(`  tab ${tab}: ${n}`);
  if (!n) continue;
  await t.click({ timeout: 8000 }).catch((e) => console.log(`  ${tab} click FAILED ${e.message.split("\n")[0]}`));
  await page.waitForTimeout(2600);
  await shot(`0${["Design", "Versions", "Evidence", "Trace"].indexOf(tab) + 4}-${tab.toLowerCase()}`);
}

await browser.close();
console.log("\nrehearsal complete");
