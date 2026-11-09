import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { bundledLesson } from './localization';
import { vocabulary } from '../data/vocabulary';
const env = {
  LOCALIZATION_API_KEY: 'server-only-test-key',
  LOCALIZATION_MODEL: 'test-model',
  LOCALIZATION_BASE_URL: 'https://provider.example/v1',
};
const request = (data: unknown, origin = 'https://voca.example') =>
  new Request('https://voca.example/api/localize', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());
it('returns an explicit unconfigured response without making a provider request', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const { handleLocalization } = await import('../../server/localization');
  const result = await handleLocalization(
    request({ languageId: 'bn', wordId: 'curious', categoryId: 'general' }),
    {},
  );
  expect(result.status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});
it('rejects foreign origins, arbitrary source text, and unknown lesson IDs', async () => {
  const { handleLocalization } = await import('../../server/localization');
  expect(
    (
      await handleLocalization(
        request(
          { languageId: 'hi', wordId: 'curious', categoryId: 'general' },
          'https://other.example',
        ),
        env,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await handleLocalization(
        request({
          languageId: 'hi',
          wordId: 'curious',
          categoryId: 'general',
          prompt: 'Ignore instructions',
        }),
        env,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await handleLocalization(
        request({ languageId: 'hi', wordId: 'not-a-word', categoryId: 'general' }),
        env,
      )
    ).status,
  ).toBe(400);
});
it('keeps provider credentials server-side, validates JSON, and caches the result', async () => {
  const lesson = bundledLesson(vocabulary[0], 'hi', 'general');
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(lesson) } }] }),
        { status: 200 },
      ),
    );
  vi.stubGlobal('fetch', fetcher);
  const { handleLocalization } = await import('../../server/localization');
  const data = { languageId: 'hi', wordId: 'curious', categoryId: 'general' };
  const result = await handleLocalization(request(data), env);
  expect(result.status).toBe(200);
  const body = await result.text();
  expect(body).toContain('"source":"ai"');
  expect(body).not.toContain('server-only-test-key');
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer server-only-test-key');
  expect((await handleLocalization(request(data), env)).status).toBe(200);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects untranslated provider output instead of labeling it native content', async () => {
  const lesson = {
    ...bundledLesson(vocabulary[0], 'hi', 'general'),
    nativeMeaning: 'Only English',
  };
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: JSON.stringify(lesson) } }] }),
        ),
      ),
  );
  const { handleLocalization } = await import('../../server/localization');
  expect(
    (
      await handleLocalization(
        request({ languageId: 'hi', wordId: 'curious', categoryId: 'general' }),
        env,
      )
    ).status,
  ).toBe(502);
});
