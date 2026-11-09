import { useEffect, useRef, useState } from 'react';
import { Languages, X } from 'lucide-react';
import { LanguagePicker } from './LanguagePicker';
import { levels, type Level } from '../data/vocabulary';
import { languageById } from '../data/languages';
import type { LearnerSettings as Settings } from '../lib/settings';

export function LearnerSettings({
  settings,
  onSave,
  onClose,
}: {
  settings: Settings;
  onSave: (value: Settings) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      className="panel settings-dialog"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="settings-heading"
    >
      <button className="icon-button settings-close" onClick={onClose} aria-label="Close settings">
        <X size={20} />
      </button>
      <div className="eyebrow">
        <Languages size={17} /> YOUR LEARNING PREFERENCES
      </div>
      <h2 id="settings-heading">Change Language</h2>
      <p>
        Keep learning English with {languageById(draft.languageId).name} support. Your words,
        quizzes, and saved progress stay intact.
      </p>
      <LanguagePicker
        value={draft.languageId}
        onChange={(languageId) => setDraft((value) => ({ ...value, languageId }))}
      />
      <label className="settings-level">
        Starting level for future sessions
        <select
          value={draft.level}
          onChange={(event) =>
            setDraft((value) => ({ ...value, level: event.target.value as Level }))
          }
        >
          {levels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </select>
      </label>
      <div className="settings-actions">
        <button className="text-button" onClick={onClose}>
          Cancel
        </button>
        <button className="primary" onClick={() => onSave(draft)}>
          Save preferences
        </button>
      </div>
    </dialog>
  );
}
