import { AudioLines, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
export function HelpDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>('button')?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const elements = dialog?.querySelectorAll<HTMLButtonElement>('button');
        if (!elements?.length) return;
        event.preventDefault();
        elements[0].focus();
      }
    };
    document.addEventListener('keydown', handle);
    return () => {
      document.removeEventListener('keydown', handle);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="panel help-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      ref={dialogRef}
    >
      <button className="icon-button" onClick={onClose} aria-label="Close help">
        <X size={20} />
      </button>
      <span className="icon-tile large">
        <AudioLines size={25} />
      </span>
      <h2 id="help-title">A friendly voice. A guided path.</h2>
      <p>
        Voca AI is a browser-powered guided vocabulary tutor. It uses curated lessons and
        transparent rules, rather than a generative AI conversation.
      </p>
      <ol>
        <li>
          Choose your native language and level once. Change them later in Settings. Start your
          usual five-word session and quiz.
        </li>
        <li>
          Listen, then use the microphone or type your answer. Review the recognized text and press
          Send.
        </li>
        <li>
          Use hints, repeat an explanation, or skip a word. Complete the five-question quiz to save
          a session summary.
        </li>
      </ol>
      <p>
        <strong>Your language.</strong> Hindi, Marathi, and Kannada have bundled word meanings,
        explanations, prompts, hints, translation practice, and feedback. English words and examples
        remain in English. Other selectable languages use optional server-side AI localization when
        configured; otherwise the app explicitly shows English explanations. AI wording is labeled
        and is not independently reviewed.
      </p>
      <p>
        <strong>Voice availability.</strong> Each transcript segment uses its own language. Only
        matching installed voices are played; unavailable native audio remains text. English
        exercises request English recognition. The native-language help tab requests the selected
        locale, with typed help if the browser's speech service rejects it. Type or say 1 for
        meaning, 2 for example, or 3 for hint. This is guided help, not an open-ended chatbot.
      </p>
      <p>
        <strong>Real-life practice.</strong> Pick Daily Conversations, Job Interviews, Workplace
        English, Customer Service, Travel, or Business Communication. Translation checks recognize
        curated reference answers; other translations can still be valid. Real-life answers are
        checked for length and grammar, not relevance. Extra practice does not award vocabulary
        credit for unrelated words.
      </p>
      <p>
        <strong>What’s checked?</strong> Repetition checks the exact word; sentence practice checks
        the word plus at least four words, then sends your submitted sentence to LanguageTool for
        grammar, spelling, and punctuation suggestions. Revise any reported issues and recheck.
        Meaning questions check the selected answer. Pronunciation and intended sentence meaning are
        not assessed, and automated grammar checks can miss mistakes.
      </p>
      <p>
        <strong>Grammar service.</strong> Sentence checks use{' '}
        <a href="https://languagetool.org" target="_blank" rel="noopener noreferrer">
          LanguageTool
        </a>
        ’s free public API. Your submitted sentence is sent to their service when you press Send,
        with no API key. See their{' '}
        <a href="https://languagetool.org/legal/privacy" target="_blank" rel="noopener noreferrer">
          privacy policy
        </a>
        . No typing-triggered checks or automatic retries run. If the service is unavailable, the
        app says grammar was not checked; you can retry later or skip the word.
      </p>
      <p>
        <strong>Microphone tips.</strong> Try Chrome or Edge on a computer, allow microphone access,
        and use HTTPS or localhost. Browser recognition support varies. Recognition may send audio
        to your browser provider’s speech service. Voca does not store audio. The optional
        localization backend receives only curated lesson IDs, not your speech recording. Typed
        practice works without a microphone; grammar checks still require internet access.
      </p>
      <p>
        <strong>Your progress.</strong> Practiced words and completed sessions stay in this
        browser’s local storage. “Practiced” means a response passed a rule check, rather than a
        claim of mastery.
      </p>
    </div>
  );
}
