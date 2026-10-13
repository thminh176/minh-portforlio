'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function RootPage() {
  useEffect(() => {
    let targetLocale = 'en';

    try {
      const savedLocale = localStorage.getItem('dtm_locale');
      if (savedLocale === 'vi' || savedLocale === 'en') {
        window.location.replace(`/${savedLocale}/`);
        return;
      }
    } catch {
      // localStorage is blocked (SecurityError, cookies disabled, or sandbox)
    }

    try {
      const browserLanguages =
        navigator.languages && navigator.languages.length > 0
          ? navigator.languages
          : [navigator.language || ''];

      const prefersVi = browserLanguages.some(
        (lang) => typeof lang === 'string' && lang.toLowerCase().startsWith('vi')
      );
      targetLocale = prefersVi ? 'vi' : 'en';
    } catch {
      targetLocale = 'en';
    }

    window.location.replace(`/${targetLocale}/`);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-primary)] transition-colors">
      <div className="max-w-md w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-8 shadow-xl space-y-6">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-[var(--bg-card)] border border-[var(--border-strong)] font-mono text-xl font-bold text-[var(--accent-primary)] shadow-sm">
          DTM
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Đàm Thiên Minh / Thien Minh Dam
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Dịch vụ làm website / Website services
          </p>
        </div>

        <p className="text-xs text-[var(--accent-primary)] animate-pulse font-mono">
          Chuyển hướng theo ngôn ngữ... / Redirecting to localized version...
        </p>

        <div className="flex justify-center gap-4 pt-4 border-t border-[var(--border-subtle)]">
          <Link
            href="/vi/"
            className="min-h-[44px] px-5 py-2.5 text-sm rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-primary)] transition-colors flex items-center justify-center font-medium"
          >
            Tiếng Việt
          </Link>
          <Link
            href="/en/"
            className="min-h-[44px] px-5 py-2.5 text-sm rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-primary)] transition-colors flex items-center justify-center font-medium"
          >
            English
          </Link>
        </div>

        <noscript>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            JavaScript is disabled. Please choose your language above.
          </p>
        </noscript>
      </div>
    </main>
  );
}
