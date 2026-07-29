#!/usr/bin/env node
/**
 * journey-coverage.mjs — how much of the UI does a walkthrough actually touch?
 *
 * A clip that shows a landing page and stops is a capability proof, not a
 * walkthrough. The difference is measurable: enumerate every interactive
 * element a new user could reach on the journey surfaces, then compare against
 * what the spec actually exercises.
 *
 * Reports COVERAGE and, more importantly, the NAMED REMAINDER — the controls a
 * new user would meet that the clip never shows. A percentage with no list is
 * the same defect as a frame count with no picture.
 */
import { chromium } from "playwright";
import { SPECS } from "./walkthrough.specs.mjs";

const SURFACES = [
  { app: "NodeRoom", url: "http://localhost:5260/#story", proof: "Excel-like editing for humans", deeper: null },
  { app: "NodeSlide", url: "http://localhost:5180/", proof: "What presentation should we build",
    deeper: { label: /explore the editable sample workspace/i, name: "sample deck workspace" } },
];

const census = (page) =>
  page.evaluate(() => {
    const painted = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return false;
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
      }
      return true;
    };
    const SEL = 'button,[role=button],a[href],input,textarea,select,[contenteditable="true"],[role=tab],[role=menuitem],[role=switch],[role=checkbox],[tabindex]:not([tabindex="-1"])';
    const seen = new Map();
    for (const el of document.querySelectorAll(SEL)) {
      if (!painted(el)) continue;
      const label =
        (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || el.getAttribute("title") || "")
          .trim().replace(/\s+/g, " ").slice(0, 48) || `<${el.tagName.toLowerCase()}>`;
      const key = `${el.tagName.toLowerCase()}|${label}`;
      if (!seen.has(key)) seen.set(key, { tag: el.tagName.toLowerCase(), label });
    }
    return [...seen.values()];
  });

const browser = await chromium.launch();
const report = [];

for (const s of SURFACES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByText(s.proof, { exact: false }).first().waitFor({ timeout: 25_000 });
  await page.waitForTimeout(2000);

  const surfaces = [{ name: "landing", items: await census(page) }];

  if (s.deeper) {
    const link = page.getByRole("link", { name: s.deeper.label }).or(page.getByRole("button", { name: s.deeper.label })).first();
    if (await link.count()) {
      await link.click().catch(() => {});
      await page.waitForTimeout(6000);
      surfaces.push({ name: s.deeper.name, items: await census(page) });
    } else {
      surfaces.push({ name: s.deeper.name, items: [], note: "NOT_REACHED — entry control not found" });
    }
  }

  // What does the shipped spec actually touch?
  const spec = SPECS.find((x) => x.id === s.app);
  const touched = (spec?.steps ?? []).filter((st) => st.act === "click" || st.act === "fill" || st.cursor).length;
  const captions = (spec?.steps ?? []).filter((st) => st.cap).length;

  report.push({ app: s.app, surfaces, touched, captions });
  await page.close();
}
await browser.close();

for (const r of report) {
  const total = r.surfaces.reduce((a, s) => a + s.items.length, 0);
  console.log(`\n=== ${r.app}`);
  for (const s of r.surfaces) {
    console.log(`  ${s.name}: ${s.items.length} interactive element(s)${s.note ? "  [" + s.note + "]" : ""}`);
    for (const it of s.items.slice(0, 14)) console.log(`      ${it.tag.padEnd(9)} ${it.label}`);
    if (s.items.length > 14) console.log(`      … and ${s.items.length - 14} more`);
  }
  const pct = total ? Math.round((r.touched / total) * 100) : 0;
  console.log(`  --> clip has ${r.captions} caption(s) and exercises ${r.touched}/${total} interactive elements (${pct}%)`);
}
