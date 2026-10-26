import Link from 'next/link';
import Image from 'next/image';
import type { ImageUse, Locale, Post, Snapshot } from '@/lib/content/types';
import ContentBody from '@/components/content/ContentBody';

export interface ArticleViewProps {
  readonly post: Post;
  readonly locale: Locale;
  readonly snapshot: Snapshot;
}

function formatDate(dateString: string, locale: Locale): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateString;
  }
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

export default function ArticleView({ post, locale, snapshot }: ArticleViewProps) {
  const isVi = locale === 'vi';
  const backLabel = isVi ? 'Ghi chép' : 'Journal';
  const returnLabel = isVi ? 'Quay lại danh sách bài viết' : 'Back to journal';
  const kicker = isVi ? 'BÀI VIẾT' : 'ARTICLE';

  return (
    <article data-published-article className="space-y-8 sm:space-y-10 max-w-3xl">
      {/* Top Navigation & Ledger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <Link
          href={`/${locale}/blog/`}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-brick-deep)] hover:underline min-h-[44px] py-2 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
        >
          <span aria-hidden="true">←</span>
          <span>{backLabel}</span>
        </Link>
        <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
          {kicker}
        </span>
      </div>

      {/* Editorial Header */}
      <header className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[var(--text-muted)]">
          <time dateTime={post.publishedAt}>
            {formatDate(post.publishedAt, locale)}
          </time>
          {post.tags && post.tags.length > 0 && (
            <div role="group" className="flex flex-wrap gap-1.5" aria-label={isVi ? 'Thẻ bài viết' : 'Article tags'}>
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-xs bg-[var(--color-subtle)] text-[var(--text-secondary)] border border-[var(--color-border)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[var(--color-ink)] leading-tight">
          {post.title}
        </h1>

        <p className="font-body text-base sm:text-xl text-[var(--text-secondary)] leading-relaxed">
          {post.excerpt}
        </p>

        {post.cover ? renderCoverImage(post.cover, snapshot) : null}
      </header>

      {/* Bounded Divider */}
      <div className="border-t border-[var(--color-border)]" />

      {/* Editorial Body Content */}
      <ContentBody blocks={post.body} snapshot={snapshot} className="my-8" />

      {/* Bottom Navigation */}
      <div className="pt-8 border-t border-[var(--color-border)]">
        <Link
          href={`/${locale}/blog/`}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--color-brick-deep)] hover:underline min-h-[44px] py-2 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
        >
          <span aria-hidden="true">←</span>
          <span>{returnLabel}</span>
        </Link>
      </div>
    </article>
  );
}
