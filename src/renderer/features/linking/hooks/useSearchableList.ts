import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface UseSearchableListOptions<T> {
  items: T[];
  onSelect: (id: string) => void;
  getSearchText: (item: T) => string;
  getId: (item: T) => string;
}

export function useSearchableList<T>({ items, onSelect, getSearchText, getId }: UseSearchableListOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(item => getSearchText(item).toLowerCase().includes(lower));
  }, [items, searchTerm, getSearchText]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [searchTerm]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setSearchTerm('');
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredItems.length === 0) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => (prev + 1) % filteredItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[focusedIndex]) {
            handleSelect(getId(filteredItems[focusedIndex]));
          }
          break;
        case 'Escape':
          e.preventDefault();
          setSearchTerm('');
          inputRef.current?.blur();
          break;
      }
    },
    [filteredItems, focusedIndex, handleSelect, getId]
  );

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[focusedIndex] as HTMLLIElement | undefined;
    if (item) {
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    inputRef.current?.focus();
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    focusedIndex,
    inputRef,
    listRef,
    handleKeyDown,
    handleSelect,
    clearSearch,
  };
}