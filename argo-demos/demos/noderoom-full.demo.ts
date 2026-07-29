import { test } from '@argo-video/cli';
import { showOverlay } from '@argo-video/cli';

/**
 * NodeRoom — the full narrated walkthrough (fresh visitor -> approved agent edit).
 *
 * Every selector and every claim in the narration was verified against
 * rehearsal frames tonight (FeatureClipStudio/rehearse-fresh.mjs and
 * rehearse-story.mjs). Two things learned the hard way, encoded here:
 *
 * 1. boot.ts defers the React app until first interaction, and the proof text
 *    "LIVE DEMO" exists only in the hydrated page. The wheel nudge plus that
 *    waiter is hydration-by-proof, not a timer.
 * 2. #story as a same-document hash change may not remount the app; the
 *    reload() forces the full boot path that probe-room-routes verified.
 */
test('noderoom-full', async ({ page, narration }) => {
  // A narrated walkthrough holds each scene for its voiceover clip, so the whole
  // demo runs ~90s — Playwright's default 30s test cap kills it mid-scene.
  test.setTimeout(300_000);
  await page.goto('/');
  await page.getByText('Review every change').first().waitFor({ timeout: 25_000 });
  // Hydration nudge. NOT a mouse event at the viewport centre: at 1920x1080 that
  // point sits over the live-demo card, which is wrapped in a link, and boot.ts
  // deliberately ignores interactions whose target is inside a[href]. A keydown
  // targets <body>, which the guard never skips — position-independent.
  await page.keyboard.press('Shift');
  await page.getByText('LIVE DEMO').first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1200);

  await narration.startRecording(page);

  // 1 — the landing, with its live agent demo
  narration.mark('landing');
  await showOverlay(page, 'landing', narration.durationFor('landing'));

  // 2 — Create a room: the governance question
  narration.mark('create');
  // "Create a room" has been observed as BOTH an <a> and a <button> across
  // renders of this landing. The role is not stable; the label is.
  await page.locator('a:has-text("Create a room"), button:has-text("Create a room")').first().click();
  await page.getByText('How should NodeAgent edits land?').first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(narration.durationFor('create'));

  // 3 — join by code
  narration.mark('join');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const code = page.locator('input[placeholder*="CODE" i]').first();
  await code.click();
  await code.pressSequentially('Q3X-7K', { delay: 90 });
  await page.waitForTimeout(narration.durationFor('join'));

  // 4 — the sample room declares itself synthetic
  narration.mark('sample');
  await page.locator('a:has-text("Try sample"), button:has-text("Try sample")').first().click();
  await page.getByText('Synthetic sample data').first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(narration.durationFor('sample'));

  // 5 — the drills: same engine as a live room
  narration.mark('story');
  await page.goto('/#story');
  await page.reload();
  await page.getByText('Excel-like editing for humans').first().waitFor({ timeout: 25_000 });
  await page.waitForTimeout(narration.durationFor('story'));

  // 6 — no-clobber: conflict comes back as data
  narration.mark('noclobber');
  const d1 = page.getByRole('button', { name: /Run the no-clobber test/i }).first();
  await d1.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await d1.click();
  await page.getByText('returned as data, not a clobber').first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(narration.durationFor('noclobber'));

  // 7 — a stale agent write becomes a review proposal
  narration.mark('review');
  const d3 = page.getByRole('button', { name: /Run the stale-write/i }).first();
  await d3.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await d3.click();
  await page.getByRole('button', { name: /Approve proposal/i }).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(narration.durationFor('review'));

  // 8 — the human approves; it re-applies at the current version
  narration.mark('approve');
  await page.getByRole('button', { name: /Approve proposal/i }).first().click();
  await page.getByText('re-applied at the current version').first().waitFor({ timeout: 15_000 });
  await page.getByText('re-applied at the current version').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(narration.durationFor('approve'));
});
