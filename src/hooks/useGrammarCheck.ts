import { useCallback, useEffect, useRef, useState } from 'react';
import { checkGrammar, type GrammarResult } from '../lib/grammar';

export function useGrammarCheck() {
  const [isChecking, setIsChecking] = useState(false);
  const current = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    current.current?.abort();
    current.current = null;
    setIsChecking(false);
  }, []);

  const check = useCallback(async (text: string): Promise<GrammarResult | null> => {
    if (current.current) return null;
    const controller = new AbortController();
    current.current = controller;
    setIsChecking(true);
    try {
      const result = await checkGrammar(text, controller.signal);
      return current.current === controller && !controller.signal.aborted ? result : null;
    } catch {
      return null; // Canceled work must never update a different word or session.
    } finally {
      if (current.current === controller) {
        current.current = null;
        setIsChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', cancel);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', cancel);
      current.current?.abort();
      current.current = null;
    };
  }, [cancel]);
  return { isChecking, check, cancel };
}
