import { describe, expect, it } from 'vitest';
import { vocabulary } from '../data/vocabulary';
import { languages } from '../data/languages';
import { bundledLesson, parseLocalizedLesson } from './localization';
import { localizedIntroduction } from './tutorLocalization';
import { selectVoice } from './voiceLocales';
import { validateResponse, initialSession, sessionReducer } from './engine';

describe('language catalog and bundled lessons', () => {
  it('configures all 22 requested Indian languages plus an English fallback', () => {
    expect(languages).toHaveLength(23);
    expect(new Set(languages.map((language) => language.id)).size).toBe(23);
    for (const language of languages) expect(() => new Intl.Locale(language.locale)).not.toThrow();
  });
  it('loads complete native fields for all 60 words in Hindi, Marathi, and Kannada', () => {
    for (const id of ['hi', 'mr', 'kn'])
      for (const word of vocabulary) {
        const lesson = bundledLesson(word, id, 'interviews');
        expect(lesson).not.toBe(null);
        expect(
          parseLocalizedLesson(
            lesson,
            { languageId: id, wordId: word.id, categoryId: 'interviews' },
            'bundled',
          ).source,
        ).toBe('bundled');
        expect(lesson?.nativePractice.length).toBeGreaterThan(8);
      }
  });
  it('does not fabricate a bundled translation for another language', () => {
    expect(bundledLesson(vocabulary[0], 'bn', 'general')).toBe(null);
    expect(bundledLesson(vocabulary[0], 'en', 'general')).toBe(null);
  });
  it('rejects untranslated English, wrong identities, and missing instructions', () => {
    const word = vocabulary[0];
    const lesson = bundledLesson(word, 'hi', 'general')!;
    const expected = { languageId: 'hi', wordId: word.id, categoryId: 'general' as const };
    expect(() =>
      parseLocalizedLesson({ ...lesson, nativeMeaning: word.meaning }, expected),
    ).toThrow();
    expect(() => parseLocalizedLesson({ ...lesson, wordId: 'wrong' }, expected)).toThrow();
    expect(() => parseLocalizedLesson({ ...lesson, copy: {} }, expected)).toThrow();
  });
  it('preserves English words and examples while marking native segments with their locale', () => {
    const word = vocabulary[0];
    const parts = localizedIntroduction(word, 'sentence', bundledLesson(word, 'kn', 'general'));
    expect(parts.some((part) => part.lang === 'kn-IN')).toBe(true);
    expect(parts.find((part) => part.text === word.example)?.lang).toBe('en-IN');
    expect(parts.find((part) => part.text.includes("Today's word"))?.lang).toBe('en-IN');
  });
});

describe('voice matching', () => {
  it('returns no native voice when only another language is installed', () => {
    const voices = [{ lang: 'en-IN', name: 'English' }] as SpeechSynthesisVoice[];
    expect(selectVoice(voices, 'kn-IN')).toBe(null);
  });
  it('does not replace one script with a different script of the same language', () => {
    expect(selectVoice([{ lang: 'ks-Deva-IN' } as SpeechSynthesisVoice], 'ks-Arab-IN')).toBe(null);
  });
});

describe('extended exercises', () => {
  it('checks reference translations without claiming to understand alternative meaning', () => {
    expect(
      validateResponse(vocabulary[0], 'translate', 'I am ready for my interview.', 'interviews')
        .correct,
    ).toBe(true);
    const result = validateResponse(
      vocabulary[0],
      'translate',
      'The interview is something I am prepared for.',
      'interviews',
    );
    expect(result.correct).toBe(false);
    expect(result.message).toContain('Other translations may be valid');
  });
  it('does not award vocabulary credit for an unrelated contextual translation', () => {
    let state = sessionReducer(initialSession, {
      type: 'START',
      words: vocabulary.slice(0, 5),
      now: 1,
      categoryId: 'interviews',
    });
    state = sessionReducer(state, { type: 'SET_EXERCISE', exercise: 'translate' });
    state = sessionReducer(state, { type: 'SUBMIT', response: 'I am ready for my interview.' });
    expect(state.accepted).toBe(true);
    expect(state.practiced).toEqual([]);
    expect(state.index).toBe(0);
  });
});
