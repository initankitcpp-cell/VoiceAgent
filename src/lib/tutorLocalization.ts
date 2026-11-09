import { languageById } from '../data/languages';
import { promptFor, normalize, type SessionFeedback } from './engine';
import type { Exercise, Word } from '../data/vocabulary';
import type { LocalizedLesson } from './localization';
import type { SpeechSegment } from './voiceLocales';
import { grammarLearningNote } from '../data/learningSupport';

export function localizedPrompt(
  lesson: LocalizedLesson | null,
  word: Word,
  exercise: Exercise,
): SpeechSegment[] {
  const english: SpeechSegment = { text: promptFor(word, exercise), lang: 'en-IN' };
  if (!lesson) return [english];
  const key =
    exercise === 'repeat'
      ? 'repeat'
      : exercise === 'meaning'
        ? 'meaning'
        : exercise === 'translate'
          ? 'translate'
          : exercise === 'conversation'
            ? 'conversation'
            : 'sentence';
  return [{ text: lesson.copy[key], lang: languageById(lesson.languageId).locale }, english];
}
export function localizedIntroduction(
  word: Word,
  exercise: Exercise,
  lesson: LocalizedLesson | null,
): SpeechSegment[] {
  if (!lesson)
    return [
      {
        text: `Today's word is ${word.word}. ${word.meaning} Example: ${word.example} ${promptFor(word, exercise)}`,
        lang: 'en-IN',
      },
    ];
  const locale = languageById(lesson.languageId).locale;
  return [
    { text: lesson.copy.greeting, lang: locale },
    { text: `Today's word is ${word.word}.`, lang: 'en-IN' },
    { text: `${lesson.nativeMeaning}. ${lesson.nativeExplanation}`, lang: locale },
    { text: lesson.copy.exampleLabel, lang: locale },
    { text: word.example, lang: 'en-IN' },
    ...localizedPrompt(lesson, word, exercise),
  ];
}
export function localizedFeedback(
  feedback: SessionFeedback,
  word: Word,
  exercise: Exercise,
  response: string,
  lesson: LocalizedLesson | null,
): SpeechSegment[] {
  const english: SpeechSegment = { text: feedback.message, lang: 'en-IN' };
  if (!lesson) return [english];
  const copy = lesson.copy;
  const tokens = normalize(response);
  let text: string;
  if (!tokens.length) text = copy.empty;
  else if (exercise === 'translate')
    text = feedback.correct ? copy.translationPass : copy.translationMismatch;
  else if (exercise === 'meaning') text = feedback.correct ? copy.meaningPass : copy.meaningRetry;
  else if (exercise !== 'conversation' && !tokens.includes(word.id)) text = copy.missingWord;
  else if (exercise !== 'repeat' && tokens.length < 4) text = copy.short;
  else if (exercise === 'repeat') text = copy.repeatPass;
  else if (feedback.grammar?.status === 'unavailable' || !feedback.grammar)
    text = copy.grammarUnavailable;
  else if (feedback.grammar.issues.length)
    text = `${copy.grammarIssues} ${grammarLearningNote(feedback.grammar.issues[0], lesson.languageId) ?? ''}`;
  else text = exercise === 'conversation' ? copy.conversationPass : copy.grammarPass;
  return [{ text, lang: languageById(lesson.languageId).locale }, english];
}
