#!/usr/bin/env node
/**
 * rehearse-fresh.mjs — the fresh-user landing flow, once, with screenshots.
 *
 * Two facts this rehearsal already established, both load-bearing:
 *
 * 1. THE HYDRATED LANDING IS A DIFFERENT PAGE. boot.ts defers the app module
 *    until first interaction, and the React landing that replaces the SSR shell
 *    is richer: an inline ENTER CODE / Join room control (there is no "Join with
 *    a code" dialog — that link only exists in the shell), a LIVE DEMO card
 *    showing an agent commit with a SOURCE-BACKED citation (NetSuite p.4), and
 *    "Try sample". Every earlier clip filmed the shell.
 *
 * 2. The create dialog needs settle time before a frame is legible — the first
 *    capture caught it mid-transition and produced an unreadable dark panel.
 */
import { requireChromium } from "../noderoom/scripts/playwright-peer.mjs";
const chromium = await requireChromium("rehearse-fresh");

const OUT = "C:/Users/hshum/AppData/Local/Temp/claude/C--Users-hshum-Downloads-Interview-items/e3836513-f1aa-4c47-9924-c47e6c3b1b3e/scratchpad/fresh";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); console.log(`  shot ${n}`); };

await page.goto("http://localhost:5260/", { waitUntil: "commit", timeout: 45_000 });
await page.getByText("Review every change", { exact: false }).first().waitFor({ timeout: 25_000 });

// Hydrate deliberately: nudge, then wait for a React-only element (the inline
// code input) rather than a timer. Filming the shell again is the failure.
await page.mouse.move(640, 400);
await page.mouse.wheel(0, 1);
const codeInput = page.getByPlaceholder(/enter code/i).or(page.locator('input[placeholder*="CODE" i]')).first();
await codeInput.waitFor({ timeout: 20_000 }).catch(() => console.log("  WARN: inline code input never appeared — still on the shell?"));
await page.waitForTimeout(1500);
await shot("01-landing-hydrated");

// The live-demo card: the agent's commit with its source-backed citation.
const demo = page.getByText("SOURCE-BACKED", { exact: false }).first();
console.log(`  live-demo citation visible: ${await demo.count()}`);

// Path A: Create a room -> dialog, settled.
await page.getByRole("button", { name: /create a room/i }).or(page.getByRole("link", { name: /create a room/i })).first().click();
await page.waitForTimeout(4500); // settle: the first capture at 3s was mid-transition
await shot("02-create-dialog");
const dlg = await page.evaluate(() => {
  const d = document.querySelector("[role=dialog]");
  if (!d) return { present: false };
  const s = getComputedStyle(d);
  return { present: true, opacity: s.opacity, text: d.innerText.replace(/\s+/g, " ").slice(0, 260) };
});
console.log(`  dialog: ${JSON.stringify(dlg).slice(0, 320)}`);

// The gate: what stops a fresh user from finishing? Look for sign-in inside the flow.
const gate = await page.getByText(/sign in/i).count();
console.log(`  sign-in mentions in view: ${gate}`);

await page.keyboard.press("Escape");
await page.waitForTimeout(1500);

// Path B: the inline join control, typed like a person would.
if (await codeInput.count()) {
  await codeInput.click();
  await codeInput.type("Q3X-7K", { delay: 60 });
  await page.waitForTimeout(1200);
  await shot("03-join-code-typed");
}

// Path C: Try sample — the dialog that was illegible last time. Settled now.
const sample = page.getByRole("button", { name: /try sample/i }).or(page.getByRole("link", { name: /try sample/i })).first();
console.log(`  try-sample: ${await sample.count()}`);
if (await sample.count()) {
  await sample.click();
  await page.waitForTimeout(4500);
  await shot("04-sample-dialog");
}

await browser.close();
console.log("\nrehearsal complete");
