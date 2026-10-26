import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogListing from '@/components/blog/BlogListing';
import ArticleView from '@/components/blog/ArticleView';
import { getPosts, loadSnapshot } from '@/lib/content';
import type { Locale } from '@/lib/content/types';
import { siteConfig } from '@/config/site';
import { detailMetadata, fixedMetadata } from '@/lib/content/seo';

// Optional catch-all exports the real listings even when no published article exists.
// Next 16 output:export rejects a separate article route with zero static params.
type RouteParams = Promise<{ readonly locale: string; readonly slug?: readonly string[] }>;
export const dynamicParams = false;
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  if (params.locale !== 'vi' && params.locale !== 'en') return [];
  return [{ slug: [] }, ...(await getPosts(params.locale)).map(post => ({ slug: [post.slug] }))];
}
async function route(params: RouteParams) {
  const { locale, slug = [] } = await params;
  if ((locale !== 'vi' && locale !== 'en') || slug.length > 1) notFound();
  const snapshot = await loadSnapshot();
  const settings = snapshot.settings.find(record => record.locale === locale);
  const posts = snapshot.posts.filter(record => record.locale === locale);
  const post = slug.length === 1 ? posts.find(record => record.slug === slug[0]) : undefined;
  if (!settings || (slug.length === 1 && !post)) notFound();
  return { locale, post, posts, settings, snapshot };
}
export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { locale, post, snapshot } = await route(params);
  return post ? detailMetadata(snapshot, post, 'posts', siteConfig) : fixedMetadata(snapshot, locale as Locale, 'blog', siteConfig);
}

export default async function BlogPage({ params }: { params: RouteParams }) {
  const { locale, post, posts, settings, snapshot } = await route(params);
  return (
    <div className="flex-1 flex flex-col">
      <Header locale={locale} />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-12 space-y-8 focus:outline-none">
        {post ? (
          <ArticleView post={post} locale={locale as Locale} snapshot={snapshot} />
        ) : (
          <BlogListing posts={posts} settings={settings} locale={locale as Locale} />
        )}
      </main>
      <Footer locale={locale} />
    </div>
  );
}
