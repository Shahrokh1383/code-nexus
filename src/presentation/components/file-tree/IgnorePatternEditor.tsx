import { useState, type JSX, type FormEvent } from 'react';
import { useIgnorePatterns } from '../../hooks/useIgnorePatterns';

export function IgnorePatternEditor(): JSX.Element {
  const { ignoredPatterns, addPattern, removePattern } = useIgnorePatterns();
  const [newPattern, setNewPattern] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPattern.trim()) return;
    setIsAdding(true);
    await addPattern(newPattern.trim());
    setNewPattern('');
    setIsAdding(false);
  };

  return (
    <div className="ignore-editor">
      <h3 className="ignore-editor__title">
        <i className="fa-solid fa-eye-slash" /> Ignore Patterns
      </h3>
      
      <form onSubmit={handleAdd} className="ignore-editor__form">
        <input
          type="text"
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          placeholder="e.g., node_modules/ or *.log"
          className="ignore-editor__input"
          disabled={isAdding}
        />
        <button type="submit" className="btn-primary" disabled={isAdding || !newPattern.trim()}>
          {isAdding ? 'Adding...' : 'Add'}
        </button>
      </form>

      <ul className="ignore-editor__list">
        {ignoredPatterns.map((pattern) => (
          <li key={pattern} className="ignore-editor__item">
            <code>{pattern}</code>
            <button className="btn-ghost ignore-editor__remove" onClick={() => removePattern(pattern)} aria-label={`Remove ${pattern}`}>
              <i className="fa-solid fa-trash-can" />
            </button>
          </li>
        ))}
        {ignoredPatterns.length === 0 && <li className="ignore-editor__empty">No ignore patterns configured.</li>}
      </ul>
    </div>
  );
}