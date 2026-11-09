import { useEffect, useState } from 'react';
import type { Word } from '../data/vocabulary';
import type { CategoryId } from '../data/categories';
import { cachedLesson, loadLocalizedLesson, type LocalizedLesson } from '../lib/localization';

export function useLocalizedLesson(
  word: Word | undefined,
  languageId: string,
  categoryId: CategoryId,
  enabled: boolean,
) {
  const [state, setState] = useState<{
    key: string;
    lesson: LocalizedLesson | null;
    loading: boolean;
    error: string;
  }>({ key: '', lesson: null, loading: false, error: '' });
  const [retry, setRetry] = useState(0);
  const key = word ? `${languageId}:${word.id}:${categoryId}` : '';
  const immediate = word ? cachedLesson(word, languageId, categoryId) : null;
  useEffect(() => {
    if (!enabled || !word || languageId === 'en' || cachedLesson(word, languageId, categoryId))
      return;
    const controller = new AbortController();
    setState({ key, lesson: null, loading: true, error: '' });
    const timeout = setTimeout(() => controller.abort('timeout'), 22000);
    loadLocalizedLesson(word, languageId, categoryId, controller.signal)
      .then((lesson) => {
        if (!controller.signal.aborted) setState({ key, lesson, loading: false, error: '' });
      })
      .catch((error) => {
        if (controller.signal.reason === 'timeout')
          setState({
            key,
            lesson: null,
            loading: false,
            error:
              'Localization timed out. English explanations are available; you can retry later.',
          });
        else if (!controller.signal.aborted)
          setState({
            key,
            lesson: null,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Translation could not be loaded. English explanations are available.',
          });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [enabled, word, languageId, categoryId, key, retry]);
  return {
    lesson: immediate ?? (state.key === key ? state.lesson : null),
    loading: !immediate && state.key === key && state.loading,
    error: !immediate && state.key === key ? state.error : '',
    retry: () => setRetry((value) => value + 1),
  };
}
