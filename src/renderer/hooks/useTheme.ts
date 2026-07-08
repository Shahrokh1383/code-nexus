import { useState, useEffect } from 'react';

const STORAGE_KEY = 'codenexus-theme';

export function useTheme(): { isLight: boolean; toggleTheme: () => void } {
  const [isLight, setIsLight] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isLight) {
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
    }
    localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');
  }, [isLight]);

  const toggleTheme = (): void => {
    setIsLight((prev) => !prev);
  };

  return { isLight, toggleTheme };
}