import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { GrammarResult } from '../lib/grammar';
import { checkGrammar } from '../lib/grammar';
import { useGrammarCheck } from './useGrammarCheck';
vi.mock('../lib/grammar', () => ({ checkGrammar: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('ignores a late grammar response after navigation cancels the request', async () => {
  let resolve!: (result: GrammarResult) => void;
  vi.mocked(checkGrammar).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { result } = renderHook(useGrammarCheck);
  let pending!: Promise<GrammarResult | null>;
  act(() => {
    pending = result.current.check('I feel brave today.');
  });
  expect(result.current.isChecking).toBe(true);
  act(() => result.current.cancel());
  await act(async () => {
    resolve({ status: 'checked', text: 'I feel brave today.', issues: [] });
    expect(await pending).toBe(null);
  });
  expect(result.current.isChecking).toBe(false);
  expect(vi.mocked(checkGrammar).mock.calls[0][1].aborted).toBe(true);
});
