import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { languages } from '../data/languages';

export function LanguagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const matches = languages.filter((language) =>
    `${language.name} ${language.nativeName}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  return (
    <>
      <label className="search-field language-search">
        <Search size={17} />
        <span className="sr-only">Search languages</span>
        <input
          placeholder="Search your language…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="language-grid">
        {matches.map((language) => (
          <button
            key={language.id}
            className={`language-card ${value === language.id ? 'chosen' : ''}`}
            onClick={() => onChange(language.id)}
            aria-pressed={value === language.id}
            aria-label={`${language.name} ${language.nativeName}`}
          >
            <span lang={language.locale} dir={language.direction}>
              {language.nativeName}
            </span>
            <strong>{language.name}</strong>
            <small>
              {language.id === 'en'
                ? 'English fallback'
                : language.bundled
                  ? 'Bundled bilingual lessons'
                  : 'Optional AI • English fallback'}
            </small>
            {value === language.id && <Check size={16} />}
          </button>
        ))}
      </div>
      {matches.length === 0 && (
        <p className="language-empty">No matching language. Try its English or native name.</p>
      )}
    </>
  );
}
