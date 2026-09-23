import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('uiTheme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    localStorage.setItem('uiTheme', theme);
  }, [theme]);

  useEffect(() => {
    if (localStorage.getItem('uiTheme')) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setThemeState(e.matches ? 'dark' : 'light');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
  }

  function toggleTheme() {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
