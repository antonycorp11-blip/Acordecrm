import { useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'acorde_app_theme';

function savedTheme(): AppTheme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function useAppTheme() {
  const [choice, setChoice] = useState<AppTheme | null>(savedTheme);
  const [systemTheme, setSystemTheme] = useState<AppTheme>(() =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const setTheme = (theme: AppTheme | null) => {
    setChoice(theme);
    try {
      if (theme) localStorage.setItem(STORAGE_KEY, theme);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // O tema continua funcionando enquanto a tela estiver aberta.
    }
  };

  return { theme: choice || systemTheme, choice, setTheme };
}
