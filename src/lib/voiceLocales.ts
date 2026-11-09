import type { Locale } from '../data/languages';
export interface SpeechSegment {
  text: string;
  lang: Locale;
}

export function selectVoice(
  voices: SpeechSynthesisVoice[],
  locale: string,
): SpeechSynthesisVoice | null {
  const requested = new Intl.Locale(locale.replaceAll('_', '-'));
  const exact = voices.find(
    (voice) => voice.lang.replaceAll('_', '-').toLowerCase() === requested.toString().toLowerCase(),
  );
  if (exact) return exact;
  const matches = voices.filter((voice) => {
    try {
      const candidate = new Intl.Locale(voice.lang.replaceAll('_', '-'));
      return (
        candidate.language === requested.language &&
        candidate.maximize().script === requested.maximize().script
      );
    } catch {
      return false;
    }
  });
  return matches.find((voice) => voice.localService) ?? matches[0] ?? null;
}
