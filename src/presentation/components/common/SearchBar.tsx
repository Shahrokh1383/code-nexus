import { forwardRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  'aria-label'?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ value, onChange, placeholder = 'Search...', onClear, onKeyDown, 'aria-label': ariaLabel, inputRef }, ref) => {
    const combinedRef = (el: HTMLInputElement) => {
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof inputRef === 'function') inputRef(el);
      else if (inputRef) (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    };

    return (
      <div className="search-bar">
        <i className="fa-solid fa-search search-bar__icon" />
        <input
          ref={combinedRef}
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
);