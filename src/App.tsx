import { HelpDialog } from './components/HelpDialog';
import { LessonView } from './components/LessonView';
import { WelcomeDashboard } from './components/WelcomeDashboard';
import { useCallback, useEffect, useReducer, useRef, useState, useTransition } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  LayoutDashboard,
  Languages,
  Menu,
  Search,
  ShieldCheck,
  Trophy,
  TrendingUp,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import {
  exerciseFor,
  initialSession,
  selectWords,
  sessionReducer,
  validateResponse,
} from './lib/engine';
import type { GrammarResult } from './lib/grammar';
import {
  emptyProgress,
  readProgress,
  recordSession,
  saveProgress,
  type Progress,
} from './lib/storage';
import { levels, vocabulary, type Level } from './data/vocabulary';
import { useVoice } from './hooks/useVoice';
import { useGrammarCheck } from './hooks/useGrammarCheck';
import { readSettings, saveSettings, type LearnerSettings as Settings } from './lib/settings';
import { LanguageOnboarding } from './components/LanguageOnboarding';
import { LearnerSettings } from './components/LearnerSettings';
import { languageById } from './data/languages';
import { cachedLesson } from './lib/localization';
import { useLocalizedLesson } from './hooks/useLocalizedLesson';
import { localizedFeedback, localizedIntroduction, localizedPrompt } from './lib/tutorLocalization';
import type { Exercise } from './data/vocabulary';
import type { SpeechSegment } from './lib/voiceLocales';

type View = 'learn' | 'words' | 'progress';

export default function App() {
  const [loaded] = useState(readProgress);
  const [progress, setProgress] = useState<Progress>(loaded.progress);
  const [storageWarning, setStorageWarning] = useState(loaded.warning);
  const [view, setView] = useState<View>('learn');
  const [settings, setSettings] = useState(readSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const level = settings.level;
  const setLevel = (value: Level) => setSettings((previous) => ({ ...previous, level: value }));
  const language = languageById(settings.languageId);
  const [session, dispatch] = useReducer(sessionReducer, initialSession);
  const [answer, setAnswer] = useState('');
  const [responseMode, setResponseMode] = useState<'english' | 'native-help'>('english');
  const [nativeHelp, setNativeHelp] = useState('');
  const [query, setQuery] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'learned'>('all');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const closeHelp = useCallback(() => setHelp(false), []);
  const mainRef = useRef<HTMLElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isPending, startTransition] = useTransition();
  const voice = useVoice((value) =>
    responseMode === 'native-help' ? setNativeHelp(value) : setAnswer(value),
  );
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const grammar = useGrammarCheck();
  const active = view === 'learn' && session.phase !== 'welcome';
  const localization = useLocalizedLesson(
    session.words[session.index],
    settings.languageId,
    settings.category,
    active && session.phase === 'practice',
  );
  const lessonRef = useRef(localization.lesson);
  lessonRef.current = localization.lesson;
  const announced = useRef('');
  const quizScore = session.quizAnswers.filter(
    (a, i) => a === session.words[i]?.quiz.answer,
  ).length;
  const totalAnswers = progress.sessions.length * 5;
  const average = totalAnswers
    ? Math.round((progress.sessions.reduce((n, s) => n + s.quizScore, 0) / totalAnswers) * 100)
    : null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
  }, [view, session.phase, session.index, session.quizIndex]);

  useEffect(() => {
    if (!session.practiced.length) return;
    setProgress((previous) => {
      const fresh = session.practiced.filter((id) => !previous.learned.includes(id));
      return {
        ...previous,
        learned: [...previous.learned, ...fresh],
        recent: [
          ...previous.recent.filter((id) => !session.practiced.includes(id)),
          ...session.practiced,
        ],
      };
    });
  }, [session.practiced]);
  useEffect(() => {
    if (session.phase !== 'summary') return;
    setProgress((previous) =>
      recordSession(previous, {
        id: String(session.startedAt),
        date: new Date().toISOString(),
        level: session.words[0].level,
        practiced: session.practiced,
        quizScore,
        total: 5,
        seconds: Math.round((Date.now() - session.startedAt) / 1000),
      }),
    );
  }, [session.phase, session.startedAt, session.practiced, session.words, quizScore]);
  useEffect(() => {
    const warning = saveProgress(progress);
    if (warning) setStorageWarning(warning);
  }, [progress]);
  useEffect(() => {
    const warning = saveSettings(settings);
    if (warning) setStorageWarning(warning);
  }, [settings]);
  useEffect(() => {
    const lesson = localization.lesson;
    if (!lesson || lesson.source !== 'ai' || session.phase !== 'practice' || !active) return;
    const key = `${lesson.languageId}:${lesson.wordId}:${lesson.categoryId}`;
    if (announced.current === key) return;
    announced.current = key;
    dispatch({
      type: 'ADD_MESSAGE',
      role: 'tutor',
      parts: localizedIntroduction(session.words[session.index], session.exercise, lesson),
    });
  }, [localization.lesson, session.phase, session.words, session.index, session.exercise, active]);

  function applySettings(next: Settings) {
    grammar.cancel();
    voice.stop();
    setSettings(next);
    setSettingsOpen(false);
    setResponseMode('english');
    setNativeHelp('');
    if (session.phase === 'practice') {
      const lesson = cachedLesson(session.words[session.index], next.languageId, next.category);
      const exercise = session.exercise === 'translate' && !lesson ? 'sentence' : session.exercise;
      const parts = localizedIntroduction(session.words[session.index], exercise, lesson);
      announced.current = lesson
        ? `${next.languageId}:${session.words[session.index].id}:${next.category}`
        : '';
      if (exercise !== session.exercise) dispatch({ type: 'SET_EXERCISE', exercise, parts });
      else dispatch({ type: 'ADD_MESSAGE', role: 'tutor', parts });
    }
  }

  function navigate(next: View) {
    grammar.cancel();
    voice.stop();
    setMobileMenu(false);
    setView(next);
  }
  function start() {
    grammar.cancel();
    voice.stop();
    setAnswer('');
    setResponseMode('english');
    setNativeHelp('');
    setView('learn');
    const words = selectWords(level, progress.recent);
    const lesson = cachedLesson(words[0], settings.languageId, settings.category);
    const intro = localizedIntroduction(words[0], 'repeat', lesson);
    announced.current = lesson ? `${settings.languageId}:${words[0].id}:${settings.category}` : '';
    dispatch({ type: 'START', words, now: Date.now(), categoryId: settings.category, intro });
    voice.speak(intro);
  }
  async function submit(response = answer) {
    if (
      !response.trim() ||
      session.accepted ||
      voice.status === 'listening' ||
      grammar.isChecking ||
      session.phase !== 'practice'
    )
      return;
    voice.stop();
    const text = response.trim();
    const word = session.words[session.index];
    const exercise = session.exercise;
    let result: GrammarResult | undefined;
    if (
      ['sentence', 'conversation'].includes(exercise) &&
      validateResponse(word, exercise, text, session.categoryId).correct
    ) {
      const checked = await grammar.check(text);
      if (!checked) return;
      result = checked;
    }
    const action = { type: 'SUBMIT' as const, response: text, grammar: result };
    const next = sessionReducer(session, action);
    const parts = next.feedback
      ? localizedFeedback(next.feedback, word, exercise, text, lessonRef.current)
      : [];
    startTransition(() => dispatch({ ...action, feedbackParts: parts }));
    voiceRef.current.speak(parts);
  }
  function nextWord() {
    grammar.cancel();
    voice.stop();
    setAnswer('');
    setResponseMode('english');
    setNativeHelp('');
    if (session.index < 4) {
      const nextWord = session.words[session.index + 1];
      const lesson = cachedLesson(nextWord, settings.languageId, settings.category);
      const intro = localizedIntroduction(nextWord, exerciseFor(session.index + 1), lesson);
      announced.current = lesson
        ? `${settings.languageId}:${nextWord.id}:${settings.category}`
        : '';
      dispatch({ type: 'NEXT', intro });
      voice.speak(intro);
    } else {
      dispatch({ type: 'NEXT' });
      voice.speak(
        localization.lesson
          ? [{ text: localization.lesson.copy.quiz, lang: language.locale }]
          : 'Let’s see what stuck. Choose the correct meaning for each of your five words.',
      );
    }
  }
  function home() {
    grammar.cancel();
    voice.stop();
    dispatch({ type: 'RESET' });
    setView('learn');
    setAnswer('');
  }
  const chooseQuizAnswer = (choice: number) => {
    dispatch({ type: 'ANSWER', answer: choice });
    const current = session.words[session.quizIndex];
    voice.speak(
      choice === current.quiz.answer
        ? 'That’s right. Well done!'
        : `The correct meaning is: ${current.meaning}`,
    );
  };

  function changeExercise(exercise: Exercise) {
    grammar.cancel();
    voice.stop();
    setAnswer('');
    setResponseMode('english');
    const parts = localizedPrompt(localization.lesson, session.words[session.index], exercise);
    dispatch({ type: 'SET_EXERCISE', exercise, parts });
    voice.speak(parts);
  }
  function askNativeHelp(text = nativeHelp) {
    if (!text.trim()) return;
    voice.stop();
    const lesson = localization.lesson;
    const word = session.words[session.index];
    const parts: SpeechSegment[] = /उदाहरण|ಉದಾಹರಣೆ|example|^2$/i.test(text)
      ? [{ text: word.example, lang: 'en-IN' }]
      : /संकेत|सूचना|ಸುಳಿವು|hint|^3$/i.test(text)
        ? [{ text: lesson?.nativeHint ?? word.hint, lang: lesson ? language.locale : 'en-IN' }]
        : /मतलब|अर्थ|ಅರ್ಥ|meaning|^1$/i.test(text)
          ? [
              {
                text: lesson
                  ? `${lesson.nativeMeaning}. ${lesson.nativeExplanation}`
                  : word.meaning,
                lang: lesson ? language.locale : 'en-IN',
              },
            ]
          : [
              {
                text:
                  lesson?.copy.helpUnknown ??
                  'This is guided help, not an open-ended AI conversation. Choose meaning (1), example (2), or hint (3).',
                lang: lesson ? language.locale : 'en-IN',
              },
            ];
    dispatch({ type: 'ADD_MESSAGE', role: 'user', parts: [{ text, lang: language.locale }] });
    dispatch({ type: 'ADD_MESSAGE', role: 'tutor', parts });
    voice.speak(parts);
    setNativeHelp('');
  }

  if (!settings.onboarded)
    return <LanguageOnboarding initial={settings} onComplete={applySettings} />;
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('learn');
          }}
          aria-label="Voca AI home"
        >
          <span className="brand-mark">
            <AudioLines size={24} />
          </span>
          <span>
            voca<span className="brand-ai">AI</span>
          </span>
        </a>
        <button
          className="icon-button sidebar-close"
          onClick={() => setMobileMenu(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        <div className="nav-label">YOUR LEARNING SPACE</div>
        <nav aria-label="Main navigation">
          {(
            [
              { id: 'learn', icon: LayoutDashboard, name: 'Let’s learn' },
              { id: 'words', icon: BookOpen, name: 'My vocabulary' },
              { id: 'progress', icon: TrendingUp, name: 'My progress' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? 'selected' : ''}`}
              onClick={() => navigate(item.id)}
              aria-current={view === item.id ? 'page' : undefined}
            >
              <item.icon size={19} />
              {item.name}
              {item.id === 'learn' && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-star">✦</span>
          <h3>
            A little practice.
            <br />A world of possibility.
          </h3>
          <p>Your next conversation starts with a new word.</p>
          <div className="note-line" />
        </div>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => {
              voice.stop();
              grammar.cancel();
              setMobileMenu(false);
              setSettingsOpen(true);
            }}
          >
            <Languages size={18} />
            Settings · Change Language
          </button>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            How Voca works
          </button>
          <div className="profile">
            <span className="avatar">Y</span>
            <div>
              <strong>Your personal space</strong>
              <span>Learning at your pace</span>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span>My workspace</span>
            <ChevronRight size={14} />
            <strong>
              {view === 'learn'
                ? 'Let’s learn'
                : view === 'words'
                  ? 'My vocabulary'
                  : 'My progress'}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="local-badge">
              <span />
              Saved on this device
            </span>
            <span className="avatar mini">Y</span>
          </div>
        </header>
        <main id="main" ref={mainRef} tabIndex={-1}>
          {storageWarning && (
            <div className="notice" role="status">
              <ShieldCheck size={18} />
              <span>{storageWarning}</span>
              <button
                className="icon-button"
                aria-label="Dismiss storage message"
                onClick={() => setStorageWarning('')}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {view === 'learn' && session.phase === 'welcome' && (
            <WelcomeDashboard
              level={level}
              setLevel={setLevel}
              progress={progress}
              start={start}
              language={language}
              category={settings.category}
              onCategoryChange={(category) =>
                setSettings((previous) => ({ ...previous, category }))
              }
              onChangeLanguage={() => setSettingsOpen(true)}
            />
          )}

          {active && session.phase === 'practice' && (
            <LessonView
              session={session}
              level={session.words[0]?.level ?? level}
              voice={voice}
              answer={answer}
              setAnswer={setAnswer}
              isPending={isPending}
              isCheckingGrammar={grammar.isChecking}
              submit={submit}
              nextWord={nextWord}
              home={home}
              dispatch={dispatch}
              language={language}
              localization={localization}
              onExerciseChange={changeExercise}
              responseMode={responseMode}
              onResponseModeChange={(mode) => {
                voice.stop();
                setResponseMode(mode);
              }}
              nativeHelp={nativeHelp}
              setNativeHelp={setNativeHelp}
              askNativeHelp={askNativeHelp}
            />
          )}

          {active &&
            session.phase === 'quiz' &&
            (() => {
              const current = session.words[session.quizIndex];
              const selected = session.quizAnswers[session.quizIndex];
              return (
                <div className="quiz-wrap">
                  <button className="text-button" onClick={home}>
                    <ArrowLeft size={16} />
                    End session
                  </button>
                  <section className="panel quiz-card">
                    <span className="icon-tile large">
                      <Zap size={25} />
                    </span>
                    <div className="eyebrow">LET’S MAKE IT STICK</div>
                    <h1>A little recall goes a long way.</h1>
                    <p>
                      Question {session.quizIndex + 1} of 5 <span className="text-dot">·</span>{' '}
                      Choose one answer
                    </p>
                    <div className="progress-track">
                      <span style={{ width: `${(session.quizIndex / 5) * 100}%` }} />
                    </div>
                    <h2>{current.quiz.question}</h2>
                    <div className="quiz-options">
                      {current.quiz.options.map((option, index) => (
                        <button
                          key={option}
                          className={
                            selected !== undefined
                              ? index === current.quiz.answer
                                ? 'correct'
                                : selected === index
                                  ? 'incorrect'
                                  : ''
                              : ''
                          }
                          onClick={() => chooseQuizAnswer(index)}
                          disabled={selected !== undefined}
                        >
                          <span>{String.fromCharCode(65 + index)}</span>
                          {option}
                          {selected !== undefined && index === current.quiz.answer && (
                            <Check size={19} />
                          )}
                        </button>
                      ))}
                    </div>
                    {selected !== undefined && (
                      <div className="quiz-feedback" role="status">
                        <strong>
                          {selected === current.quiz.answer
                            ? 'You’ve got it!'
                            : 'A useful one to remember.'}
                        </strong>
                        <p>
                          {current.word}: {current.meaning}
                        </p>
                        <p className="quiz-example">“{current.example}”</p>
                      </div>
                    )}
                    <button
                      className="primary"
                      disabled={selected === undefined}
                      onClick={() => {
                        voice.stop();
                        dispatch({ type: 'QUIZ_NEXT' });
                      }}
                    >
                      {session.quizIndex === 4 ? 'See my session' : 'Next question'}
                      <ArrowRight size={17} />
                    </button>
                  </section>
                </div>
              );
            })()}

          {active && session.phase === 'summary' && (
            <div className="summary-wrap">
              <section className="panel summary-card">
                <div className="celebration">
                  <Trophy size={37} />
                </div>
                <div className="eyebrow">A LITTLE PRACTICE. REAL PROGRESS.</div>
                <h1>
                  You showed up.
                  <br />
                  <span>That’s how confidence grows.</span>
                </h1>
                <p>Take these words into your next conversation.</p>
                <div className="summary-stats">
                  <div>
                    <strong>
                      {session.practiced.length}
                      <small>/ 5</small>
                    </strong>
                    <span>words practiced</span>
                  </div>
                  <div>
                    <strong>
                      {quizScore}
                      <small>/ 5</small>
                    </strong>
                    <span>quiz answers correct</span>
                  </div>
                </div>
                <div className="summary-words">
                  {session.words.map((w) => (
                    <div key={w.id}>
                      <span
                        className={
                          session.practiced.includes(w.id) ? 'word-complete' : 'word-skipped'
                        }
                      >
                        {session.practiced.includes(w.id) ? (
                          <Check size={14} />
                        ) : (
                          <ArrowRight size={14} />
                        )}
                      </span>
                      <strong>{w.word}</strong>
                      <span>{session.practiced.includes(w.id) ? 'Practiced' : 'Skipped'}</span>
                    </div>
                  ))}
                </div>
                <p className="saved-note">
                  <ShieldCheck size={14} />
                  {storageWarning
                    ? 'Progress is in this tab; browser storage is unavailable.'
                    : 'Your progress is saved on this device.'}
                </p>
                <button className="primary" onClick={start}>
                  Keep the conversation going
                  <ArrowRight size={18} />
                </button>
                <button className="text-button" onClick={home}>
                  Back to my workspace
                </button>
              </section>
            </div>
          )}

          {view === 'words' && (
            <>
              <div className="page-heading compact-heading">
                <div>
                  <div className="eyebrow">ONE WORD OPENS ANOTHER DOOR</div>
                  <h1>Your growing vocabulary.</h1>
                  <p>Meet all 60 words. Come back to the ones you’ve practiced.</p>
                </div>
                <span className="count-badge">{progress.learned.length} practiced</span>
              </div>
              <div className="library-tools">
                <div className="filter-tabs">
                  <button
                    className={libraryFilter === 'all' ? 'selected' : ''}
                    onClick={() => setLibraryFilter('all')}
                  >
                    All words <span>60</span>
                  </button>
                  <button
                    className={libraryFilter === 'learned' ? 'selected' : ''}
                    onClick={() => setLibraryFilter('learned')}
                  >
                    Practiced <span>{progress.learned.length}</span>
                  </button>
                </div>
                <label className="search-field">
                  <Search size={17} />
                  <span className="sr-only">Search vocabulary</span>
                  <input
                    placeholder="Find a word or level…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>
              <div className="library-grid">
                {vocabulary
                  .filter(
                    (w) =>
                      (libraryFilter === 'all' || progress.learned.includes(w.id)) &&
                      `${w.word} ${w.level} ${w.meaning}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                  .map((w) => (
                    <article className="panel library-card" key={w.id}>
                      <div className="section-row">
                        <span className={`level-tag ${w.level.toLowerCase()}`}>{w.level}</span>
                        {progress.learned.includes(w.id) && (
                          <span className="practiced-mark" aria-label="Practiced">
                            <CheckCheck size={16} />
                          </span>
                        )}
                      </div>
                      <h2>
                        {w.word}
                        <button
                          className="icon-button"
                          onClick={() =>
                            voice.speak(`${w.word}. ${w.meaning} For example: ${w.example}`)
                          }
                          disabled={!voice.canSpeak || voice.muted}
                          aria-label={`Hear ${w.word}`}
                        >
                          <Volume2 size={18} />
                        </button>
                      </h2>
                      <small>{w.part}</small>
                      <p>{w.meaning}</p>
                      <blockquote>“{w.example}”</blockquote>
                    </article>
                  ))}
              </div>
              {!vocabulary.some(
                (w) =>
                  (libraryFilter === 'all' || progress.learned.includes(w.id)) &&
                  `${w.word} ${w.level} ${w.meaning}`.toLowerCase().includes(query.toLowerCase()),
              ) && (
                <div className="empty-state">
                  <BookOpen size={35} />
                  <h2>{query ? 'No words found.' : 'Your first word is waiting.'}</h2>
                  <p>
                    {query
                      ? 'Try another word, meaning, or level.'
                      : 'Start a conversation and your practiced words will appear here.'}
                  </p>
                  <button className="primary compact" onClick={home}>
                    Let’s learn
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {view === 'progress' && (
            <>
              <div className="page-heading compact-heading">
                <div>
                  <div className="eyebrow">EVERY SMALL STEP COUNTS</div>
                  <h1>Look how far you’ve come.</h1>
                  <p>A clear view of your practice, saved on this device.</p>
                </div>
              </div>
              <div className="progress-stats">
                {[
                  { icon: BookOpen, value: progress.learned.length, label: 'Words practiced' },
                  {
                    icon: CheckCheck,
                    value: progress.sessions.length,
                    label: 'Completed sessions',
                  },
                  {
                    icon: Zap,
                    value: average === null ? '—' : `${average}%`,
                    label: 'Quiz answer accuracy',
                  },
                ].map((item) => (
                  <section className="panel progress-stat" key={item.label}>
                    <span className="icon-tile">
                      <item.icon size={20} />
                    </span>
                    <strong>{item.value}</strong>
                    <p>{item.label}</p>
                  </section>
                ))}
              </div>
              <section className="panel level-progress">
                <h2>A little further at every level.</h2>
                {levels.map((item) => {
                  const count = vocabulary.filter(
                    (w) => w.level === item && progress.learned.includes(w.id),
                  ).length;
                  return (
                    <div key={item}>
                      <div className="section-row">
                        <strong>{item}</strong>
                        <span>{count} / 20 words</span>
                      </div>
                      <div className="progress-track">
                        <span style={{ width: `${(count / 20) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </section>
              <section className="panel achievements">
                <h2>Milestones to make your own.</h2>
                {[
                  {
                    done: progress.learned.length >= 1,
                    title: 'First word',
                    text: 'Practice your first vocabulary word.',
                  },
                  {
                    done: progress.sessions.length >= 1,
                    title: 'Conversation starter',
                    text: 'Finish a session and its quiz.',
                  },
                  {
                    done: progress.learned.length >= 20,
                    title: 'Word collector',
                    text: 'Practice 20 different words.',
                  },
                ].map((a) => (
                  <div className={a.done ? 'earned' : ''} key={a.title}>
                    <Trophy size={23} />
                    <span>
                      <strong>{a.title}</strong>
                      <small>{a.text}</small>
                    </span>
                    <span className="achievement-status">{a.done ? 'Earned' : 'Keep going'}</span>
                  </div>
                ))}
              </section>
              <section className="panel history">
                <h2>Your recent sessions</h2>
                {progress.sessions.length ? (
                  [...progress.sessions]
                    .reverse()
                    .slice(0, 10)
                    .map((s) => (
                      <div key={s.id}>
                        <span className="icon-tile">
                          <AudioLines size={18} />
                        </span>
                        <div>
                          <strong>{s.level} conversation</strong>
                          <small>
                            {new Date(s.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}{' '}
                            · {s.practiced.length} words practiced
                          </small>
                        </div>
                        <span>{s.quizScore} / 5 correct</span>
                      </div>
                    ))
                ) : (
                  <div className="history-empty">
                    <Clock3 size={22} />
                    <p>Your completed sessions will appear here.</p>
                  </div>
                )}
              </section>
              <div className="data-controls">
                <p>Progress stays in this browser. Clearing browser data removes it.</p>
                {confirmClear ? (
                  <div>
                    <span>Clear all saved progress?</span>
                    <button
                      className="danger-button"
                      onClick={() => {
                        setProgress(emptyProgress());
                        dispatch({ type: 'RESET' });
                        voice.stop();
                        setConfirmClear(false);
                      }}
                    >
                      Yes, clear progress
                    </button>
                    <button className="text-button" onClick={() => setConfirmClear(false)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button className="text-button" onClick={() => setConfirmClear(true)}>
                    Reset progress
                  </button>
                )}
              </div>
            </>
          )}
        </main>
        <footer>
          <span>
            voca AI <span className="text-dot">·</span> A little more confident.
          </span>
          <button onClick={() => setHelp(true)}>
            Made for your next conversation
            <ArrowDown size={12} />
          </button>
        </footer>
      </div>
      {settingsOpen && (
        <LearnerSettings
          settings={settings}
          onSave={applySettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {help && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setHelp(false);
          }}
        >
          <HelpDialog onClose={closeHelp} />
        </div>
      )}
    </div>
  );
}
