import { test } from '@argo-video/cli';
import { showOverlay } from '@argo-video/cli';

/**
 * NodeSlide — the full narrated walkthrough (brief -> deck -> the audit tabs).
 *
 * Every selector was verified in rehearse-deck.mjs frames tonight; every
 * narration line quotes something visible in those frames. Deliberately does
 * NOT click "Propose edit" — that fires a real model call, and a recording that
 * sometimes catches a spinner is a recording that sometimes lies. The audit
 * tabs (Versions / Evidence / Trace) carry the same claim deterministically.
 *
 * NodeSlide runs on :5180 while argo.config baseURL points at :5260, so every
 * goto here is absolute on purpose.
 */
test('nodeslide-full', async ({ page, narration }) => {
  test.setTimeout(300_000);

  await page.goto('http://localhost:5180/');
  await page.getByText('What presentation should we build').first().waitFor({ timeout: 25_000 });
  await page.waitForTimeout(1200);

  await narration.startRecording(page);

  // 1 — the landing question
  narration.mark('landing');
  await showOverlay(page, 'landing', narration.durationFor('landing'));

  // 2 — a brief, typed like a person
  narration.mark('brief');
  const box = page.locator('textarea').first();
  await box.click();
  await box.pressSequentially('A deck on agent evaluation: what ground truth actually means', { delay: 45 });
  await page.waitForTimeout(narration.durationFor('brief'));

  // 3 — the sample workspace: a real deck
  narration.mark('workspace');
  await page.locator('a:has-text("Explore the editable sample workspace"), button:has-text("Explore the editable sample workspace")').first().click();
  await page.getByText('Presenter notes').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(narration.durationFor('workspace'));

  // 4 — elements are typed and addressable
  narration.mark('element');
  await page.getByRole('button', { name: /Headline, text slide element/i }).first().click();
  await page.waitForTimeout(narration.durationFor('element'));

  // 5 — Versions
  narration.mark('versions');
  await page.getByRole('tab', { name: /^Versions$/i }).or(page.getByRole('button', { name: /^Versions$/i })).first().click();
  await page.getByText('Revision history', { exact: false }).first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(narration.durationFor('versions'));

  // 6 — Evidence, which states its own limits
  narration.mark('evidence');
  await page.getByRole('tab', { name: /^Evidence$/i }).or(page.getByRole('button', { name: /^Evidence$/i })).first().click();
  await page.getByText('does not independently verify facts', { exact: false }).first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(narration.durationFor('evidence'));

  // 7 — Trace, which refuses to guess a cost
  narration.mark('trace');
  await page.getByRole('tab', { name: /^Trace$/i }).or(page.getByRole('button', { name: /^Trace$/i })).first().click();
  await page.getByText('not recorded', { exact: false }).first().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(narration.durationFor('trace'));

  // 8 — close on the whole workspace
  narration.mark('close');
  await showOverlay(page, 'close', narration.durationFor('close'));
});
