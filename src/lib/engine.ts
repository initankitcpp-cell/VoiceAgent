import { type Exercise, type Level, type Word, vocabulary } from '../data/vocabulary';
import type { GrammarResult } from './grammar';
import { categoryById, type CategoryId } from '../data/categories';
import type { SpeechSegment } from './voiceLocales';

export const normalize = (value: string): string[] =>
  value
    .toLocaleLowerCase('en-US')
    .replace(/[’']/g, '')
    .match(/[a-z]+/g) ?? [];
export function validateResponse(
  word: Word,
  exercise: Exercise,
  response: string,
  categoryId: CategoryId = 'general',
): { correct: boolean; message: string } {
  const tokens = normalize(response);
  if (!tokens.length)
    return {
      correct: false,
      message: 'I didn’t catch any words. Try again or type your answer below.',
    };
  if (exercise === 'translate') {
    const category = categoryById(categoryId);
    const answer = tokens.join(' ');
    const correct = [category.answer, ...category.alternatives].some(
      (example) => normalize(example).join(' ') === answer,
    );
    return {
      correct,
      message: correct
        ? 'Your answer matches an accepted reference translation. Nice work!'
        : `Your answer differs from the reference translations. Other translations may be valid, but this guided check only recognizes the supplied examples. One reference is: ${category.answer}`,
    };
  }
  if (exercise === 'conversation')
    return tokens.length >= 4
      ? {
          correct: true,
          message:
            'Your response has at least four words. Grammar checking is next; relevance is not assessed.',
        }
      : { correct: false, message: 'Try an English answer of at least four words.' };
  if (exercise === 'meaning') {
    const correct = response === word.meaning;
    return {
      correct,
      message: correct
        ? 'That’s the right meaning. Nicely done!'
        : 'Not quite. Read the meaning above, then give it another try.',
    };
  }
  if (!tokens.includes(word.id))
    return {
      correct: false,
      message: `I couldn’t find “${word.word.toLowerCase()}” in that response. Try including the exact word. Speech recognition can sometimes miss it.`,
    };
  if (exercise === 'sentence' && tokens.length < 4)
    return {
      correct: false,
      message: `You included “${word.word.toLowerCase()}”. Now expand it into a sentence with at least four words.`,
    };
  return {
    correct: true,
    message:
      exercise === 'repeat'
        ? `I found “${word.word.toLowerCase()}” in your response. Nice work! This checks the recognized text, not pronunciation.`
        : `You used “${word.word.toLowerCase()}” in a response of at least four words. Vocabulary check passed.`,
  };
}

export function selectWords(level: Level, recentIds: string[], random = Math.random): Word[] {
  const pool = vocabulary.filter((word) => word.level === level);
  // Least-recently completed words come after unseen words; shuffle only within unseen pool.
  const unseen = pool.filter((word) => !recentIds.includes(word.id));
  for (let i = unseen.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [unseen[i], unseen[j]] = [unseen[j], unseen[i]];
  }
  const seen = pool
    .filter((word) => recentIds.includes(word.id))
    .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
  return [...unseen, ...seen].slice(0, 5);
}

export const exerciseFor = (index: number): Exercise =>
  (['repeat', 'sentence', 'meaning', 'sentence', 'repeat'] as const)[index % 5];
export const promptFor = (word: Word, exercise: Exercise) =>
  exercise === 'translate'
    ? 'Translate the displayed native-language sentence into English.'
    : exercise === 'conversation'
      ? 'Answer the English question in at least four English words.'
      : exercise === 'repeat'
        ? `Your turn. Say “${word.word.toLowerCase()}”, or type it below.`
        : exercise === 'sentence'
          ? `Your turn. Use “${word.word.toLowerCase()}” in a sentence of at least four words.`
          : `Your turn. Choose the correct meaning of “${word.word.toLowerCase()}”.`;
export const introduction = (word: Word, index: number) =>
  `${index === 0 ? 'Hi, I’m Voca. Let’s find your words together.' : ['', 'Lovely. Let’s build on that.', 'Ready for a new word?', 'You’re making time for yourself. Keep going!', 'One more word. You’ve got this.'][index]} Our ${index === 0 ? 'first' : 'next'} word is ${word.word}. ${word.meaning} For example: ${word.example} ${promptFor(word, exerciseFor(index))}`;

export interface Message {
  id: number;
  role: 'tutor' | 'user';
  text: string;
  parts?: SpeechSegment[];
}
export interface SessionFeedback {
  correct: boolean;
  message: string;
  grammar?: GrammarResult;
}

export function evaluateResponse(
  word: Word,
  exercise: Exercise,
  response: string,
  grammar?: GrammarResult,
  categoryId: CategoryId = 'general',
): SessionFeedback {
  const local = validateResponse(word, exercise, response, categoryId);
  if (!local.correct || !['sentence', 'conversation'].includes(exercise)) return local;
  if (!grammar || grammar.text !== response)
    return {
      correct: false,
      message: 'Vocabulary check passed. Grammar has not been checked for this sentence yet.',
    };
  if (grammar.status === 'unavailable')
    return {
      correct: false,
      grammar,
      message: `Your vocabulary check passed, but grammar could not be checked. ${grammar.message}`,
    };
  if (grammar.issues.length)
    return {
      correct: false,
      grammar,
      message: `You included “${word.word.toLowerCase()}”. LanguageTool found ${grammar.issues.length} writing ${grammar.issues.length === 1 ? 'issue' : 'issues'}. ${grammar.issues[0].message} Review the suggestions and try your sentence again.`,
    };
  return {
    correct: true,
    grammar,
    message:
      exercise === 'conversation'
        ? 'Good practice! Your response passed the length check, and LanguageTool found no writing issues. Relevance to the question is not assessed; automated checks may miss mistakes.'
        : `Nice work! You used “${word.word.toLowerCase()}”, and LanguageTool found no grammar, spelling, or punctuation issues in this sentence. Automated checks can still miss mistakes.`,
  };
}

export interface SessionState {
  phase: 'welcome' | 'practice' | 'quiz' | 'summary';
  words: Word[];
  index: number;
  messages: Message[];
  accepted: boolean;
  practiced: string[];
  feedback: SessionFeedback | null;
  quizIndex: number;
  quizAnswers: number[];
  startedAt: number;
  exercise: Exercise;
  categoryId: CategoryId;
}
export const initialSession: SessionState = {
  phase: 'welcome',
  words: [],
  index: 0,
  messages: [],
  accepted: false,
  practiced: [],
  feedback: null,
  quizIndex: 0,
  quizAnswers: [],
  startedAt: 0,
  exercise: 'repeat',
  categoryId: 'general',
};
export type SessionAction =
  | { type: 'START'; words: Word[]; now: number; categoryId?: CategoryId; intro?: SpeechSegment[] }
  | { type: 'SUBMIT'; response: string; grammar?: GrammarResult; feedbackParts?: SpeechSegment[] }
  | { type: 'HINT'; parts?: SpeechSegment[] }
  | { type: 'NEXT'; intro?: SpeechSegment[] }
  | { type: 'SET_EXERCISE'; exercise: Exercise; parts?: SpeechSegment[] }
  | { type: 'ADD_MESSAGE'; role: 'tutor' | 'user'; parts: SpeechSegment[] }
  | { type: 'ANSWER'; answer: number }
  | { type: 'QUIZ_NEXT' }
  | { type: 'RESET' };
const append = (messages: Message[], role: Message['role'], text: string) => [
  ...messages,
  { id: (messages.at(-1)?.id ?? 0) + 1, role, text },
];
export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'START':
      return {
        ...initialSession,
        phase: 'practice',
        words: action.words,
        startedAt: action.now,
        categoryId: action.categoryId ?? 'general',
        messages: [
          {
            id: 1,
            role: 'tutor',
            text:
              action.intro?.map((part) => part.text).join('\n') ?? introduction(action.words[0], 0),
            parts: action.intro,
          },
        ],
      };
    case 'SUBMIT': {
      if (state.phase !== 'practice' || state.accepted) return state;
      const word = state.words[state.index];
      const feedback = evaluateResponse(
        word,
        state.exercise,
        action.response,
        action.grammar,
        state.categoryId,
      );
      return {
        ...state,
        feedback,
        accepted: feedback.correct,
        practiced:
          feedback.correct && !['translate', 'conversation'].includes(state.exercise)
            ? [...new Set([...state.practiced, word.id])]
            : state.practiced,
        messages: [
          ...append(state.messages, 'user', action.response),
          {
            id: (state.messages.at(-1)?.id ?? 0) + 2,
            role: 'tutor',
            text: action.feedbackParts?.map((part) => part.text).join('\n') ?? feedback.message,
            parts: action.feedbackParts,
          },
        ],
      };
    }
    case 'HINT':
      return state.phase === 'practice'
        ? {
            ...state,
            messages: [
              ...state.messages,
              {
                id: (state.messages.at(-1)?.id ?? 0) + 1,
                role: 'tutor',
                text:
                  action.parts?.map((part) => part.text).join('\n') ??
                  state.words[state.index].hint,
                parts: action.parts,
              },
            ],
          }
        : state;
    case 'NEXT': {
      if (state.phase !== 'practice') return state;
      if (state.index === 4) return { ...state, phase: 'quiz', feedback: null };
      const index = state.index + 1;
      return {
        ...state,
        index,
        exercise: exerciseFor(index),
        accepted: false,
        feedback: null,
        messages: [
          ...state.messages,
          {
            id: (state.messages.at(-1)?.id ?? 0) + 1,
            role: 'tutor',
            text:
              action.intro?.map((part) => part.text).join('\n') ??
              introduction(state.words[index], index),
            parts: action.intro,
          },
        ],
      };
    }
    case 'SET_EXERCISE':
      return state.phase === 'practice'
        ? {
            ...state,
            exercise: action.exercise,
            accepted: false,
            feedback: null,
            messages: action.parts
              ? [
                  ...state.messages,
                  {
                    id: (state.messages.at(-1)?.id ?? 0) + 1,
                    role: 'tutor',
                    text: action.parts.map((part) => part.text).join('\n'),
                    parts: action.parts,
                  },
                ]
              : state.messages,
          }
        : state;
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: (state.messages.at(-1)?.id ?? 0) + 1,
            role: action.role,
            text: action.parts.map((part) => part.text).join('\n'),
            parts: action.parts,
          },
        ],
      };
    case 'ANSWER':
      return state.phase === 'quiz' &&
        state.quizAnswers.length === state.quizIndex &&
        action.answer >= 0 &&
        action.answer < state.words[state.quizIndex].quiz.options.length
        ? { ...state, quizAnswers: [...state.quizAnswers, action.answer] }
        : state;
    case 'QUIZ_NEXT':
      return state.phase === 'quiz' && state.quizAnswers.length > state.quizIndex
        ? {
            ...state,
            quizIndex: Math.min(state.quizIndex + 1, 4),
            phase: state.quizIndex === 4 ? 'summary' : 'quiz',
          }
        : state;
    case 'RESET':
      return initialSession;
  }
}
