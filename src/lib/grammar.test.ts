import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { correctedSentence, parseGrammarResponse, type GrammarIssue } from './grammar';

const match = {
  message: 'Use a third-person verb.',
  offset: 4,
  length: 2,
  replacements: [{ value: 'goes' }],
  rule: { id: 'AGREEMENT', category: { name: 'Grammar' } },
};
describe('grammar responses and suggestions', () => {
  it('preserves the real explanation, original offsets, and suggested wording', () => {
    const result = parseGrammarResponse({ matches: [match] }, 'She go to school.');
    expect(result.status).toBe('checked');
    if (result.status !== 'checked') throw new Error('Expected checked result');
    expect(result.issues[0].replacements).toEqual(['goes']);
    expect(correctedSentence(result.text, result.issues)).toBe('She goes to school.');
  });
  it('never treats invalid or incomplete responses as a clean sentence', () => {
    for (const data of [
      {},
      { matches: null },
      { matches: [], warnings: { incompleteResults: true } },
      { matches: [{ ...match, offset: 999 }] },
    ])
      expect(() => parseGrammarResponse(data, 'She go to school.')).toThrow();
  });
  it('applies nonoverlapping changes right to left so original offsets remain valid', () => {
    const issues: GrammarIssue[] = [
      { message: '', offset: 0, length: 4, replacements: ['These'], category: '', ruleId: '' },
      { message: '', offset: 5, length: 2, replacements: ['are'], category: '', ruleId: '' },
    ];
    expect(correctedSentence('This is good.', issues)).toBe('These are good.');
  });
});

describe('free grammar API client (mocked HTTP)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(100000);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('POSTs only submitted text, uses no credentials, and caches repeated checks', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ matches: [match] }) });
    vi.stubGlobal('fetch', fetcher);
    const { checkGrammar, GRAMMAR_ENDPOINT } = await import('./grammar');
    const signal = new AbortController().signal;
    const result = await checkGrammar('She go to school.', signal);
    expect(result.status).toBe('checked');
    const [endpoint, request] = fetcher.mock.calls[0];
    expect(endpoint).toBe(GRAMMAR_ENDPOINT);
    expect(request.method).toBe('POST');
    expect(request.body.get('text')).toBe('She go to school.');
    expect(request.credentials).toBe('omit');
    await checkGrammar('She go to school.', signal);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('keeps network failures and rate limits explicitly unchecked without auto-retrying', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Network error'))
      .mockResolvedValue({ status: 429, ok: false });
    vi.stubGlobal('fetch', fetcher);
    const { checkGrammar } = await import('./grammar');
    expect((await checkGrammar('I feel curious today.', new AbortController().signal)).status).toBe(
      'unavailable',
    );
    vi.advanceTimersByTime(4000);
    expect((await checkGrammar('I feel brave today.', new AbortController().signal)).status).toBe(
      'unavailable',
    );
    vi.advanceTimersByTime(4000);
    await checkGrammar('I feel calm today.', new AbortController().signal);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not send canceled work', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const { checkGrammar } = await import('./grammar');
    const controller = new AbortController();
    controller.abort();
    await expect(checkGrammar('I am curious today.', controller.signal)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
