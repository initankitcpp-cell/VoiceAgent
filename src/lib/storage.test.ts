import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emptyProgress,
  readProgress,
  recordSession,
  saveProgress,
  STORAGE_KEY,
  type SessionRecord,
} from './storage';

beforeEach(() => localStorage.clear());
const session: SessionRecord = {
  id: 'one',
  date: '2026-11-09T12:00:00Z',
  level: 'Beginner',
  practiced: ['curious'],
  quizScore: 4,
  total: 5,
  seconds: 150,
};
describe('local progress', () => {
  it('round trips real results and prevents duplicate session recording', () => {
    const progress = recordSession(emptyProgress(), session);
    expect(saveProgress(progress)).toBe('');
    expect(readProgress().progress).toEqual(progress);
    expect(recordSession(progress, session)).toBe(progress);
  });
  it('recovers from corrupt storage with a visible warning', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(readProgress().progress).toEqual(emptyProgress());
    expect(readProgress().warning).toContain('could not be read');
  });
  it('rejects invalid scores and unknown vocabulary IDs', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...emptyProgress(), sessions: [{ ...session, quizScore: 20 }] }),
    );
    expect(readProgress().warning).not.toBe('');
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...emptyProgress(), learned: ['not-a-real-word'] }),
    );
    expect(readProgress().warning).not.toBe('');
  });
  it('handles disabled browser storage without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(saveProgress(emptyProgress())).toContain('could not save');
  });
});
