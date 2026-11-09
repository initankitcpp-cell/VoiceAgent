export interface GrammarIssue {
  message: string;
  offset: number;
  length: number;
  replacements: string[];
  category: string;
  ruleId: string;
}

export type GrammarResult =
  | { status: 'checked'; text: string; issues: GrammarIssue[] }
  | { status: 'unavailable'; text: string; message: string };

export const GRAMMAR_ENDPOINT = 'https://api.languagetool.org/v2/check';
const TIMEOUT_MS = 12000;
const MIN_REQUEST_GAP_MS = 3500;
let lastRequestAt = 0;
let rateLimitedUntil = 0;
const cache = new Map<string, GrammarResult>();

function unavailable(text: string, message: string): GrammarResult {
  return { status: 'unavailable', text, message };
}

export function parseGrammarResponse(data: unknown, text: string): GrammarResult {
  if (!data || typeof data !== 'object' || !('matches' in data) || !Array.isArray(data.matches)) {
    throw new Error('Invalid grammar response');
  }
  const payload = data as { matches: unknown[]; warnings?: { incompleteResults?: boolean } };
  if (payload.warnings?.incompleteResults) throw new Error('Incomplete grammar response');
  const issues = payload.matches.map((raw): GrammarIssue => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid match');
    const match = raw as Record<string, unknown>;
    if (
      typeof match.message !== 'string' ||
      !Number.isInteger(match.offset) ||
      !Number.isInteger(match.length) ||
      (match.offset as number) < 0 ||
      (match.length as number) < 0 ||
      (match.offset as number) + (match.length as number) > text.length ||
      !Array.isArray(match.replacements)
    )
      throw new Error('Invalid match');
    const replacements = match.replacements.map((value) => {
      if (
        !value ||
        typeof value !== 'object' ||
        !('value' in value) ||
        typeof value.value !== 'string'
      )
        throw new Error('Invalid suggestion');
      return value.value;
    });
    const rule = match.rule as { id?: unknown; category?: { name?: unknown } } | undefined;
    return {
      message: match.message,
      offset: match.offset as number,
      length: match.length as number,
      replacements: replacements.slice(0, 5),
      category:
        typeof rule?.category?.name === 'string' ? rule.category.name : 'Writing suggestion',
      ruleId: typeof rule?.id === 'string' ? rule.id : '',
    };
  });
  return { status: 'checked', text, issues };
}

export function correctedSentence(text: string, issues: GrammarIssue[]): string {
  let corrected = text;
  let boundary = text.length;
  for (const issue of [...issues].sort((a, b) => b.offset - a.offset)) {
    if (!issue.replacements.length || issue.offset + issue.length > boundary) continue;
    corrected =
      corrected.slice(0, issue.offset) +
      issue.replacements[0] +
      corrected.slice(issue.offset + issue.length);
    boundary = issue.offset;
  }
  return corrected;
}

/** User-submitted sentence checks only. No background polling or automatic retries. */
export async function checkGrammar(text: string, signal: AbortSignal): Promise<GrammarResult> {
  signal.throwIfAborted();
  if (!text.trim() || text.length > 1000)
    return unavailable(text, 'Submit a sentence between 1 and 1,000 characters.');
  const cached = cache.get(text);
  if (cached) return cached;
  if (Date.now() < rateLimitedUntil)
    return unavailable(
      text,
      'LanguageTool is temporarily rate limited. Wait a minute before checking again, or skip this word.',
    );
  if (Date.now() - lastRequestAt < MIN_REQUEST_GAP_MS)
    return unavailable(text, 'Please wait a few seconds before checking another sentence.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  lastRequestAt = Date.now();
  try {
    const response = await fetch(GRAMMAR_ENDPOINT, {
      method: 'POST',
      body: new URLSearchParams({ text, language: 'en-US' }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    });
    if (response.status === 429) {
      rateLimitedUntil = Date.now() + 60000;
      return unavailable(
        text,
        'LanguageTool’s free request limit was reached. Wait a minute before retrying, or skip this word.',
      );
    }
    if (!response.ok)
      return unavailable(
        text,
        'LanguageTool could not check this sentence right now. Try again later, or skip this word.',
      );
    const result = parseGrammarResponse(await response.json(), text);
    signal.throwIfAborted();
    if (cache.size >= 50) cache.delete(cache.keys().next().value!);
    cache.set(text, result);
    return result;
  } catch (error) {
    if (signal.aborted) throw error;
    return unavailable(
      text,
      timedOut
        ? 'The grammar service took too long to respond. Please retry when connected, or skip this word.'
        : 'The grammar service is unavailable or returned an unreadable response. Check your connection and retry, or skip this word.',
    );
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
}
