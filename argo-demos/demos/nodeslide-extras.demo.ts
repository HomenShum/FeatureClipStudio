import { test } from '@argo-video/cli';
import { showOverlay } from '@argo-video/cli';

/**
 * NodeSlide extras — S6, S3, S4, S5, S7 from JOURNEYS.md.
 *
 * Journeys the first two walkthroughs never touched: what a deck RECIPIENT
 * hits, what a DEVELOPER connects, the evidence gallery an EVALUATOR wants,
 * and how a deck is presented and exported.
 *
 * Three facts from rehearse-extras.mjs, each of which broke a naive script:
 *  - the link-guard must be seen COLD; the session grant from clicking through
 *    the landing is exactly what it guards against, so it goes first.
 *  - BYOK is a <dialog> (.ns-connections-dialog) that intercepts pointer events
 *    until dismissed — Escape is mandatory, not tidiness.
 *  - Artifact Lab is also a modal, and Export is a dropdown, not a page.
 */
test('nodeslide-extras', async ({ page, narration }) => {
  test.setTimeout(300_000);

  // 1 — S6: a raw deck link, cold. This is the FIRST navigation of the run, so
  // no session grant exists yet.
  await page.goto('http://localhost:5180/?deck=deck_golden_0l66jpr');
  await page.getByText('This is an editor link, not a share link').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);

  await narration.startRecording(page);

  narration.mark('linkguard');
  await showOverlay(page, 'linkguard', narration.durationFor('linkguard'));

  // 2 — S3: BYOK / Agents
  narration.mark('byok');
  await page.goto('http://localhost:5180/');
  await page.getByText('What presentation should we build').first().waitFor({ timeout: 25_000 });
  await page.locator('button:has-text("BYOK / Agents"), a:has-text("BYOK / Agents")').first().click();
  await page.getByText('Connect your own runtime').first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(narration.durationFor('byok'));

  // 3 — the MCP half of that same dialog
  narration.mark('agents');
  await page.getByText('Same locks, second front door').first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(narration.durationFor('agents'));

  // 4 — S4: Artifact Lab
  narration.mark('lab');
  await page.keyboard.press('Escape'); // the dialog blocks every later click
  await page.waitForTimeout(900);
  await page.locator('button:has-text("Artifact Lab"), a:has-text("Artifact Lab")').first().click();
  await page.getByText('evidence-bound recipes', { exact: false }).first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(narration.durationFor('lab'));

  // 5 — receipts under each card
  narration.mark('receipts');
  await page.getByText('82 of 84 candidates cleared browser and PowerPoint proof', { exact: false })
    .first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(narration.durationFor('receipts'));

  // 6 — S5: Present
  narration.mark('present');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  await page.locator('a:has-text("Explore the editable sample workspace"), button:has-text("Explore the editable sample workspace")').first().click();
  await page.getByText('Presenter notes').first().waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: /present deck|^present$/i }).first().click();
  await page.getByText('Build the story. Keep every decision editable.').first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(narration.durationFor('present'));

  // 7 — S7: Export
  narration.mark('export');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /export deck|^export$/i }).first().click();
  await page.getByText('Editable PPTX with fallbacks').first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(narration.durationFor('export'));

  narration.mark('close');
  await showOverlay(page, 'close', narration.durationFor('close'));
});
