import { levels, vocabulary, type Level } from '../data/vocabulary';
export interface SessionRecord {
  id: string;
  date: string;
  level: Level;
  practiced: string[];
  quizScore: number;
  total: number;
  seconds: number;
}
export interface Progress {
  version: 1;
  learned: string[];
  recent: string[];
  sessions: SessionRecord[];
}
export const STORAGE_KEY = 'voca-progress-v1';
export const emptyProgress = (): Progress => ({
  version: 1,
  learned: [],
  recent: [],
  sessions: [],
});
const validIds = new Set(vocabulary.map((word) => word.id));
const ids = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((id) => typeof id === 'string' && validIds.has(id));
export function readProgress(): { progress: Progress; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { progress: emptyProgress(), warning: '' };
    const p = JSON.parse(raw);
    if (
      p.version !== 1 ||
      !ids(p.learned) ||
      !ids(p.recent) ||
      !Array.isArray(p.sessions) ||
      !p.sessions.every(
        (s: SessionRecord) =>
          s &&
          typeof s.id === 'string' &&
          typeof s.date === 'string' &&
          Number.isFinite(Date.parse(s.date)) &&
          levels.includes(s.level) &&
          ids(s.practiced) &&
          Number.isInteger(s.quizScore) &&
          s.quizScore >= 0 &&
          s.quizScore <= 5 &&
          s.total === 5 &&
          Number.isFinite(s.seconds) &&
          s.seconds >= 0,
      )
    )
      throw new Error('Invalid progress');
    return { progress: p as Progress, warning: '' };
  } catch {
    return {
      progress: emptyProgress(),
      warning:
        'Saved progress could not be read. You can still practice; new progress will be saved if browser storage is available.',
    };
  }
}
export function saveProgress(progress: Progress): string {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return '';
  } catch {
    return 'Your browser could not save progress. Your session still works, but it may be lost when you close this tab.';
  }
}
export function recordSession(progress: Progress, session: SessionRecord): Progress {
  if (progress.sessions.some((item) => item.id === session.id)) return progress;
  return {
    version: 1,
    learned: [...new Set([...progress.learned, ...session.practiced])],
    recent: [
      ...progress.recent.filter((id) => !session.practiced.includes(id)),
      ...session.practiced,
    ],
    sessions: [...progress.sessions, session].slice(-100),
  };
}
