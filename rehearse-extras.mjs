#!/usr/bin/env node
/**
 * rehearse-extras.mjs — S3-S7 driven once, with screenshots, before any spec.
 *
 * Order matters: the link-guard (S6) must be seen COLD, in a fresh context,
 * because the session grant from clicking through the landing is exactly what
 * it guards against.
 */
import { requireChromium } from "../noderoom/scripts/playwright-peer.mjs";
const chromium = await requireChromium("rehearse-extras");

const OUT = "C:/Users/hshum/AppData/Local/Temp/claude/C--Users-hshum-Downloads-Interview-items/e3836513-f1aa-4c47-9924-c47e6c3b1b3e/scratchpad/extras";
const browser = await chromium.launch();

// --- S6: the link-guard, cold ------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto("http://localhost:5180/?deck=deck_golden_0l66jpr", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${OUT}/s6-linkguard.png` });
  console.log("s6 text:", (await p.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 220))));
  await ctx.close();
}

// --- S3/S4/S5/S7 in one session ----------------------------------------------
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
const shot = async (n) => { await p.screenshot({ path: `${OUT}/${n}.png` }); console.log(`shot ${n}`); };

await p.goto("http://localhost:5180/", { waitUntil: "domcontentloaded", timeout: 45_000 });
await p.getByText("What presentation should we build").first().waitFor({ timeout: 25_000 });

// S3 — BYOK / Agents
await p.getByRole("button", { name: /byok \/ agents/i }).or(p.getByRole("link", { name: /byok \/ agents/i })).first().click();
await p.waitForTimeout(3000);
await shot("s3-byok");
console.log("s3 heads:", await p.evaluate(() => [...document.querySelectorAll("h1,h2,h3")].map((e) => e.textContent.trim().slice(0, 50)).slice(0, 6).join(" // ")));

// BYOK is a DIALOG (ns-connections-dialog), not a page — it intercepts every
// later click until dismissed. The spec must Escape it.
await p.keyboard.press("Escape");
await p.waitForTimeout(1000);

// S4 — Artifact Lab
await p.getByRole("button", { name: /artifact lab/i }).or(p.getByRole("link", { name: /artifact lab/i })).first().click();
await p.waitForTimeout(4000);
await shot("s4-lab-top");
// scroll the lab — is it window-scrolled or inner?
const h = await p.evaluate(() => document.documentElement.scrollHeight);
console.log("s4 scrollHeight:", h);
await p.evaluate(() => window.scrollTo(0, 1200));
await p.waitForTimeout(1200);
await shot("s4-lab-mid");

// back to landing, into the workspace for S5/S7
await p.goto("http://localhost:5180/", { waitUntil: "domcontentloaded", timeout: 45_000 });
await p.getByText("What presentation should we build").first().waitFor({ timeout: 25_000 });
await p.locator('a:has-text("Explore the editable sample workspace"), button:has-text("Explore the editable sample workspace")').first().click();
await p.getByText("Presenter notes").first().waitFor({ timeout: 30_000 });
await p.waitForTimeout(2000);

// S5 — Present
await p.getByRole("button", { name: /present deck|^present$/i }).first().click();
await p.waitForTimeout(3500);
await shot("s5-present");
console.log("s5 text:", (await p.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 160))));
await p.keyboard.press("Escape");
await p.waitForTimeout(1500);

// S7 — Export
await p.getByRole("button", { name: /export deck|^export$/i }).first().click();
await p.waitForTimeout(2500);
await shot("s7-export");
console.log("s7 menu:", (await p.evaluate(() => {
  const m = document.querySelector('[role=menu],[role=dialog],[class*=menu]');
  return m ? m.innerText.replace(/\s+/g, " ").slice(0, 200) : "no menu element found";
})));

await ctx.close();
await browser.close();
console.log("\nrehearsal complete");
