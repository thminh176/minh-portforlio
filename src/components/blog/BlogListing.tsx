import Link from 'next/link';
import type { Locale, Post, SiteSettings } from '@/lib/content/types';

export interface BlogListingProps {
  readonly posts: readonly Post[];
  readonly settings: SiteSettings;
  readonly locale: Locale;
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

export default function BlogListing({ posts, settings, locale }: BlogListingProps) {
  const isVi = locale === 'vi';
  const kicker = isVi ? 'GHI CHÉP' : 'JOURNAL';

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Editorial Header */}
      <header className="space-y-3 sm:space-y-4 border-b border-[var(--color-border)] pb-8 sm:pb-10">
        <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-brick-deep)] font-semibold">
          {kicker}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--color-ink)] leading-tight">
          {settings.journalTitle}
        </h1>
        <p className="font-body text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {settings.siteDescription}
        </p>
      </header>

      {/* Listing Content: Honest Empty State or Real Published Records */}
      {posts.length === 0 ? (
        <section
          data-blog-empty
          aria-label={isVi ? 'Trạng thái bài viết' : 'Article status'}
          className="bg-[var(--color-white)] border border-[var(--color-border)] rounded-sm p-6 sm:p-8 lg:p-10 space-y-6"
        >
          <div className="space-y-3">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-ink)]">
              {isVi ? 'Chưa có bài viết.' : 'No posts yet.'}
            </h2>
            <p className="font-body text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              {settings.journalEmptyText}
            </p>
          </div>
        </section>
      ) : (
        <section
          data-blog-list
          aria-label={isVi ? 'Danh sách bài viết' : 'Published articles'}
          className="space-y-6 sm:space-y-8"
        >
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] border-b border-[var(--color-border)] pb-3">
            <span>{isVi ? 'BÀI VIẾT' : 'ARTICLES'}</span>
            <span>
              {posts.length} {isVi ? 'bài' : posts.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          <ul className="space-y-6 sm:space-y-8">
            {posts.map(record => (
              <li key={record.id}>
                <article className="bg-[var(--color-white)] border border-[var(--color-border)] rounded-sm p-6 sm:p-8 space-y-4 transition-colors hover:border-[var(--color-ink)]">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[var(--text-muted)]">
                    <time dateTime={record.publishedAt}>
                      {formatDate(record.publishedAt, locale)}
                    </time>
                    {record.tags && record.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {record.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded bg-[var(--color-subtle)] text-[var(--text-secondary)] border border-[var(--color-border)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-ink)]">
                    <Link
                      href={`/${locale}/blog/${record.slug}/`}
                      className="hover:text-[var(--color-brick-deep)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
                    >
                      {record.title}
                    </Link>
                  </h2>

                  <p className="font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                    {record.excerpt}
                  </p>

                  <div className="pt-2">
                    <Link
                      href={`/${locale}/blog/${record.slug}/`}
                      className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[var(--color-brick-deep)] font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
                    >
                      {isVi ? 'Đọc bài →' : 'Read article →'}
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
