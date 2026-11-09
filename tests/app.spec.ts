import { expect, test } from '@playwright/test';
import { vocabulary } from '../src/data/vocabulary';
import { seedReturningLearner } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedReturningLearner(page);
  // Never send automated tests to the public grammar service.
  await page.route('https://api.languagetool.org/v2/check', (route) =>
    route.fulfill({ json: { matches: [] } }),
  );
  // Browser automation cannot verify a real microphone or provider speech service.
  // Disable both APIs here to verify the complete typed fallback independently.
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

test('finishes a five-word session, quizzes, and persists actual results after reload', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Learning' }).click();
  for (let i = 0; i < 5; i++) {
    const wordText = (await page.locator('.word-heading h2').innerText()).trim();
    const word = vocabulary.find((w) => w.word === wordText)!;
    if (i === 2) await page.getByRole('button', { name: word.meaning, exact: true }).click();
    else {
      if (i === 0) {
        await page.getByRole('textbox', { name: 'Your response' }).fill('unrelated');
        await page.getByRole('button', { name: 'Check answer' }).click();
        await expect(page.getByText('Try once more.', { exact: false })).toBeVisible();
      }
      await page
        .getByRole('textbox', { name: 'Your response' })
        .fill(`I think ${word.word.toLowerCase()} is a useful word`);
      await page.clock.fastForward(4000); // Allow the documented interval between grammar submissions.
      await page.getByRole('button', { name: 'Check answer' }).click();
    }
    await expect(page.getByText('Word check passed.', { exact: false })).toBeVisible();
    await expect(page.locator('.session-word-chips > span')).toHaveCount(i + 1);
    await page
      .getByRole('button', { name: i === 4 ? 'Start quiz' : 'Next word', exact: true })
      .click();
  }
  for (let i = 0; i < 5; i++) {
    const question = await page.locator('.quiz-card > h2').innerText();
    const word = vocabulary.find((w) => question.includes(`“${w.id}”`))!;
    await page.getByRole('button', { name: word.meaning, exact: false }).click();
    await page.getByRole('button', { name: i === 4 ? 'See my session' : 'Next question' }).click();
  }
  await expect(page.getByText('quiz answers correct', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('voca-progress-v1')!));
  expect(saved.learned).toHaveLength(5);
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].quizScore).toBe(5);
  await page.reload();
  await page.getByRole('button', { name: 'My progress' }).click();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await expect(page.getByText('5 / 5 correct', { exact: true })).toBeVisible();
});

test('mobile navigation, help, library search, and reset remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'My vocabulary' }).click();
  await page.getByRole('textbox', { name: 'Search vocabulary' }).fill('resilient');
  await expect(page.getByRole('heading', { name: 'Resilient' })).toBeVisible();
  await expect(page.locator('.library-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'How Voca works' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'My progress' }).click();
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await page.getByRole('button', { name: 'Yes, clear progress' }).click();
  await expect(page.getByText('Your completed sessions will appear here.')).toBeVisible();
});

test('skipping words never invents learned words or quiz scores', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Advanced', exact: false }).click();
  await page.getByRole('button', { name: 'Start Learning' }).click();
  for (let i = 0; i < 5; i++) {
    await expect(page.locator('.session-word-chips > span')).toHaveCount(0);
    await page
      .getByRole('button', { name: i === 4 ? 'Start quiz' : 'Skip word', exact: true })
      .click();
  }
  for (let i = 0; i < 5; i++) {
    const question = await page.locator('.quiz-card > h2').innerText();
    const word = vocabulary.find((w) => question.includes(`“${w.id}”`))!;
    const wrong = word.quiz.options[(word.quiz.answer + 1) % 3];
    await page.getByRole('button', { name: wrong, exact: false }).click();
    await page.getByRole('button', { name: i === 4 ? 'See my session' : 'Next question' }).click();
  }
  await expect(page.locator('.word-skipped')).toHaveCount(5);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('voca-progress-v1')!));
  expect(saved.learned).toHaveLength(0);
  expect(saved.sessions[0].quizScore).toBe(0);
});

test('welcome and lesson layouts fit desktop, tablet, and phone viewports', async ({
  page,
}, testInfo) => {
  for (const [label, width, height] of [
    ['desktop', 1440, 1000],
    ['tablet', 820, 1180],
    ['mobile', 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Start Learning' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath(`${label}-welcome.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Start Learning' }).click();
    await expect(page.getByRole('textbox', { name: 'Your response' })).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath(`${label}-lesson.png`),
      fullPage: true,
      animations: 'disabled',
    });
  }
});
