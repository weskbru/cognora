import { useEffect, useState } from 'react';
import { getStoredValue, setStoredValue } from '@/lib/safeStorage';

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  return getStoredValue('local', 'cognora_theme') === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    setStoredValue('local', 'cognora_theme', theme);
  }, [theme]);

  const toggle = () => setTheme(current => (current === 'dark' ? 'light' : 'dark'));
  return { theme, toggle, isDark: theme === 'dark' };
}
