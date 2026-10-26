import Link from 'next/link';
import type { Post, SiteSettings } from '@/lib/content/types';

interface JournalIntroProps {
  locale: string;
  settings: SiteSettings;
  posts: readonly Post[];
}

export default function JournalIntro({ locale, settings, posts }: JournalIntroProps) {
  const isVi = locale === 'vi';

  const kicker = isVi ? 'GHI CHÉP' : 'JOURNAL';

  return (
    <section id="journal" className="space-y-6 sm:space-y-8 scroll-mt-24 pt-12 sm:pt-16 border-t border-[var(--color-border)]">
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-brick-deep)] font-semibold">
          {kicker}
        </div>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
          {settings.journalTitle}
        </h2>
      </div>

      {posts.length ? (
        <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {posts.map(post => (
            <article key={post.id} className="py-5 space-y-2">
              <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--color-ink)]">
                <Link href={`/${locale}/blog/${post.slug}/`}>{post.title}</Link>
              </h3>
              <p className="font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-xl">{post.excerpt}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-xl">
          {settings.journalEmptyText}
        </p>
      )}
    </section>
  );
}
