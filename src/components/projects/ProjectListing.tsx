import Link from 'next/link';
import type { Locale, Project, SiteSettings } from '@/lib/content/types';

export interface ProjectListingProps {
  readonly locale: Locale;
  readonly projects: readonly Project[];
  readonly settings: SiteSettings;
}

function indexTitle(locale: Locale): string {
  return locale === 'vi' ? 'Dự án' : 'Projects';
}

export default function ProjectListing({ locale, projects, settings }: ProjectListingProps) {
  const isVi = locale === 'vi';
  const kicker = isVi ? 'DANH MỤC DỰ ÁN' : 'PROJECT DIRECTORY';
  const description = isVi
    ? 'Các dự án cá nhân mình đã và đang xây dựng, kèm liên kết mã nguồn và mô tả chi tiết.'
    : 'Personal projects I have built and am working on, with source code links and case studies.';

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Editorial Header */}
      <section className="space-y-4 max-w-3xl">
        <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brick)]" aria-hidden="true" />
          <span>{kicker}</span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--color-ink)]">
          {indexTitle(locale)}
        </h1>
        <p className="font-body text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </section>

      {/* Projects List or Honest Empty State */}
      {projects.length === 0 ? (
        <div className="py-12 border-t border-[var(--color-border)]">
          <p
            data-project-empty
            className="text-base sm:text-lg text-[var(--text-secondary)] font-body"
          >
            {isVi ? 'Chưa có dự án được công bố.' : 'No published projects yet.'}
          </p>
        </div>
      ) : (
        <section aria-label={isVi ? 'Danh sách dự án' : 'Project list'}>
          <ul
            data-project-list
            className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]"
          >
            {projects.map((record, index) => {
              const itemNumber = String(index + 1).padStart(2, '0');
              const detailHref = `/${locale}/projects/${record.slug}/`;

              return (
                <li key={record.id} className="py-8 sm:py-10 first:pt-6 last:pb-6 group">
                  <article className="space-y-4">
                    {/* Upper Ledger */}
                    <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                      <span>PROJECT / {itemNumber}</span>
                    </div>

                    {/* Title */}
                    <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)] group-hover:text-[var(--color-brick-deep)] transition-colors">
                      <Link
                        href={detailHref}
                        className="focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
                      >
                        {record.title}
                      </Link>
                    </h2>

                    {/* Summary */}
                    <p className="font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                      {record.summary}
                    </p>

                    {/* Technologies list */}
                    {record.technologies && record.technologies.length > 0 && (
                      <div
                        className="flex flex-wrap items-center gap-2 pt-1"
                        aria-label={isVi ? 'Công nghệ' : 'Technologies'}
                      >
                        {record.technologies.map(tech => (
                          <span
                            key={tech}
                            className="px-2.5 py-1 text-xs font-mono bg-[var(--color-subtle)] text-[var(--color-ink)] border border-[var(--color-border)] rounded-xs"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* View project details CTA */}
                    <div className="pt-2">
                      <Link
                        href={detailHref}
                        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-brick-deep)] hover:underline min-h-[44px] py-2 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
                      >
                        <span>{isVi ? 'Xem chi tiết dự án' : 'View case study'}</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
