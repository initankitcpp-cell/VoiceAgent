import type { Page } from '@playwright/test';
export async function seedReturningLearner(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('voca-settings-v1'))
      localStorage.setItem(
        'voca-settings-v1',
        JSON.stringify({
          version: 1,
          onboarded: true,
          languageId: 'en',
          level: 'Beginner',
          category: 'general',
        }),
      );
  });
}
