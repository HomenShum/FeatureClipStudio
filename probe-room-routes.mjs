#!/usr/bin/env node
/**
 * probe-room-routes.mjs — which NodeRoom entry points reach a real room?
 *
 * boot.ts advertises several private routes (?demo=, ?room=, ?create=, #room-tour,
 * #story, #mobile). A landing-to-outcome walkthrough needs one that renders the
 * review surface WITHOUT a code, or the tour stops at the door.
 *
 * Reports what each route actually renders. A route that only shows the boot
 * shell is NOT a way in, however promising its name.
 */
import { requireChromium } from "../noderoom/scripts/playwright-peer.mjs";
const chromium = await requireChromium("probe-room-routes");

const ROUTES = ["/?demo=1", "/#room-tour", "/#story", "/?create=1", "/#mobile", "/?room=demo"];
const BASE = "http://localhost:5260";

const browser = await chromium.launch();
for (const r of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + r, { waitUntil: "commit", timeout: 45_000 });
    await page.waitForTimeout(9000); // let the deferred app module load and mount
    const info = await page.evaluate(() => ({
      bootShell: !!document.querySelector(".nr-ssr-private"),
      bootState: document.querySelector(".nr-ssr-private")?.getAttribute("data-boot-state") ?? null,
      landing: !!document.querySelector(".nr-ssr-landing"),
      interactive: document.querySelectorAll('button,[role=button],a[href],input,textarea,[role=tab]').length,
      headings: [...document.querySelectorAll("h1,h2,h3")].map((e) => e.textContent.trim().slice(0, 44)).filter(Boolean).slice(0, 5),
      gate: /sign in|access code|join with a code/i.test(document.body.innerText || ""),
      grid: !!document.querySelector('[class*=grid],[class*=sheet],[role=grid]'),
    }));
    const verdict = info.bootShell && info.bootState !== null ? "BOOT SHELL ONLY"
      : info.interactive > 25 ? "REACHED AN APP SURFACE"
      : "landing / shallow";
    console.log(`\n${r.padEnd(14)} -> ${verdict}`);
    console.log(`   interactive=${info.interactive}  grid=${info.grid}  signInGate=${info.gate}  bootState=${info.bootState}`);
    console.log(`   headings: ${info.headings.join(" // ") || "(none)"}`);
  } catch (e) {
    console.log(`\n${r.padEnd(14)} -> NOT_RUN ${e.message.split("\n")[0].slice(0, 90)}`);
  }
  await ctx.close();
}
await browser.close();
