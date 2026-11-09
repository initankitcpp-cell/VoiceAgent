import { bilingualWords } from '../data/bilingual';
import { categoryById, type CategoryId } from '../data/categories';
import { languageById, type BundledLanguageId } from '../data/languages';
import { tutorCopy, type TutorCopy } from '../data/tutorCopy';
import type { Word } from '../data/vocabulary';

export interface LocalizedLesson {
  version: 1;
  languageId: string;
  wordId: string;
  categoryId: CategoryId;
  source: 'bundled' | 'ai';
  nativeMeaning: string;
  nativeExplanation: string;
  nativeHint: string;
  nativePractice: string;
  nativeExample?: string;
  copy: TutorCopy;
}
export const localizationCopyKeys = Object.keys(tutorCopy.hi) as (keyof TutorCopy)[];
const scriptRanges: Record<string, RegExp> = {
  Deva: /[\u0900-\u097f]/u,
  Knda: /[\u0c80-\u0cff]/u,
  Taml: /[\u0b80-\u0bff]/u,
  Telu: /[\u0c00-\u0c7f]/u,
  Mlym: /[\u0d00-\u0d7f]/u,
  Beng: /[\u0980-\u09ff]/u,
  Gujr: /[\u0a80-\u0aff]/u,
  Guru: /[\u0a00-\u0a7f]/u,
  Orya: /[\u0b00-\u0b7f]/u,
  Arab: /[\u0600-\u06ff]/u,
  Mtei: /[\uabc0-\uabff]/u,
  Olck: /[\u1c50-\u1c7f]/u,
};
export function bundledLesson(
  word: Word,
  languageId: string,
  categoryId: CategoryId,
): LocalizedLesson | null {
  if (!(languageId in tutorCopy)) return null;
  const id = languageId as BundledLanguageId;
  const entry = bilingualWords[word.id]?.[id];
  if (!entry) return null;
  return {
    version: 1,
    languageId,
    wordId: word.id,
    categoryId,
    source: 'bundled',
    nativeMeaning: entry[0],
    nativeExplanation: entry[1],
    nativeHint: tutorCopy[id].hint,
    nativePractice: categoryById(categoryId).phrase[id],
    copy: tutorCopy[id],
  };
}
export function parseLocalizedLesson(
  value: unknown,
  expected: { languageId: string; wordId: string; categoryId: CategoryId },
  source: 'bundled' | 'ai' = 'ai',
): LocalizedLesson {
  if (!value || typeof value !== 'object') throw new Error('Missing localized lesson');
  const data = value as Record<string, unknown>;
  const language = languageById(expected.languageId);
  if (
    language.id !== expected.languageId ||
    language.id === 'en' ||
    data.version !== 1 ||
    data.languageId !== expected.languageId ||
    data.wordId !== expected.wordId ||
    data.categoryId !== expected.categoryId
  )
    throw new Error('Lesson identity mismatch');
  const native = (text: unknown): text is string =>
    typeof text === 'string' &&
    text.trim().length >= 2 &&
    text.length <= 1800 &&
    !!scriptRanges[language.script]?.test(text);
  for (const field of ['nativeMeaning', 'nativeExplanation', 'nativeHint', 'nativePractice'])
    if (!native(data[field])) throw new Error(`Invalid native-language field: ${field}`);
  if (data.nativeExample !== undefined && !native(data.nativeExample))
    throw new Error('Invalid example translation');
  if (!data.copy || typeof data.copy !== 'object') throw new Error('Missing tutor instructions');
  for (const key of localizationCopyKeys)
    if (!native((data.copy as Record<string, unknown>)[key]))
      throw new Error(`Invalid instruction: ${key}`);
  return {
    version: 1,
    ...expected,
    source,
    nativeMeaning: data.nativeMeaning as string,
    nativeExplanation: data.nativeExplanation as string,
    nativeHint: data.nativeHint as string,
    nativePractice: data.nativePractice as string,
    nativeExample: data.nativeExample as string | undefined,
    copy: Object.fromEntries(
      localizationCopyKeys.map((key) => [key, (data.copy as Record<string, string>)[key]]),
    ) as unknown as TutorCopy,
  };
}

const cache = new Map<string, LocalizedLesson>();
export function cachedLesson(word: Word, languageId: string, categoryId: CategoryId) {
  return (
    bundledLesson(word, languageId, categoryId) ??
    cache.get(`${languageId}:${word.id}:${categoryId}`) ??
    null
  );
}
export async function loadLocalizedLesson(
  word: Word,
  languageId: string,
  categoryId: CategoryId,
  signal: AbortSignal,
): Promise<LocalizedLesson> {
  const bundled = cachedLesson(word, languageId, categoryId);
  if (bundled) return bundled;
  const response = await fetch('/api/localize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ languageId, wordId: word.id, categoryId }),
    signal,
  });
  if (!response.ok) {
    if (response.status === 503)
      throw new Error(
        'AI localization is not configured. Continue with English explanations, or choose Hindi, Marathi, or Kannada in Settings.',
      );
    if (response.status === 429)
      throw new Error(
        'The localization service has reached its request limit. English explanations remain available.',
      );
    throw new Error(
      'The localization service is unavailable. Continue with clearly labeled English explanations or change language.',
    );
  }
  const lesson = parseLocalizedLesson(await response.json(), {
    languageId,
    wordId: word.id,
    categoryId,
  });
  if (cache.size >= 150) cache.delete(cache.keys().next().value!);
  cache.set(`${languageId}:${word.id}:${categoryId}`, lesson);
  return lesson;
}
