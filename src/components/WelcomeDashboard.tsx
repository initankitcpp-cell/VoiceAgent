import {
  ArrowRight,
  AudioLines,
  Check,
  Clock3,
  Headphones,
  Mic,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { levels, type Level } from '../data/vocabulary';
import type { Progress } from '../lib/storage';
import { Orb } from './Orb';
import { categories, type CategoryId } from '../data/categories';
import type { Language } from '../data/languages';
interface Props {
  level: Level;
  setLevel: (level: Level) => void;
  progress: Progress;
  start: () => void;
  language: Language;
  category: CategoryId;
  onCategoryChange: (id: CategoryId) => void;
  onChangeLanguage: () => void;
}
export function WelcomeDashboard({
  level,
  setLevel,
  progress,
  start,
  language,
  category,
  onCategoryChange,
  onChangeLanguage,
}: Props) {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="little-line" /> MAKE ROOM FOR A NEW WORD
          </div>
          <h1>
            Find your words.
            <br />
            <span>Find your confidence.</span>
          </h1>
          <p>Learn English, one conversation at a time.</p>
          <button className="language-preference-button" onClick={onChangeLanguage}>
            <span lang={language.locale} dir={language.direction}>
              {language.nativeName}
            </span>
            <span>Change Language</span>
          </button>
        </div>
        <div className="daily-tag">
          <Sparkles size={15} /> A little better, every day
        </div>
      </div>
      <div className="welcome-grid">
        <section className="welcome-card panel">
          <div className="card-topline">
            <span className="pill">
              <span className="green-dot" /> YOUR VOICE. YOUR PACE.
            </span>
            <span className="session-length">
              <Clock3 size={14} /> ~5 min
            </span>
          </div>
          <Orb />
          <div className="orb-caption">
            <span className="sparkle-label">
              <Sparkles size={14} /> MEET YOUR VOICE TUTOR
            </span>
            <h2>A conversation worth having.</h2>
            <p>
              A few new words. A little speaking practice.
              <br />A more confident you.
            </p>
          </div>
          <div className="level-chooser">
            <div className="section-row">
              <label>Choose your starting point</label>
              <span>You can change it anytime</span>
            </div>
            <div className="level-options">
              {levels.map((item, index) => (
                <button
                  key={item}
                  className={`level-option ${level === item ? 'chosen' : ''}`}
                  onClick={() => setLevel(item)}
                  aria-pressed={level === item}
                >
                  <span className={`level-bars bars-${index}`}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <strong>{item}</strong>
                  <small>
                    {['Build the basics', 'Go a little deeper', 'Express with nuance'][index]}
                  </small>
                  {level === item && (
                    <span className="level-check">
                      <Check size={11} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <label className="category-picker">
            Make it useful in your world
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value as CategoryId)}
            >
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <span>{categories.find((item) => item.id === category)?.description}</span>
          </label>
          <button className="primary start-button" onClick={start}>
            <AudioLines size={19} />
            Start Learning
            <ArrowRight size={18} />
          </button>
          <p className="card-footnote">
            <Headphones size={13} /> Headphones are nice. Curiosity is all you need.
          </p>
        </section>
        <div className="welcome-side">
          <section className="panel today-card">
            <div className="section-row">
              <span className="mini-label">SMALL STEPS, REAL PROGRESS</span>
              <span className="icon-tile">
                <TrendingUp size={17} />
              </span>
            </div>
            <h2>Your words add up.</h2>
            <p>Every word is another way to express yourself.</p>
            <div className="stats-row">
              <div>
                <strong>
                  {progress.learned.length}
                  <span> / 60</span>
                </strong>
                <small>words practiced</small>
              </div>
              <div>
                <strong>{progress.sessions.length}</strong>
                <small>sessions completed</small>
              </div>
            </div>
            <div className="progress-track">
              <span style={{ width: `${(progress.learned.length / 60) * 100}%` }} />
            </div>
            <div className="progress-caption">
              <span>Your vocabulary journey</span>
              <span>{Math.round((progress.learned.length / 60) * 100)}%</span>
            </div>
          </section>
          <section className="panel how-card">
            <div className="mini-label">YOUR NEXT 5 MINUTES</div>
            <h2>Less studying. More speaking.</h2>
            {[
              {
                icon: Headphones,
                title: 'Listen & discover',
                text: 'Meet a word in a real-life example.',
              },
              {
                icon: Mic,
                title: 'Make it your own',
                text: 'Say it aloud or try it in a sentence.',
              },
              {
                icon: Zap,
                title: 'Let it stick',
                text: 'A quick quiz to bring it all together.',
              },
            ].map((step, i) => (
              <div className="how-step" key={step.title}>
                <span className={`step-icon step-${i}`}>
                  <step.icon size={17} />
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </section>
          <div className="quiet-note">
            <ShieldCheck size={17} />
            <p>
              No account. No API key.
              <br />
              <span>Just you and your next word.</span>
            </p>
          </div>
        </div>
      </div>
      <div className="bottom-strip">
        <span>
          <span className="green-dot" /> Browser-powered guided voice tutor
        </span>
        <span>
          60 curated words <b>·</b> 3 levels <b>·</b> Limitless practice
        </span>
      </div>
    </>
  );
}
