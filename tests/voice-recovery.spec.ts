import { expect, test } from '@playwright/test';
import { seedReturningLearner } from './helpers';

test('a simulated speech-service network error supports retry and typed recovery', async ({
  page,
}) => {
  await seedReturningLearner(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: undefined,
      configurable: true,
    });
    const attempts = { count: 0 };
    Object.defineProperty(window, 'vocaTestAttempts', { value: attempts });
    class UnavailableRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult = null;
      onend = null;
      onerror: ((event: { error: string }) => void) | null = null;
      start() {
        attempts.count++;
        setTimeout(() => this.onerror?.({ error: 'network' }), 0);
      }
      stop() {}
      abort() {}
    }
    Object.defineProperty(window, 'SpeechRecognition', {
      value: UnavailableRecognition,
      configurable: true,
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Learning' }).click();
  await page.getByRole('button', { name: 'Start microphone' }).click();
  await expect(page.getByRole('alert')).toContainText('Google Chrome');
  await page.getByRole('button', { name: 'Retry microphone' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { vocaTestAttempts: { count: number } }).vocaTestAttempts.count,
    ),
  ).toBe(2);
  const word = (await page.locator('.word-heading h2').innerText()).trim();
  await page.getByRole('button', { name: 'Type instead' }).click();
  const response = page.getByRole('textbox', { name: 'Your response' });
  await expect(response).toBeFocused();
  await expect(response).toHaveValue('');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await response.fill(word);
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByText('Word check passed.', { exact: false })).toBeVisible();
});
