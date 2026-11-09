import { expect, test } from '@playwright/test';
import { seedReturningLearner } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedReturningLearner(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: undefined,
      configurable: true,
    });
  });
});

test('sentence grammar issues prevent success, explain a correction, and require a real recheck', async ({
  page,
}, testInfo) => {
  // Only mocked HTTP fixtures run in automated tests. Live provider checks are manual.
  await page.clock.install();
  let requests = 0;
  await page.route('https://api.languagetool.org/v2/check', async (route) => {
    requests++;
    const text = new URLSearchParams(route.request().postData()!).get('text')!;
    await route.fulfill({
      json: {
        matches: text.startsWith('She go ')
          ? [
              {
                message: 'The pronoun She needs a third-person verb.',
                offset: 4,
                length: 2,
                replacements: [{ value: 'goes' }],
                rule: { id: 'SUBJECT_VERB', category: { name: 'Grammar' } },
              },
            ]
          : [],
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Learning' }).click();
  await page.getByRole('button', { name: 'Skip word', exact: true }).click();
  const word = (await page.locator('.word-heading h2').innerText()).trim().toLowerCase();
  const sentence = `She go to school and uses the word ${word}.`;
  await page.getByRole('textbox', { name: 'Your response' }).fill(sentence);
  await page.getByRole('button', { name: 'Check answer' }).click();
  const result = page.getByRole('region', { name: 'Grammar check results' });
  await expect(result).toContainText('third-person verb');
  await expect(result).toContainText('She goes to school');
  await page.screenshot({
    path: testInfo.outputPath('grammar-suggestions.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await expect(page.locator('.session-word-chips > span')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next word', exact: true })).toHaveCount(0);
  await result.getByRole('button', { name: 'Use suggested sentence' }).click();
  await expect(page.getByRole('textbox', { name: 'Your response' })).toHaveValue(
    sentence.replace('She go ', 'She goes '),
  );
  await page.clock.fastForward(4000); // Respect the client's documented request spacing.
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(result).toContainText('No writing issues found');
  await expect(page.getByRole('button', { name: 'Next word', exact: true })).toBeVisible();
  await expect(page.locator('.session-word-chips > span')).toHaveCount(1);
  expect(requests).toBe(2);
});

test('a rate-limited API never becomes a successful grammar result', async ({ page }) => {
  await page.route('https://api.languagetool.org/v2/check', (route) =>
    route.fulfill({ status: 429, json: { error: 'rate limit' } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Learning' }).click();
  await page.getByRole('button', { name: 'Skip word', exact: true }).click();
  const word = (await page.locator('.word-heading h2').innerText()).trim().toLowerCase();
  await page.getByRole('textbox', { name: 'Your response' }).fill(`I like the word ${word}.`);
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('region', { name: 'Grammar check results' })).toContainText(
    'Grammar not checked',
  );
  await expect(page.getByRole('region', { name: 'Grammar check results' })).toContainText(
    'Wait a minute',
  );
  await expect(page.locator('.session-word-chips > span')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next word', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Skip word', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Grammar check results' })).toHaveCount(0);
});
