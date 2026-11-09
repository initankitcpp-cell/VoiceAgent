import { describe, expect, it } from 'vitest';
import { levels, vocabulary } from '../data/vocabulary';
import {
  exerciseFor,
  initialSession,
  selectWords,
  sessionReducer,
  validateResponse,
  evaluateResponse,
} from './engine';

describe('curated vocabulary', () => {
  it('provides 60 unique complete entries, 20 per level, with correct nonduplicate quiz choices', () => {
    expect(vocabulary).toHaveLength(60);
    expect(new Set(vocabulary.map((w) => w.id)).size).toBe(60);
    for (const level of levels)
      expect(vocabulary.filter((w) => w.level === level)).toHaveLength(20);
    for (const word of vocabulary) {
      expect(word.meaning.length).toBeGreaterThan(15);
      expect(word.example.toLowerCase()).toContain(word.id);
      expect(word.hint.length).toBeGreaterThan(15);
      expect(word.quiz.options[word.quiz.answer]).toBe(word.meaning);
      expect(new Set(word.quiz.options).size).toBe(3);
    }
  });
});
describe('response validation', () => {
  const word = vocabulary[0];
  it('checks whole words with case and punctuation normalization', () => {
    expect(validateResponse(word, 'repeat', 'Curious!').correct).toBe(true);
    expect(validateResponse(word, 'repeat', 'curiously').correct).toBe(false);
    expect(validateResponse(word, 'repeat', '??').correct).toBe(false);
  });
  it('requires a target word and at least four words for sentence practice', () => {
    expect(validateResponse(word, 'sentence', 'I am curious.').correct).toBe(false);
    expect(validateResponse(word, 'sentence', 'I am curious about space.').correct).toBe(true);
    expect(validateResponse(word, 'sentence', 'I want to learn more.').correct).toBe(false);
    expect(validateResponse(word, 'sentence', 'I am curious about space.').message).toContain(
      'Vocabulary check passed',
    );
  });
  it('only accepts the correct selected meaning', () => {
    expect(validateResponse(word, 'meaning', word.meaning).correct).toBe(true);
    expect(
      validateResponse(word, 'meaning', word.quiz.options[(word.quiz.answer + 1) % 3]).correct,
    ).toBe(false);
  });
});
describe('word selection', () => {
  it('avoids recently practiced words when enough unseen words are available', () => {
    const recent = vocabulary.slice(0, 15).map((w) => w.id);
    const words = selectWords('Beginner', recent, () => 0.5);
    expect(words).toHaveLength(5);
    expect(new Set(words.map((w) => w.id)).size).toBe(5);
    expect(words.every((w) => !recent.includes(w.id))).toBe(true);
  });
  it('prefers least recently completed words after all words have been seen', () => {
    const recent = vocabulary.slice(0, 20).map((w) => w.id);
    expect(selectWords('Beginner', recent).map((w) => w.id)).toEqual(recent.slice(0, 5));
  });
});
describe('conversation state machine', () => {
  it('completes five exercises and a quiz without accepting duplicate answers', () => {
    const words = vocabulary.slice(0, 5);
    let state = sessionReducer(initialSession, { type: 'START', words, now: 1 });
    for (let i = 0; i < 5; i++) {
      const response =
        exerciseFor(i) === 'meaning' ? words[i].meaning : `I think ${words[i].word} is interesting`;
      state = sessionReducer(state, {
        type: 'SUBMIT',
        response,
        grammar: { status: 'checked', text: response, issues: [] },
      });
      expect(state.accepted).toBe(true);
      expect(sessionReducer(state, { type: 'SUBMIT', response })).toBe(state);
      state = sessionReducer(state, { type: 'NEXT' });
    }
    expect(state.phase).toBe('quiz');
    expect(state.practiced).toHaveLength(5);
    for (let i = 0; i < 5; i++) {
      expect(sessionReducer(state, { type: 'QUIZ_NEXT' })).toBe(state);
      state = sessionReducer(state, { type: 'ANSWER', answer: words[i].quiz.answer });
      expect(sessionReducer(state, { type: 'ANSWER', answer: 0 })).toBe(state);
      state = sessionReducer(state, { type: 'QUIZ_NEXT' });
    }
    expect(state.phase).toBe('summary');
    expect(state.quizAnswers).toHaveLength(5);
    expect(sessionReducer(state, { type: 'NEXT' })).toBe(state);
  });
  it('requires a matching successful grammar check before accepting a sentence', () => {
    const word = vocabulary[0];
    const response = 'I am curious about science.';
    expect(evaluateResponse(word, 'sentence', response).correct).toBe(false);
    expect(
      evaluateResponse(word, 'sentence', response, {
        status: 'checked',
        text: 'different response',
        issues: [],
      }).correct,
    ).toBe(false);
    expect(
      evaluateResponse(word, 'sentence', response, {
        status: 'unavailable',
        text: response,
        message: 'Rate limited',
      }).correct,
    ).toBe(false);
    expect(
      evaluateResponse(word, 'sentence', response, {
        status: 'checked',
        text: response,
        issues: [
          {
            message: 'Fix the verb.',
            offset: 2,
            length: 2,
            replacements: ['was'],
            category: 'Grammar',
            ruleId: 'VERB',
          },
        ],
      }).correct,
    ).toBe(false);
    expect(
      evaluateResponse(word, 'sentence', response, {
        status: 'checked',
        text: response,
        issues: [],
      }).correct,
    ).toBe(true);
  });
  it('does not count skipped or failed responses as practiced', () => {
    let state = sessionReducer(initialSession, {
      type: 'START',
      words: vocabulary.slice(0, 5),
      now: 1,
    });
    state = sessionReducer(state, { type: 'SUBMIT', response: 'unrelated' });
    state = sessionReducer(state, { type: 'NEXT' });
    expect(state.index).toBe(1);
    expect(state.practiced).toEqual([]);
    expect(state.accepted).toBe(false);
    expect(state.feedback).toBe(null);
  });
});
