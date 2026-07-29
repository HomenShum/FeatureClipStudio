import { test } from '@argo-video/cli';
import { showOverlay, withOverlay } from '@argo-video/cli';

test('example', async ({ page, narration }) => {
  await page.goto('/');

  // Begin screen capture once setup is done. The first narration.mark()
  // below lands at t=0 in the recording — no head-trim needed.
  await narration.startRecording(page);

  narration.mark('welcome');
  await showOverlay(page, 'welcome', narration.durationFor('welcome'));

  narration.mark('action');
  await withOverlay(page, 'action', async () => {
    await page.click('button');
    await page.waitForTimeout(narration.durationFor('action'));
  });

  narration.mark('done');
  await showOverlay(page, 'done', narration.durationFor('done'));
});
