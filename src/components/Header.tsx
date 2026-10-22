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
  const role = profile.role;

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
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[var(--bg-primary)]/85 border-b border-[var(--border-subtle)] transition-colors lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-[#263539] lg:bg-[var(--color-dark)] lg:text-[var(--color-dark-copy)]">
      {/* =========================================================================
          Mobile / Tablet Top Bar (< lg: 0px – 1023px)
          Preserved for U03; minimal breakpoint bridge to lg:
          ========================================================================= */}
      <div className="lg:hidden max-w-5xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
        {/* Mobile Logo / Monogram */}
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

        {/* Mobile Action Controls (Preserved for U03 cleanup) */}
        <div className="flex items-center gap-2">
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
          className="lg:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-6 py-6 space-y-4 shadow-xl transition-all"
        >
          <nav className="flex flex-col space-y-2 text-base font-medium" aria-label={dict.common.mobileMenu}>
            <Link
              href={`/${locale}/`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={activeRoute === 'home' ? 'page' : undefined}
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
              aria-current={activeRoute === 'about' ? 'page' : undefined}
              className={`min-h-[44px] flex items-center px-4 rounded-lg transition-colors ${
                activeRoute === 'about'
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              {dict.common.about}
            </Link>
            <Link
              href={`/${locale}/#contact`}
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-[44px] flex items-center px-4 rounded-lg transition-colors text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            >
              {dict.common.contact}
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
              aria-label={dict.common.switchLanguage}
            >
              {dict.common.switchLanguage}
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          Desktop Graphite Editorial Left Rail (>= lg: 1024px+)
          Fixed editorial identity & navigation rail matching wrapper offset
          ========================================================================= */}
      <div className="hidden lg:flex lg:flex-col lg:justify-between lg:h-full lg:p-6">
        {/* Top: Identity & Authentic Profile */}
        <div className="space-y-6">
          <Link
            href={`/${locale}/`}
            className="group block space-y-3 rounded-lg p-1 -m-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            aria-label={`${name} — ${dict.common.home}`}
          >
            {/* Monogram Box */}
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center font-mono font-bold text-sm text-[var(--color-brick)] group-hover:border-[var(--color-brick)] transition-colors shadow-sm">
              DTM
            </div>

            {/* Authentic Identity */}
            <div className="space-y-1">
              <div className="font-display font-bold text-lg text-white tracking-tight leading-snug group-hover:text-[var(--color-dark-copy)] transition-colors">
                {name}
              </div>
              <div className="font-mono text-xs text-[var(--color-dark-copy)]/70 uppercase tracking-wider">
                {role}
              </div>
            </div>
          </Link>

          {/* Ledger divider line */}
          <div className="h-px w-full bg-white/10" aria-hidden="true" />

          {/* Editorial Typographic Navigation */}
          <nav className="flex flex-col space-y-1" aria-label={dict.common.mainNavigation}>
            <Link
              href={`/${locale}/`}
              aria-current={activeRoute === 'home' ? 'page' : undefined}
              className={`flex items-center min-h-[44px] px-3 rounded-md text-sm transition-colors border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                activeRoute === 'home'
                  ? 'border-[var(--color-brick)] bg-white/10 text-white font-semibold'
                  : 'border-transparent text-[var(--color-dark-copy)]/80 hover:text-white hover:bg-white/5 font-medium'
              }`}
            >
              {dict.common.home}
            </Link>

            <Link
              href={`/${locale}/about/`}
              aria-current={activeRoute === 'about' ? 'page' : undefined}
              className={`flex items-center min-h-[44px] px-3 rounded-md text-sm transition-colors border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                activeRoute === 'about'
                  ? 'border-[var(--color-brick)] bg-white/10 text-white font-semibold'
                  : 'border-transparent text-[var(--color-dark-copy)]/80 hover:text-white hover:bg-white/5 font-medium'
              }`}
            >
              {dict.common.about}
            </Link>

            <Link
              href={`/${locale}/#contact`}
              className="flex items-center min-h-[44px] px-3 rounded-md text-sm transition-colors border-l-2 border-transparent text-[var(--color-dark-copy)]/80 hover:text-white hover:bg-white/5 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {dict.common.contact}
            </Link>
          </nav>
        </div>

        {/* Bottom: Utilities & Locale Switch */}
        <div className="pt-6 border-t border-white/10">
          <Link
            href={targetOtherPath}
            onClick={handleLocaleSwitch}
            className="min-h-[44px] w-full px-3.5 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-[var(--color-dark-copy)] hover:text-white border border-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            aria-label={dict.common.switchLanguage}
          >
            {dict.common.switchLanguage}
          </Link>
        </div>
      </div>
    </header>
  );
}
