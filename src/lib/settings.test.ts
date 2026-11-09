import { beforeEach, expect, it, vi } from 'vitest';
import { defaultSettings, readSettings, saveSettings, SETTINGS_KEY } from './settings';
beforeEach(() => localStorage.clear());
it('saves native language and level and skips onboarding on return', () => {
  const settings = {
    ...defaultSettings(),
    languageId: 'kn',
    level: 'Intermediate' as const,
    onboarded: true,
  };
  expect(saveSettings(settings)).toBe('');
  expect(readSettings()).toEqual(settings);
});
it('keeps existing progress unchanged when a language preference changes', () => {
  const original = JSON.stringify({ learned: ['curious'], sessions: [{ id: 'earlier' }] });
  localStorage.setItem('voca-progress-v1', original);
  saveSettings({ ...defaultSettings(), languageId: 'mr', onboarded: true });
  expect(localStorage.getItem('voca-progress-v1')).toBe(original);
});
it('recovers from invalid preference data without accepting unknown languages', () => {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...defaultSettings(), languageId: 'invented' }),
  );
  expect(readSettings().onboarded).toBe(false);
  localStorage.setItem(SETTINGS_KEY, '{broken');
  expect(readSettings()).toEqual(defaultSettings());
});
it('reports unavailable storage without preventing onboarding completion', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Blocked');
  });
  expect(saveSettings(defaultSettings())).toContain('could not be saved');
});
