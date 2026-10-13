'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { getDictionary } from '@/i18n';
import { profileConfig } from '@/config/profile';

interface HeaderProps {
  locale: string;
  activeRoute?: 'home' | 'about';
}

export default function Header({ locale, activeRoute = 'home' }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const dict = getDictionary(locale);
  const profile = locale === 'vi' ? profileConfig.vi : profileConfig.en;
  const name = profile.name;

  const isVi = locale === 'vi';
  const otherLocale = isVi ? 'en' : 'vi';
  const targetOtherPath = activeRoute === 'about' ? `/${otherLocale}/about/` : `/${otherLocale}/`;

  const handleLocaleSwitch = () => {
    try {
      localStorage.setItem('dtm_locale', otherLocale);
    } catch {
      // Safe fallback when localStorage is blocked or unavailable
    }
  };

  // Close mobile menu on Escape key and restore focus to trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuTriggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[var(--bg-primary)]/85 border-b border-[var(--border-subtle)] transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
        {/* Logo / Monogram */}
        <Link
          href={`/${locale}/`}
          className="flex items-center gap-3 group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] p-1"
          aria-label={`${name} — ${dict.common.home}`}
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center font-mono font-bold text-sm text-[var(--accent-primary)] group-hover:border-[var(--accent-primary)] transition-colors shadow-sm">
            DTM
          </div>
          <span className="font-semibold text-base sm:text-lg tracking-tight text-[var(--text-primary)]">
            {name}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium" aria-label={dict.common.mainNavigation}>
          <Link
            href={`/${locale}/`}
            className={`transition-colors py-2 px-1 border-b-2 ${
              activeRoute === 'home'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {dict.common.home}
          </Link>
          <Link
            href={`/${locale}/about/`}
            className={`transition-colors py-2 px-1 border-b-2 ${
              activeRoute === 'about'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {dict.common.about}
          </Link>

          <div className="h-5 w-px bg-[var(--border-subtle)]" aria-hidden="true" />

          {/* Language Switch */}
          <Link
            href={targetOtherPath}
            onClick={handleLocaleSwitch}
            className="min-h-[44px] min-w-[44px] px-3.5 flex items-center justify-center rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--accent-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors"
            aria-label={dict.common.switchLanguage}
          >
            {dict.common.switchLanguage}
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle locale={locale} />
        </nav>

        {/* Mobile Action Controls */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle locale={locale} />

          <button
            ref={menuTriggerRef}
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? dict.common.closeMenu : dict.common.openMenu}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-6 py-6 space-y-4 shadow-xl transition-all"
        >
          <nav className="flex flex-col space-y-2 text-base font-medium" aria-label={dict.common.mobileMenu}>
            <Link
              href={`/${locale}/`}
              onClick={() => setMobileMenuOpen(false)}
              className={`min-h-[44px] flex items-center px-4 rounded-lg transition-colors ${
                activeRoute === 'home'
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              {dict.common.home}
            </Link>
            <Link
              href={`/${locale}/about/`}
              onClick={() => setMobileMenuOpen(false)}
              className={`min-h-[44px] flex items-center px-4 rounded-lg transition-colors ${
                activeRoute === 'about'
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              {dict.common.about}
            </Link>
          </nav>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Language / Ngôn ngữ
            </span>
            <Link
              href={targetOtherPath}
              onClick={() => {
                handleLocaleSwitch();
                setMobileMenuOpen(false);
              }}
              className="min-h-[44px] min-w-[44px] px-4 flex items-center justify-center rounded-lg bg-[var(--bg-surface)] text-xs font-semibold text-[var(--accent-primary)] border border-[var(--border-subtle)]"
            >
              {dict.common.switchLanguage}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
