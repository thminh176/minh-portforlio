import Link from 'next/link';
import { getDictionary } from '@/i18n';
import { profileConfig } from '@/config/profile';

interface HeroProps {
  locale: string;
}

export default function Hero({ locale }: HeroProps) {
  const profile = locale === 'vi' ? profileConfig.vi : profileConfig.en;
  const dict = getDictionary(locale);

  const name = profile.name;
  const role = profile.role;
  const tagline = profile.tagline;

  return (
    <section className="py-12 sm:py-20 lg:py-24 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
      {/* Narrative & Action Content */}
      <div className="flex-1 space-y-6 text-center lg:text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-strong)] shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" aria-hidden="true" />
          <span>{role}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.1]">
          {name}
        </h1>

        <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
          {tagline}
        </p>

        {/* CTA Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4">
          <a
            href="#contact"
            className="min-h-[48px] px-6 py-3 rounded-lg bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] font-semibold text-sm transition-colors shadow-md flex items-center justify-center cursor-pointer"
          >
            {dict.home.ctaDiscuss}
          </a>
          <Link
            href={`/${locale}/about/`}
            className="min-h-[48px] px-6 py-3 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-strong)] hover:border-[var(--accent-primary)] font-medium text-sm transition-colors flex items-center justify-center cursor-pointer"
          >
            {dict.common.about}
          </Link>
        </div>
      </div>

      {/* DTM Abstract Geometric SVG Visual */}
      <div className="w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[380px] aspect-square flex items-center justify-center relative select-none">
        {/* Subtle Ambient Glow */}
        <div
          className="absolute inset-0 rounded-full bg-[var(--accent-subtle)] blur-2xl transform-gpu -z-10"
          aria-hidden="true"
        />

        {/* Geometric Emblem SVG */}
        <svg
          viewBox="0 0 320 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-lg"
          role="img"
          aria-label={`DTM Monogram Visual — ${name}`}
        >
          {/* Outer Geometric Frame */}
          <rect
            x="20"
            y="20"
            width="280"
            height="280"
            rx="32"
            stroke="var(--border-strong)"
            strokeWidth="2"
            className="transition-colors"
          />

          {/* Inner Accent Diamond Grid Motif */}
          <rect
            x="160"
            y="48"
            width="158"
            height="158"
            rx="16"
            transform="rotate(45 160 48)"
            stroke="var(--accent-primary)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            className="opacity-40"
          />

          {/* Precision SVG Path Monogram: D, T, M */}
          {/* 'D' Structure */}
          <path
            d="M 68 85 L 68 235 L 115 235 C 158 235 158 85 115 85 Z"
            stroke="var(--text-primary)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 'T' Central Crossbeam & Pillar */}
          <path
            d="M 125 105 L 195 105 M 160 105 L 160 235"
            stroke="var(--accent-primary)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 'M' Architectural Structure */}
          <path
            d="M 185 235 L 185 130 L 218 185 L 251 130 L 251 235"
            stroke="var(--text-primary)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Decorative Geometric Node Points */}
          <circle cx="68" cy="85" r="5" fill="var(--accent-primary)" />
          <circle cx="160" cy="105" r="5" fill="var(--text-primary)" />
          <circle cx="251" cy="235" r="5" fill="var(--accent-primary)" />
        </svg>
      </div>
    </section>
  );
}
