'use client';

import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'dtm_theme') {
      if (e.newValue === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      }
      callback();
    }
  };

  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  window.addEventListener('storage', handleStorage);
  return () => {
    observer.disconnect();
    window.removeEventListener('storage', handleStorage);
  };
}

function getSnapshot(): 'dark' | 'light' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function getServerSnapshot(): 'dark' | 'light' {
  return 'dark';
}

export default function ThemeToggle({ locale }: { locale: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      try {
        localStorage.setItem('dtm_theme', 'dark');
      } catch {
        // ignore storage errors
      }
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      try {
        localStorage.setItem('dtm_theme', 'light');
      } catch {
        // ignore storage errors
      }
    }
  };

  const isDark = theme === 'dark';
  const label =
    locale === 'vi'
      ? isDark
        ? 'Chuyển sang giao diện sáng'
        : 'Chuyển sang giao diện tối'
      : isDark
      ? 'Switch to light mode'
      : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--accent-primary)] transition-colors cursor-pointer"
    >
      {isDark ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
