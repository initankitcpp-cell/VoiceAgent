import { ArrowRight, CheckCheck, ExternalLink, SpellCheck } from 'lucide-react';
import { correctedSentence, type GrammarResult } from '../lib/grammar';
import { grammarLearningNote } from '../data/learningSupport';
import { languageById } from '../data/languages';

export function GrammarFeedback({
  result,
  onApply,
  languageId = 'en',
}: {
  result: GrammarResult;
  onApply: (text: string) => void;
  languageId?: string;
}) {
  const suggestion =
    result.status === 'checked' ? correctedSentence(result.text, result.issues) : result.text;
  return (
    <section
      className={`grammar-feedback ${result.status === 'unavailable' ? 'unavailable' : result.issues.length ? 'has-issues' : 'all-clear'}`}
      aria-label="Grammar check results"
    >
      <div className="grammar-heading">
        <span>
          {result.status === 'checked' && !result.issues.length ? (
            <CheckCheck size={17} />
          ) : (
            <SpellCheck size={17} />
          )}
          <strong>
            {result.status === 'unavailable'
              ? 'Grammar not checked'
              : result.issues.length
                ? `${result.issues.length} writing ${result.issues.length === 1 ? 'suggestion' : 'suggestions'}`
                : 'No writing issues found'}
          </strong>
        </span>
        <a href="https://languagetool.org" target="_blank" rel="noopener noreferrer">
          LanguageTool
          <ExternalLink size={11} />
        </a>
      </div>
      {result.status === 'unavailable' ? (
        <p>{result.message} Your sentence has not passed grammar checking.</p>
      ) : result.issues.length ? (
        <>
          <p className="grammar-submitted">Review of your submitted sentence: “{result.text}”</p>
          <ul className="grammar-issues">
            {result.issues.map((issue, index) => (
              <li key={`${issue.ruleId}-${issue.offset}-${index}`}>
                <span className="grammar-category">{issue.category}</span>
                {grammarLearningNote(issue, languageId) && (
                  <p lang={languageById(languageId).locale}>
                    {grammarLearningNote(issue, languageId)}
                  </p>
                )}
                <p lang="en-IN">
                  {languageId !== 'en' ? 'Service detail (English): ' : ''}
                  {issue.message}
                </p>
                {issue.replacements.length > 0 && (
                  <div className="grammar-replacements">
                    <span>
                      {result.text.slice(issue.offset, issue.offset + issue.length) || '(insert)'}
                    </span>
                    <ArrowRight size={12} />
                    <strong>{issue.replacements.join(' / ') || '(remove)'}</strong>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {suggestion !== result.text && (
            <div className="grammar-suggestion">
              <span className="mini-label">SUGGESTED SENTENCE</span>
              <p>{suggestion}</p>
              <button className="subtle-button" onClick={() => onApply(suggestion)}>
                Use suggested sentence
                <ArrowRight size={14} />
              </button>
              <small>
                Review it, then send again to recheck. Suggestions may change your intended meaning.
              </small>
            </div>
          )}
        </>
      ) : (
        <p>
          LanguageTool found no grammar, spelling, or punctuation issues in your submitted sentence.
          Automated checks can miss mistakes and do not assess your intended meaning or
          pronunciation.
        </p>
      )}
    </section>
  );
}
