import { languages } from '../data/languages';
import { categories, type CategoryId } from '../data/categories';
import { levels, type Level } from '../data/vocabulary';

export interface LearnerSettings {
  version: 1;
  onboarded: boolean;
  languageId: string;
  level: Level;
  category: CategoryId;
}
export const SETTINGS_KEY = 'voca-settings-v1';
export const defaultSettings = (): LearnerSettings => ({
  version: 1,
  onboarded: false,
  languageId: 'hi',
  level: 'Beginner',
  category: 'general',
});
export function readSettings(): LearnerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const settings = JSON.parse(raw);
    if (
      settings.version !== 1 ||
      typeof settings.onboarded !== 'boolean' ||
      !languages.some((language) => language.id === settings.languageId) ||
      !levels.includes(settings.level) ||
      !categories.some((category) => category.id === settings.category)
    )
      return defaultSettings();
    return settings;
  } catch {
    return defaultSettings();
  }
}
export function saveSettings(settings: LearnerSettings): string {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return '';
  } catch {
    return 'Your language preference could not be saved. Your existing progress is unchanged; onboarding may appear again next time.';
  }
}
