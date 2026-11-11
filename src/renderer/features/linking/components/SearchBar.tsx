import { JSX, Ref } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  'aria-label'?: string;
  inputRef?: Ref<HTMLInputElement>;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  onKeyDown,
  'aria-label': ariaLabel,
  inputRef,
}: SearchBarProps): JSX.Element {
  return (
    <div className="search-bar">
      <i className="fa-solid fa-search search-bar__icon" />
      <input
        ref={inputRef}
        type="text"
        className="search-bar__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
      />
      {value && (
        <button
          type="button"
          className="search-bar__clear-btn"
          onClick={onClear}
          aria-label="Clear search"
          title="Clear search"
        >
          <i className="fa-solid fa-times" />
        </button>
      )}
    </div>
  );
}