import { Languages, Volume2, VolumeX } from 'lucide-react';
import type { Language } from '../data/languages';
import type { LocalizedLesson } from '../lib/localization';
import type { useVoice } from '../hooks/useVoice';
import { learningSupport } from '../data/learningSupport';
import type { BundledLanguageId } from '../data/languages';

export function LanguageSupport({
  language,
  lesson,
  loading,
  error,
  onRetry,
  voice,
}: {
  language: Language;
  lesson: LocalizedLesson | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  voice: ReturnType<typeof useVoice>;
}) {
  const nativeVoice = voice.voiceFor(language.locale);
  const englishVoice = voice.voiceFor('en-IN');
  return (
    <div className="language-support">
      <div className="support-title">
        <Languages size={15} />
        <strong>English learning · {language.name} support</strong>
        <span>
          {lesson?.source === 'bundled'
            ? 'Bundled content'
            : lesson?.source === 'ai'
              ? 'AI translation · not reviewed'
              : 'English explanations'}
        </span>
      </div>
      {language.id !== 'en' && !lesson && (
        <p role="status">
          {loading
            ? `Preparing ${language.name} explanations. English instructions are available while you wait.`
            : error ||
              `${language.name} has no bundled translation for this lesson. English explanations are shown until a validated AI translation is available.`}
          {!loading && (
            <button className="text-button" onClick={onRetry}>
              Retry localization
            </button>
          )}
        </p>
      )}
      <div className="audio-support-row">
        <span>
          {englishVoice ? <Volume2 size={13} /> : <VolumeX size={13} />}English:{' '}
          {englishVoice
            ? `${englishVoice.name} (${englishVoice.lang})`
            : 'text only — no matching voice installed'}
        </span>
        {language.id !== 'en' && (
          <span>
            {nativeVoice ? <Volume2 size={13} /> : <VolumeX size={13} />} {language.name}:{' '}
            {nativeVoice
              ? `${nativeVoice.name} (${nativeVoice.lang})`
              : 'text only — no matching voice installed'}
          </span>
        )}
      </div>
      {!nativeVoice && lesson && language.id in learningSupport && (
        <p lang={language.locale} dir={language.direction}>
          {learningSupport[language.id as BundledLanguageId].textOnly}
        </p>
      )}
      {lesson?.source === 'ai' && (
        <p>
          AI-generated wording can contain mistakes. Original English definitions remain visible.
          This translation has not been independently reviewed.
        </p>
      )}
    </div>
  );
}
