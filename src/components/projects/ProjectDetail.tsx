import Link from 'next/link';
import Image from 'next/image';
import type { Locale, Project, Snapshot, ImageUse } from '@/lib/content/types';
import ContentBody from '@/components/content/ContentBody';

export interface ProjectDetailProps {
  readonly locale: Locale;
  readonly project: Project;
  readonly snapshot: Snapshot;
}

function renderCoverImage(use: ImageUse, snapshot: Snapshot) {
  const media = snapshot.media.find(asset => asset.id === use.mediaId);
  if (!media) {
    throw new Error('Invariant violation: referenced cover media asset not found in snapshot');
  }
  const isDecorative = !use.alt;
  return (
    <figure className="my-8 space-y-2">
      <Image
        src={media.path}
        alt={use.alt || ''}
        width={media.width}
        height={media.height}
        priority
        className="rounded-xs border border-[var(--color-border)] w-full h-auto"
        {...(isDecorative ? { role: 'presentation' } : {})}
      />
      {'caption' in use && use.caption ? (
        <figcaption className="text-xs font-mono text-[var(--text-secondary)] text-center">
          {use.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export default function ProjectDetail({ locale, project, snapshot }: ProjectDetailProps) {
  const isVi = locale === 'vi';
  const isMcp =
    project.translationGroup === 'mcp-project-assistant' &&
    project.sourceUrl === 'https://github.com/thminh176/mcp-project-assistant';
  const isPortfolio =
    project.translationGroup === 'personal-portfolio' &&
    project.sourceUrl === 'https://github.com/thminh176/minh-portforlio';

  const sourceLabel = isVi ? 'Mã nguồn trên GitHub' : 'View source on GitHub';
  const liveLabel = isVi ? 'Xem website' : 'Visit website';
  const backLabel = isVi ? 'Dự án' : 'Projects';
  const returnLabel = isVi ? 'Quay lại danh sách dự án' : 'Back to projects';
  const kicker = isMcp ? 'CASE STUDY / MCP' : isPortfolio ? 'CASE STUDY / PORTFOLIO' : 'PROJECT / CASE STUDY';

  const diagramAriaLabel = isVi
    ? 'Sơ đồ năng lực MCP: Đọc mã, Xem diff, Áp dụng thay đổi'
    : 'MCP capability flow: Read code, Review diffs, Apply previewed changes';

  return (
    <article data-published-project className="space-y-10 sm:space-y-12">
      {/* Top Navigation & Ledger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <Link
          href={`/${locale}/projects/`}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-brick-deep)] hover:underline min-h-[44px] py-2 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
        >
          <span aria-hidden="true">←</span>
          <span>{backLabel}</span>
        </Link>
        <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
          {kicker}
        </span>
      </div>

      {/* Hero / Header Section */}
      <header className="space-y-6 max-w-3xl">
        <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--color-ink)]">
          {project.title}
        </h1>

        <p className="font-body text-base sm:text-xl text-[var(--text-secondary)] leading-relaxed">
          {project.summary}
        </p>

        {/* Technologies Pills */}
        {project.technologies && project.technologies.length > 0 && (
          <ul
            className="flex flex-wrap items-center gap-2 pt-2"
            aria-label={isVi ? 'Công nghệ sử dụng' : 'Technologies used'}
          >
            {project.technologies.map(tech => (
              <li
                key={tech}
                className="px-3 py-1 text-xs font-mono bg-[var(--color-subtle)] text-[var(--color-ink)] border border-[var(--color-border)] rounded-xs"
              >
                {tech}
              </li>
            ))}
          </ul>
        )}

        {/* Action Links */}
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <a
            target="_blank"
            href={project.sourceUrl}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-white bg-[var(--color-dark)] hover:bg-[#223034] px-4 py-2.5 rounded-xs transition-colors min-h-[44px] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
          >
            <span>{sourceLabel}</span>
            <span aria-hidden="true">↗</span>
          </a>

          {project.liveUrl ? (
            <a
              target="_blank"
              href={project.liveUrl}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink)] bg-[var(--color-subtle)] hover:bg-[var(--color-paper)] border border-[var(--color-border)] px-4 py-2.5 rounded-xs transition-colors min-h-[44px] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
            >
              <span>{liveLabel}</span>
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      </header>

      {/* Cover Image (if validated asset exists) */}
      {project.cover ? renderCoverImage(project.cover, snapshot) : null}

      {/* Architectural Visual Feature from Figma Node 14:2 */}
      {isMcp ? (
        <section
          aria-label={diagramAriaLabel}
          className="bg-[var(--color-dark)] text-[var(--color-dark-copy)] border border-[#243438] rounded-xs p-6 sm:p-8 my-8"
        >
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[var(--color-dark-copy)]/80 pb-4 border-b border-white/10 mb-6">
            <span>ARCHITECTURE / CAPABILITY FLOW</span>
            <span className="text-white/50">LOCAL MCP</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1b282c] border border-white/10 rounded-xs p-5 space-y-2 font-mono">
              <div className="text-xs text-[var(--color-dark-copy)]/70 uppercase tracking-wider">STEP 01</div>
              <div className="text-lg font-bold text-white tracking-tight">READ</div>
              <p className="text-xs text-[var(--color-dark-copy)]/80 font-body">
                {isVi ? 'Đọc mã nguồn và tìm kiếm ngữ cảnh trong thư mục cho phép.' : 'Read code and search context in authorized workspaces.'}
              </p>
            </div>
            <div className="bg-[#1b282c] border border-white/10 rounded-xs p-5 space-y-2 font-mono">
              <div className="text-xs text-[var(--color-dark-copy)]/70 uppercase tracking-wider">STEP 02</div>
              <div className="text-lg font-bold text-white tracking-tight">REVIEW</div>
              <p className="text-xs text-[var(--color-dark-copy)]/80 font-body">
                {isVi ? 'Kiểm tra Git diff trước khi bất kỳ thay đổi nào được ghi.' : 'Inspect Git diffs before any modification is written.'}
              </p>
            </div>
            <div className="bg-[#1b282c] border border-white/10 rounded-xs p-5 space-y-2 font-mono">
              <div className="text-xs text-[var(--color-dark-copy)]/70 uppercase tracking-wider">STEP 03</div>
              <div className="text-lg font-bold text-white tracking-tight">APPLY</div>
              <p className="text-xs text-[var(--color-dark-copy)]/80 font-body">
                {isVi ? 'Áp dụng các thay đổi đã được kiểm tra và xác nhận an toàn.' : 'Apply previewed changes only after verification.'}
              </p>
            </div>
          </div>
        </section>
      ) : isPortfolio ? (
        <section
          aria-label={isVi ? 'Thông số kỹ thuật' : 'Technical specification'}
          className="bg-[var(--color-subtle)] text-[var(--color-ink)] border border-[var(--color-border)] rounded-xs p-6 sm:p-8 my-8"
        >
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] pb-4 border-b border-[var(--color-border)] mb-4">
            <span>SPECIFICATION</span>
            <span className="text-[var(--color-brick-deep)] font-semibold">STATIC EXPORT</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-xs">
              <div className="text-[var(--text-secondary)]">FRAMEWORK</div>
              <div className="font-bold text-sm text-[var(--color-ink)] mt-1">Next.js 16</div>
            </div>
            <div className="p-3 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-xs">
              <div className="text-[var(--text-secondary)]">LANGUAGE</div>
              <div className="font-bold text-sm text-[var(--color-ink)] mt-1">TypeScript 5</div>
            </div>
            <div className="p-3 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-xs">
              <div className="text-[var(--text-secondary)]">STYLING</div>
              <div className="font-bold text-sm text-[var(--color-ink)] mt-1">Tailwind CSS v4</div>
            </div>
            <div className="p-3 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-xs">
              <div className="text-[var(--text-secondary)]">HOSTING</div>
              <div className="font-bold text-sm text-[var(--color-ink)] mt-1">Cloudflare Pages</div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Structured Body Content */}
      <section className="pt-8 border-t border-[var(--color-border)]" aria-label={isVi ? 'Nội dung chi tiết' : 'Detailed content'}>
        <ContentBody blocks={project.body} snapshot={snapshot} />
      </section>

      {/* Bottom Backlink */}
      <footer className="pt-10 border-t border-[var(--color-border)]">
        <Link
          href={`/${locale}/projects/`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-brick-deep)] hover:underline min-h-[44px] py-2 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
        >
          <span aria-hidden="true">←</span>
          <span>{returnLabel}</span>
        </Link>
      </footer>
    </article>
  );
}
