#!/usr/bin/env node
/** Can the clip get past the landing page without a sign-in? Facts only. */
import { chromium } from "playwright";

const browser = await chromium.launch();

const probe = async (name, url, proof, buttonRx) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByText(proof, { exact: false }).first().waitFor({ timeout: 25_000 });
  const before = page.url();
  const btn = page.getByRole("button", { name: buttonRx }).or(page.getByRole("link", { name: buttonRx })).first();
  const n = await btn.count();
  console.log(`\n=== ${name}`);
  console.log(`  entry control "${buttonRx}": ${n} match(es)`);
  if (!n) { await page.close(); return; }
  await btn.click().catch((e) => console.log(`  click failed: ${e.message.split("\n")[0]}`));
  await page.waitForTimeout(7000);
  console.log(`  url before: ${before}`);
  console.log(`  url after:  ${page.url()}`);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const heads = await page.evaluate(() =>
    [...document.querySelectorAll("h1,h2,h3")].map((e) => e.textContent.trim().slice(0, 60)).filter(Boolean).slice(0, 6));
  const signIn = await page.getByText(/sign in|log in|access code/i).count();
  console.log(`  scrollHeight: ${h}  headings: ${heads.join(" // ") || "(none)"}`);
  console.log(`  sign-in / access-code prompts on screen: ${signIn}`);
  await page.close();
};

await probe("NodeRoom", "http://localhost:5260/", "Review every change", /try a sample room/i);
await probe("NodeSlide", "http://localhost:5180/", "What presentation should we build", /explore the editable sample workspace/i);
await browser.close();
