import Link from 'next/link';
import type { Project } from '@/lib/content/types';

interface FeaturedPortfolioProjectProps {
  locale: string;
  project: Project;
  position: number;
  showPortfolioArtwork: boolean;
}

export default function FeaturedPortfolioProject({ locale, project, position, showPortfolioArtwork }: FeaturedPortfolioProjectProps) {
  const isVi = locale === 'vi';
  const repoLabel = isVi ? 'Xem mã nguồn trên GitHub' : 'View source code on GitHub';
  const repoAriaLabel = isVi
    ? `${project.title} - Xem mã nguồn trên GitHub (mở trong tab mới)`
    : `${project.title} - View source code on GitHub (opens in new tab)`;

  return (
    <article className="space-y-3">
      {/* Mono Ledger */}
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
        <span>REPOSITORY / {String(position).padStart(2, '0')}</span>
      </div>

      {/* Paper-Subtle Portfolio Panel */}
      <div className="bg-[var(--color-subtle)] text-[var(--color-ink)] border border-[var(--color-border)] rounded-xs p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content (Left) */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-ink)] tracking-tight">
              <Link href={`/${locale}/projects/${project.slug}/`}>{project.title}</Link>
            </h3>

            <p className="font-body text-sm sm:text-base text-[var(--color-ink)] leading-relaxed max-w-xl">
              {project.summary}
            </p>

            {/* Plain Monospace Tech Labels */}
            <div className="pt-2 sm:pt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono text-[var(--color-ink)]">
              {project.technologies.map(technology => <span key={technology}>{technology}</span>)}
            </div>
          </div>

          {/* Typographic Visual Aside (Desktop Only) */}
          {showPortfolioArtwork && <div className="hidden lg:flex lg:col-span-4 w-full justify-end" aria-hidden="true">
            <div className="w-full sm:w-52 bg-[var(--color-muted-visual)] border border-[var(--color-border)] rounded-xs p-5 font-mono flex flex-col justify-between min-h-[140px]">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-ink)]">
                NEXT.JS
              </span>
              <span className="text-xs uppercase tracking-wider text-[var(--color-brick-deep)] font-semibold">
                STATIC EXPORT
              </span>
            </div>
          </div>}
        </div>

        {/* Bottom Rule and GitHub Link */}
        <div className="mt-8 pt-6 border-t border-[var(--color-border)] flex items-center justify-between flex-wrap gap-4">
          <a
            href={project.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={repoAriaLabel}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-brick-deep)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2 min-h-[44px] py-2"
          >
            <span>{repoLabel}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}
