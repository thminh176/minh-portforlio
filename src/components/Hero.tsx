import Link from 'next/link';
import type { Profile } from '@/lib/content/types';

interface HeroProps {
  locale: string;
  profile: Profile;
}

export default function Hero({ locale, profile }: HeroProps) {
  const isVi = locale === 'vi';
  const primaryCta = isVi ? 'Trao đổi với mình' : 'Get in touch';
  const secondaryCta = isVi ? 'Về mình' : 'About me';

  return (
    <section className="pt-0 sm:pt-2 pb-12 sm:pb-16 border-b border-[var(--color-border)] text-left">
      {/* Mono Top Ledger Label (Desktop only >= 1024px) */}
      <div className="hidden lg:flex items-center justify-between text-xs font-mono tracking-wider uppercase text-[var(--text-secondary)] pb-3 border-b border-[var(--color-border)] mb-8 sm:mb-12">
        <span>SELECTED WORK / PORTFOLIO</span>
      </div>

      <div className="max-w-3xl flex flex-col gap-5 lg:gap-6">
        {/* Localized Mono Identity/Role Kicker (Mobile only < 1024px) */}
        <div className="lg:hidden font-mono text-xs sm:text-sm tracking-wider uppercase text-[var(--color-brick-deep)] font-medium">
          {profile.hero.kicker}
        </div>

        {/* Large Identity Line (Desktop only >= 1024px) */}
        <div className="hidden lg:block font-display text-3xl sm:text-4xl lg:text-[44px] font-bold text-[var(--color-ink)] leading-tight tracking-tight">
          {profile.name}
        </div>

        {/* Short Brick Accent Rule (Desktop only >= 1024px) */}
        <div
          className="hidden lg:block w-12 h-1 bg-[var(--color-brick-deep)]"
          aria-hidden="true"
        />

        {/* Single Semantic H1: Multiline Narrative */}
        <h1 className="font-display text-[32px] leading-[1.18] sm:text-4xl sm:leading-tight md:text-5xl lg:text-[56px] lg:leading-[1.12] font-bold text-[var(--color-ink)] tracking-tight">
          {profile.hero.headlineLines.map((line, idx) => (
            <span className="block" key={line}>
              {line}
              {idx < profile.hero.headlineLines.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h1>

        {/* Supporting Editorial Copy */}
        <p className="font-body text-sm sm:text-base lg:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl pt-1 sm:pt-2">
          {profile.hero.supporting}
        </p>

        {/* Real CTAs */}
        <div className="pt-2 sm:pt-4 flex flex-wrap items-center gap-3 sm:gap-4">
          <a
            href="#contact"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--color-dark)] text-white hover:bg-[var(--color-ink)] font-medium text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2 min-h-[44px] rounded-xs"
          >
            <span>{primaryCta}</span>
            <span aria-hidden="true">↗</span>
          </a>
          <Link
            href={`/${locale}/about/`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--color-subtle)] text-[var(--color-ink)] hover:bg-[#E4E2DA] border border-[var(--color-border)] font-medium text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2 min-h-[44px] rounded-xs"
          >
            <span>{secondaryCta}</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
