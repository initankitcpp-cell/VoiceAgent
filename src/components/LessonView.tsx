import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  Keyboard,
  Lightbulb,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useRef, type Dispatch } from 'react';
import { promptFor, type SessionState, type SessionAction } from '../lib/engine';
import type { Exercise, Level } from '../data/vocabulary';
import type { Language } from '../data/languages';
import { categoryById } from '../data/categories';
import type { useLocalizedLesson } from '../hooks/useLocalizedLesson';
import { localizedIntroduction, localizedPrompt } from '../lib/tutorLocalization';
import { LanguageSupport } from './LanguageSupport';
import { learningSupport } from '../data/learningSupport';
import type { BundledLanguageId } from '../data/languages';
import type { useVoice } from '../hooks/useVoice';
import { Orb } from './Orb';
import { GrammarFeedback } from './GrammarFeedback';
interface Props {
  session: SessionState;
  level: Level;
  voice: ReturnType<typeof useVoice>;
  answer: string;
  setAnswer: (value: string) => void;
  isPending: boolean;
  isCheckingGrammar: boolean;
  submit: (response?: string) => void;
  nextWord: () => void;
  home: () => void;
  dispatch: Dispatch<SessionAction>;
  language: Language;
  localization: ReturnType<typeof useLocalizedLesson>;
  onExerciseChange: (exercise: Exercise) => void;
  responseMode: 'english' | 'native-help';
  onResponseModeChange: (mode: 'english' | 'native-help') => void;
  nativeHelp: string;
  setNativeHelp: (value: string) => void;
  askNativeHelp: (text?: string) => void;
}
export function LessonView({
  session,
  level,
  voice,
  answer,
  setAnswer,
  isPending,
  isCheckingGrammar,
  submit,
  nextWord,
  home,
  dispatch,
  language,
  localization,
  onExerciseChange,
  responseMode,
  onResponseModeChange,
  nativeHelp,
  setNativeHelp,
  askNativeHelp,
}: Props) {
  const word = session.words[session.index];
  const lesson = localization.lesson;
  const category = categoryById(session.categoryId);
  const isNativeHelp = responseMode === 'native-help';
  const response = isNativeHelp ? nativeHelp : answer;
  const submitResponse = () => (isNativeHelp ? askNativeHelp() : submit());
  const recognitionLocale = isNativeHelp ? language.locale : 'en-IN';
  const status = isPending || isCheckingGrammar ? 'thinking' : voice.status;
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const answerInput = useRef<HTMLTextAreaElement>(null);
  const isEmbedded = window.self !== window.top || /Electron/i.test(navigator.userAgent);
  useEffect(() => {
    const container = transcriptEnd.current?.parentElement;
    container?.scrollTo({
      top: container.scrollHeight,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }, [session.messages.length]);
  return (
    <>
      <div className="session-heading">
        <div>
          <div className="eyebrow">YOUR DAILY CONVERSATION</div>
          <h1>A word closer to confident.</h1>
          <p>
            {level} practice <span className="text-dot">·</span> Word {session.index + 1} of 5
          </p>
        </div>
        <button className="subtle-button" onClick={home}>
          <ArrowLeft size={16} />
          End session
        </button>
      </div>
      <div className="session-track" aria-label={`Word ${session.index + 1} of 5`}>
        {session.words.map((w, i) => (
          <div
            key={w.id}
            className={
              i < session.index
                ? session.practiced.includes(w.id)
                  ? 'done'
                  : 'skipped'
                : i === session.index
                  ? 'current'
                  : ''
            }
            title={
              i < session.index
                ? session.practiced.includes(w.id)
                  ? 'Practiced'
                  : 'Skipped'
                : undefined
            }
          >
            <span>
              {i < session.index ? (
                session.practiced.includes(w.id) ? (
                  <Check size={13} />
                ) : (
                  <ArrowRight size={13} />
                )
              ) : (
                i + 1
              )}
            </span>
            <span>{i <= session.index ? w.word : 'Next word'}</span>
          </div>
        ))}
      </div>
      <LanguageSupport
        language={language}
        lesson={lesson}
        loading={localization.loading}
        error={localization.error}
        onRetry={localization.retry}
        voice={voice}
      />
      <div className="learning-grid">
        <section className="panel tutor-panel">
          <div className="section-row">
            <span className="mini-label">VOCA · YOUR VOICE TUTOR</span>
            <span className={`voice-state ${status}`} role="status">
              <span />
              {isCheckingGrammar
                ? 'Checking grammar…'
                : status === 'idle'
                  ? 'Ready when you are'
                  : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          <Orb state={status} small />
          <div className="word-heading">
            <span className="pill">
              {word.part} <span>·</span> {word.level}
            </span>
            <h2>
              {word.word}
              <button
                className="icon-button word-sound"
                onClick={() => voice.speak(word.word)}
                aria-label={`Hear ${word.word}`}
                disabled={!voice.canSpeak || voice.muted}
              >
                <Volume2 size={22} />
              </button>
            </h2>
            <p className="word-meaning">{word.meaning}</p>
          </div>
          {lesson && (
            <div className="native-meaning-card" lang={language.locale} dir={language.direction}>
              <span className="mini-label">
                {language.nativeName} ·{' '}
                {lesson.source === 'bundled' ? 'OFFLINE LESSON' : 'AI TRANSLATION'}
              </span>
              <h3>{lesson.nativeMeaning}</h3>
              <p>{lesson.nativeExplanation}</p>
              {lesson.nativeExample && <p className="native-example">{lesson.nativeExample}</p>}
            </div>
          )}
          <blockquote>“{word.example}”</blockquote>
          <label className="exercise-picker">
            Practice mode
            <select
              value={session.exercise}
              onChange={(event) => onExerciseChange(event.target.value as Exercise)}
            >
              <option value="repeat">Repeat the English word</option>
              <option value="sentence">Make an original English sentence</option>
              <option value="meaning">Choose the correct meaning</option>
              <option value="translate" disabled={!lesson}>
                Translate to English{!lesson ? ' · native text unavailable' : ''}
              </option>
              <option value="conversation">Real-life English question</option>
            </select>
          </label>
          <div className="exercise-prompt">
            <span className="icon-tile">
              <Mic size={17} />
            </span>
            <div>
              <span className="mini-label">YOUR TURN</span>
              {lesson && (
                <p lang={language.locale} dir={language.direction}>
                  {localizedPrompt(lesson, word, session.exercise)[0].text}
                </p>
              )}
              <p>{promptFor(word, session.exercise).replace('Your turn. ', '')}</p>
            </div>
          </div>
          {session.exercise === 'translate' && lesson && (
            <div className="context-practice">
              <span className="mini-label">{category.name} · TRANSLATE INTO ENGLISH</span>
              <p lang={language.locale} dir={language.direction}>
                {lesson.nativePractice}
              </p>
              <details>
                <summary>Compare with a reference answer</summary>
                <p lang="en-IN">{category.answer}</p>
                <small>
                  This check matches curated reference answers, not every valid translation.
                </small>
              </details>
            </div>
          )}
          {session.exercise === 'conversation' && (
            <div className="context-practice">
              <span className="mini-label">{category.name}</span>
              <p lang="en-IN">{category.question}</p>
              <small>
                Practice a relevant English answer. Length and grammar are checked; meaning and
                relevance are not evaluated.
              </small>
            </div>
          )}
          {['translate', 'conversation'].includes(session.exercise) && (
            <p className="extra-practice-note">
              Extra practice. Vocabulary credit comes from repeating the word, choosing its meaning,
              or using it in your own sentence.
            </p>
          )}
          <div className="voice-controls">
            <button
              className="control-button"
              onClick={() => voice.speak(localizedIntroduction(word, session.exercise, lesson))}
              disabled={!voice.canSpeak || voice.muted}
            >
              <RotateCcw size={17} />
              <span>Repeat</span>
            </button>
            <button
              className="control-button"
              onClick={voice.togglePause}
              disabled={!['speaking', 'paused'].includes(voice.status)}
            >
              {voice.status === 'paused' ? <Play size={17} /> : <Pause size={17} />}
              <span>{voice.status === 'paused' ? 'Resume' : 'Pause'}</span>
            </button>
            <button
              className="control-button"
              onClick={voice.stop}
              disabled={voice.status === 'idle'}
            >
              <Square size={15} />
              <span>Stop</span>
            </button>
            <button
              className="control-button"
              onClick={voice.toggleMute}
              aria-pressed={voice.muted}
            >
              {voice.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              <span>{voice.muted ? 'Unmute' : 'Mute'}</span>
            </button>
          </div>
          <div className="session-learned">
            <span className="mini-label">PRACTICED THIS SESSION</span>
            {session.practiced.length ? (
              <div className="session-word-chips">
                {session.words
                  .filter((w) => session.practiced.includes(w.id))
                  .map((w) => (
                    <span key={w.id}>
                      <Check size={12} />
                      {w.word}
                    </span>
                  ))}
              </div>
            ) : (
              <p>Your practiced words will appear here.</p>
            )}
          </div>
        </section>
        <section className="panel conversation-panel">
          <div className="conversation-title">
            <div>
              <span className="conversation-dot" />
              <h2>Our conversation</h2>
            </div>
            <span>ENGLISH{lesson ? ` + ${language.name.toUpperCase()}` : ''}</span>
          </div>
          <div className="conversation-messages" role="log" aria-label="Conversation transcript">
            {session.messages.map((message) => (
              <div className={`message ${message.role}`} key={message.id}>
                <span className={`message-avatar ${message.role}`}>
                  {message.role === 'tutor' ? <AudioLines size={15} /> : 'Y'}
                </span>
                <div>
                  <span className="message-author">
                    {message.role === 'tutor' ? 'Voca' : 'You'}
                  </span>
                  {message.parts ? (
                    message.parts.map((part, index) => (
                      <p
                        key={index}
                        lang={part.lang}
                        dir={
                          part.lang.startsWith('ur') ||
                          part.lang.startsWith('ks') ||
                          part.lang.startsWith('sd')
                            ? 'rtl'
                            : 'ltr'
                        }
                      >
                        <span className="transcript-language">
                          {part.lang.startsWith('en') ? 'English' : part.lang}
                        </span>
                        {part.text}
                      </p>
                    ))
                  ) : (
                    <p lang="en-IN">{message.text}</p>
                  )}
                </div>
              </div>
            ))}
            {voice.interim && (
              <div className="interim-transcript">
                <Mic size={14} />
                {voice.interim}
                <span className="typing-cursor" />
              </div>
            )}
            <div ref={transcriptEnd} />
          </div>
          {session.feedback && !isCheckingGrammar && (
            <div
              className={`feedback ${session.feedback.correct ? 'success' : 'try-again'}`}
              role="status"
            >
              {session.feedback.correct ? <CheckCheck size={18} /> : <Lightbulb size={18} />}
              <span>
                {session.feedback.correct
                  ? ['translate', 'conversation'].includes(session.exercise)
                    ? 'Practice check passed. Your vocabulary count is unchanged.'
                    : 'Word check passed. Ready for the next one?'
                  : session.feedback.grammar?.status === 'unavailable'
                    ? 'Grammar is unavailable. Retry later or skip this word.'
                    : session.feedback.grammar
                      ? 'Review the writing suggestions, then try again.'
                      : 'Try once more. Your tutor’s feedback is above.'}
              </span>
            </div>
          )}
          <div className="response-area">
            {isCheckingGrammar && (
              <div className="grammar-pending" role="status">
                <span className="grammar-spinner" />
                Checking your sentence with LanguageTool…
              </div>
            )}
            {session.feedback?.grammar && !isCheckingGrammar && (
              <GrammarFeedback
                result={session.feedback.grammar}
                languageId={lesson?.languageId ?? 'en'}
                onApply={(text) => {
                  voice.stop();
                  setAnswer(text);
                  answerInput.current?.focus();
                }}
              />
            )}
            {isEmbedded && (
              <div className="browser-voice-note">
                <ExternalLink size={15} />
                <p>
                  For voice practice, try this app in a standalone Chrome window. Editor previews
                  may not provide a working speech service.{' '}
                  <a href={window.location.href} target="_blank" rel="noopener noreferrer">
                    Open in browser
                  </a>
                </p>
              </div>
            )}
            {voice.error && (
              <div className="voice-error" role="alert">
                <div className="voice-error-body">
                  {lesson && lesson.languageId in learningSupport && (
                    <p lang={language.locale}>
                      {learningSupport[lesson.languageId as BundledLanguageId].microphone}
                    </p>
                  )}
                  <p>{voice.error}</p>
                  {voice.errorCode && session.exercise !== 'meaning' && (
                    <div className="voice-recovery-actions">
                      {voice.supported && (
                        <button
                          className="text-button"
                          onClick={() => voice.listen(recognitionLocale)}
                          disabled={
                            session.accepted ||
                            voice.status === 'speaking' ||
                            voice.status === 'paused' ||
                            voice.status === 'listening'
                          }
                        >
                          <RotateCcw size={13} />
                          Retry microphone
                        </button>
                      )}
                      <button
                        className="text-button"
                        onClick={() => {
                          voice.stop();
                          voice.clearError();
                          answerInput.current?.focus();
                        }}
                      >
                        <Keyboard size={13} />
                        Type instead
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="icon-button"
                  onClick={voice.clearError}
                  aria-label="Dismiss voice message"
                >
                  <X size={15} />
                </button>
              </div>
            )}
            {!voice.supported && (
              <p className="fallback-note">
                <Keyboard size={15} />
                Voice recognition is unavailable here. Type below to keep learning.
              </p>
            )}
            {!voice.canSpeak && (
              <p className="fallback-note">
                Audio playback is unavailable. Read the tutor’s messages above.
              </p>
            )}
            {session.exercise === 'meaning' ? (
              <div className="practice-options">
                {word.quiz.options.map((option) => (
                  <button
                    key={option}
                    disabled={session.accepted || isPending}
                    onClick={() => submit(option)}
                  >
                    {option}
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <>
                {language.id !== 'en' && (
                  <div className="response-language-controls">
                    <button
                      className={!isNativeHelp ? 'selected' : ''}
                      onClick={() => onResponseModeChange('english')}
                      aria-pressed={!isNativeHelp}
                    >
                      English practice
                    </button>
                    <button
                      className={isNativeHelp ? 'selected' : ''}
                      onClick={() => onResponseModeChange('native-help')}
                      aria-pressed={isNativeHelp}
                    >
                      {language.name} help
                    </button>
                  </div>
                )}
                {isNativeHelp && (
                  <div className="native-help-note">
                    {lesson && (
                      <p lang={language.locale} dir={language.direction}>
                        {lesson.copy.helpUnknown}
                      </p>
                    )}
                    <p>
                      Say or type 1 (meaning), 2 (example), or 3 (hint). This guided help does not
                      submit or grade a native-language answer as English. Recognition for{' '}
                      {recognitionLocale} depends on your browser’s speech service; type if
                      unavailable.
                    </p>
                  </div>
                )}
                <form
                  className="answer-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitResponse();
                  }}
                >
                  <label className="sr-only" htmlFor="answer">
                    {isNativeHelp ? `${language.name} help request` : 'Your response'}
                  </label>
                  <textarea
                    id="answer"
                    ref={answerInput}
                    value={response}
                    lang={recognitionLocale}
                    dir={isNativeHelp ? language.direction : 'ltr'}
                    onChange={(event) =>
                      isNativeHelp
                        ? setNativeHelp(event.target.value)
                        : setAnswer(event.target.value)
                    }
                    placeholder={
                      isNativeHelp
                        ? '1 · Meaning    2 · Example    3 · Hint'
                        : 'Speak, or type your response here…'
                    }
                    rows={2}
                    maxLength={1000}
                    disabled={
                      (!isNativeHelp && session.accepted) ||
                      voice.status === 'listening' ||
                      isCheckingGrammar
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        submitResponse();
                      }
                    }}
                  />
                  <button
                    className="send-button"
                    type="submit"
                    aria-label={isNativeHelp ? 'Ask for help' : 'Check answer'}
                    disabled={
                      !response.trim() ||
                      (!isNativeHelp && session.accepted) ||
                      voice.status === 'listening' ||
                      isPending ||
                      isCheckingGrammar
                    }
                  >
                    <Send size={17} />
                  </button>
                </form>
                <div className="mic-row">
                  <button
                    className={`mic-button ${voice.status === 'listening' ? 'listening' : ''}`}
                    onClick={
                      voice.status === 'listening'
                        ? voice.finishListening
                        : () => voice.listen(recognitionLocale)
                    }
                    disabled={
                      !voice.supported ||
                      (!isNativeHelp && session.accepted) ||
                      voice.status === 'speaking' ||
                      voice.status === 'paused' ||
                      isCheckingGrammar
                    }
                    aria-label={
                      voice.status === 'listening' ? 'Finish listening' : 'Start microphone'
                    }
                  >
                    {voice.status === 'listening' ? <Square size={16} /> : <Mic size={20} />}
                  </button>
                  <div>
                    <strong>
                      {voice.status === 'listening'
                        ? 'Listening to you…'
                        : voice.status === 'speaking' || voice.status === 'paused'
                          ? 'Let Voca finish, or press Stop'
                          : isCheckingGrammar
                            ? 'Checking your sentence…'
                            : answer
                              ? 'Review your transcript, then send'
                              : 'Tap the mic. Give it a try.'}
                    </strong>
                    <span>
                      {voice.status === 'listening'
                        ? 'Tap again when you’re finished'
                        : 'Typing works just as well'}
                    </span>
                  </div>
                </div>
                {!isNativeHelp && ['sentence', 'conversation'].includes(session.exercise) && (
                  <p className="grammar-disclosure">
                    Sending checks this sentence with{' '}
                    <a href="https://languagetool.org" target="_blank" rel="noopener noreferrer">
                      LanguageTool
                    </a>{' '}
                    for grammar, spelling, and punctuation. Your text is sent to their service.{' '}
                    <a
                      href="https://languagetool.org/legal/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy policy
                    </a>
                  </p>
                )}
              </>
            )}
            <div className="response-actions">
              <button
                className="text-button"
                onClick={() => {
                  const parts = [
                    {
                      text: lesson?.nativeHint ?? word.hint,
                      lang: lesson ? language.locale : ('en-IN' as const),
                    },
                  ];
                  dispatch({ type: 'HINT', parts });
                  voice.speak(parts);
                }}
              >
                <Lightbulb size={15} />
                Give me a hint
              </button>
              <button
                className={session.accepted ? 'primary compact' : 'text-button'}
                onClick={nextWord}
              >
                {session.index === 4 ? 'Start quiz' : session.accepted ? 'Next word' : 'Skip word'}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>
      </div>
      <p className="honesty-note">
        <ShieldCheck size={13} />
        Sentence exercises use LanguageTool grammar checks. Word and meaning exercises use simple
        rules. Pronunciation and sentence meaning are not scored.
      </p>
    </>
  );
}
