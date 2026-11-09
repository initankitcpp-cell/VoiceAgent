import { useState } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, Languages } from 'lucide-react';
import { LanguagePicker } from './LanguagePicker';
import { languageById } from '../data/languages';
import { levels, type Level } from '../data/vocabulary';
import type { LearnerSettings } from '../lib/settings';

export function LanguageOnboarding({
  initial,
  onComplete,
}: {
  initial: LearnerSettings;
  onComplete: (settings: LearnerSettings) => void;
}) {
  const [step, setStep] = useState<'language' | 'level'>('language');
  const [languageId, setLanguageId] = useState(initial.languageId);
  const [level, setLevel] = useState<Level>(initial.level);
  const language = languageById(languageId);
  return (
    <main className="onboarding">
      <a className="brand onboarding-brand" href="#">
        <span className="brand-mark">
          <AudioLines size={24} />
        </span>
        <span>
          voca<span className="brand-ai">AI</span>
        </span>
      </a>
      <section className="onboarding-intro">
        <span className="eyebrow">
          <Languages size={16} /> YOUR LANGUAGE. YOUR NEXT CHAPTER.
        </span>
        <h1>
          Learn English
          <br />
          <span>in Your Own Language</span>
        </h1>
        <p>
          {step === 'language'
            ? "Choose the language you're most comfortable with."
            : 'Choose a starting point. You can change it anytime.'}
        </p>
        <div className="onboarding-steps">
          <span className="active">1 · Your language</span>
          <span className={step === 'level' ? 'active' : ''}>2 · Your level</span>
        </div>
      </section>
      <section className="panel onboarding-panel">
        {step === 'language' ? (
          <>
            <LanguagePicker value={languageId} onChange={setLanguageId} />
            <div className="onboarding-actions">
              <p>
                English is always the learning target. Hindi, Marathi, and Kannada lessons are
                bundled; other languages need optional AI localization or use clearly labeled
                English explanations.
              </p>
              <button className="primary" onClick={() => setStep('level')}>
                Continue with {language.name}
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="selected-language">
              <span lang={language.locale} dir={language.direction}>
                {language.nativeName}
              </span>
              <strong>Learning English with {language.name} support</strong>
            </div>
            <div className="onboarding-levels">
              {levels.map((item, index) => (
                <button
                  key={item}
                  className={level === item ? 'chosen' : ''}
                  onClick={() => setLevel(item)}
                  aria-pressed={level === item}
                >
                  <span>0{index + 1}</span>
                  <h2>{item}</h2>
                  <p>
                    {
                      [
                        'Build everyday vocabulary and short sentences.',
                        'Express your ideas at work and in conversations.',
                        'Explore nuanced words and more detailed answers.',
                      ][index]
                    }
                  </p>
                </button>
              ))}
            </div>
            <div className="onboarding-actions">
              <button className="text-button" onClick={() => setStep('language')}>
                <ArrowLeft size={15} />
                Change language
              </button>
              <button
                className="primary"
                onClick={() => onComplete({ ...initial, languageId, level, onboarded: true })}
              >
                Start my English journey
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </section>
      <p className="onboarding-footnote">
        Your existing words, quizzes, and learning progress stay on this device. Native audio
        depends on voices installed in your browser.
      </p>
    </main>
  );
}
