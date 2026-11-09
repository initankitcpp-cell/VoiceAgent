import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      configurable: true,
    });
  });
  await page.route('https://api.languagetool.org/v2/check', (route) =>
    route.fulfill({ json: { matches: [] } }),
  );
  await page.route('**/api/localize', (route) =>
    route.fulfill({ status: 503, json: { error: 'Unconfigured test service' } }),
  );
});

test('onboards once, preserves existing progress, and switches bilingual instructions in place', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('voca-progress-v1'))
      localStorage.setItem(
        'voca-progress-v1',
        JSON.stringify({ version: 1, learned: ['curious'], recent: ['curious'], sessions: [] }),
      );
  });
  await page.goto('/');
  await expect(page.locator('.onboarding')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search languages' }).fill('Kannada');
  await page.getByRole('button', { name: 'Kannada ಕನ್ನಡ', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Kannada' }).click();
  await page.getByRole('button', { name: /Intermediate/ }).click();
  await page.getByRole('button', { name: 'Start my English journey' }).click();
  await page.reload();
  await expect(page.locator('.onboarding')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start Learning' }).click();
  await expect(page.locator('.native-meaning-card[lang="kn-IN"]')).toBeVisible();
  expect(await page.locator('.conversation-messages p[lang="kn-IN"]').count()).toBeGreaterThan(0);
  await expect(page.locator('.audio-support-row')).toContainText('text only');
  const word = await page.locator('.word-heading h2').innerText();
  await page.getByRole('button', { name: 'Settings · Change Language' }).click();
  await page.getByRole('textbox', { name: 'Search languages' }).fill('Hindi');
  await page.getByRole('button', { name: 'Hindi हिन्दी', exact: true }).click();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.locator('.word-heading h2')).toHaveText(word);
  await expect(page.locator('.native-meaning-card[lang="hi-IN"]')).toBeVisible();
  await page.getByRole('combobox', { name: 'Practice mode' }).selectOption('translate');
  await expect(page.locator('.context-practice p[lang="hi-IN"]')).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Your response' })
    .fill('I would like to improve my English.');
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByText('Practice check passed.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Hindi help', exact: true }).click();
  await page.getByRole('textbox', { name: 'Hindi help request' }).fill('अर्थ');
  await page.getByRole('button', { name: 'Ask for help' }).click();
  const saved = await page.evaluate(() => ({
    settings: JSON.parse(localStorage.getItem('voca-settings-v1')!),
    progress: JSON.parse(localStorage.getItem('voca-progress-v1')!),
  }));
  expect(saved.settings.languageId).toBe('hi');
  expect(saved.settings.level).toBe('Intermediate');
  expect(saved.progress.learned).toEqual(['curious']);
});

test('unsupported localization is explicitly English and works on a phone', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.language-card')).toHaveCount(23);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('language-onboarding-mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('textbox', { name: 'Search languages' }).fill('Bengali');
  await page.getByRole('button', { name: 'Bengali বাংলা', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Bengali' }).click();
  await page.getByRole('button', { name: 'Start my English journey' }).click();
  await page.getByRole('button', { name: 'Start Learning' }).click();
  await expect(page.locator('.language-support')).toContainText('not configured');
  await expect(page.locator('.language-support')).toContainText('English explanations');
  await expect(page.locator('.native-meaning-card')).toHaveCount(0);
  const word = (await page.locator('.word-heading h2').innerText()).trim();
  await page.getByRole('textbox', { name: 'Your response' }).fill(word);
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByText('Word check passed.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
