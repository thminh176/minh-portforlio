'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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

  // Close mobile menu on window resize to desktop breakpoint (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--color-paper)]/95 backdrop-blur-sm border-b border-[var(--color-border)] transition-colors lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-[#263539] lg:bg-[var(--color-dark)] lg:text-[var(--color-dark-copy)] lg:backdrop-blur-none">
      {/* =========================================================================
          Mobile / Tablet Top Bar (< lg: 0px – 1023px)
          Restrained paper/ink topbar with authentic TM identity & accessible MENU
          ========================================================================= */}
      <div className="lg:hidden max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Mobile Logotype / Authentic Identity */}
        <Link
          href={`/${locale}/`}
          className="flex items-center gap-2 group rounded-md p-1 -m-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          aria-label={`${name} — ${dict.common.home}`}
        >
          <span className="font-display font-bold text-2xl tracking-tight text-[var(--color-ink)] group-hover:text-[var(--color-brick-deep)] transition-colors">
            TM.
          </span>
          <span className="sr-only sm:not-sr-only sm:font-display sm:font-medium sm:text-sm sm:text-[var(--color-muted)] sm:tracking-tight sm:pl-2 sm:border-l sm:border-[var(--color-border)]">
            {name}
          </span>
        </Link>

        {/* Mobile Action Controls: Accessible Menu Trigger matching Figma node 12:2 */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? dict.common.closeMenu : dict.common.openMenu}
            className="min-h-[44px] min-w-[44px] px-3 flex items-center gap-2 rounded-md font-mono text-xs font-semibold tracking-wider uppercase text-[var(--color-ink)] hover:text-[var(--color-brick-deep)] border border-[var(--color-border)] bg-[var(--color-subtle)] hover:bg-[var(--color-border)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <span>{mobileMenuOpen ? (locale === 'vi' ? 'ĐÓNG' : 'CLOSE') : 'MENU'}</span>
            {mobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown (Collapsible Navigation) */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-paper)] px-4 sm:px-6 py-5 space-y-4 shadow-lg transition-all"
        >
          <nav className="flex flex-col space-y-1.5 text-base font-medium" aria-label={dict.common.mobileMenu}>
            <Link
              href={`/${locale}/`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={activeRoute === 'home' ? 'page' : undefined}
              className={`min-h-[44px] flex items-center px-4 rounded-md text-sm sm:text-base font-medium transition-colors border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                activeRoute === 'home'
                  ? 'border-[var(--color-brick)] bg-[var(--color-subtle)] text-[var(--color-brick-deep)] font-semibold'
                  : 'border-transparent text-[var(--color-ink)] hover:bg-[var(--color-subtle)]'
              }`}
            >
              {dict.common.home}
            </Link>
            <Link
              href={`/${locale}/about/`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={activeRoute === 'about' ? 'page' : undefined}
              className={`min-h-[44px] flex items-center px-4 rounded-md text-sm sm:text-base font-medium transition-colors border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                activeRoute === 'about'
                  ? 'border-[var(--color-brick)] bg-[var(--color-subtle)] text-[var(--color-brick-deep)] font-semibold'
                  : 'border-transparent text-[var(--color-ink)] hover:bg-[var(--color-subtle)]'
              }`}
            >
              {dict.common.about}
            </Link>
            <Link
              href={`/${locale}/#contact`}
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-[44px] flex items-center px-4 rounded-md text-sm sm:text-base font-medium transition-colors border-l-2 border-transparent text-[var(--color-ink)] hover:bg-[var(--color-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {dict.common.contact}
            </Link>
          </nav>

          <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-[var(--color-muted)] uppercase tracking-wider">
              Language / Ngôn ngữ
            </span>
            <Link
              href={targetOtherPath}
              onClick={() => {
                handleLocaleSwitch();
                setMobileMenuOpen(false);
              }}
              className="min-h-[44px] min-w-[44px] px-4 flex items-center justify-center rounded-md bg-[var(--color-subtle)] hover:bg-[var(--color-border)] text-xs font-semibold text-[var(--color-ink)] border border-[var(--color-border)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
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
