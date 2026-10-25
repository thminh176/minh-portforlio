import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getProjects, loadSnapshot } from '@/lib/content';
import type { Block, ImageUse, Inline, LinkTarget, Locale, Project, SiteSettings, Snapshot } from '@/lib/content/types';
import { siteConfig } from '@/config/site';

// Optional catch-all exports the real listings even when no published project exists.
// Next 16 output:export rejects a separate detail route with zero static params.
type RouteParams = Promise<{ readonly locale: string; readonly slug?: readonly string[] }>;
interface RouteData {
  readonly locale: Locale;
  readonly project: Project | undefined;
  readonly projects: readonly Project[];
  readonly settings: SiteSettings;
  readonly snapshot: Snapshot;
}
export const dynamicParams = false;
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  if (params.locale !== 'vi' && params.locale !== 'en') return [];
  return [{ slug: [] }, ...(await getProjects(params.locale)).map(project => ({ slug: [project.slug] }))];
}
async function route(params: RouteParams): Promise<RouteData> {
  const { locale, slug = [] } = await params;
  if ((locale !== 'vi' && locale !== 'en') || slug.length > 1) notFound();
  const snapshot = await loadSnapshot();
  const settings = snapshot.settings.find(record => record.locale === locale);
  const projects = snapshot.projects.filter(record => record.locale === locale);
  const project = slug.length === 1 ? projects.find(record => record.slug === slug[0]) : undefined;
  if (!settings || (slug.length === 1 && !project)) notFound();
  return { locale, project, projects, settings, snapshot };
}
export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { locale, project, settings, snapshot } = await route(params);
  const canonical = `${siteConfig.baseUrl}/${locale}/projects/${project ? project.slug + '/' : ''}`;
  const languages: Record<string, string> = { [locale]: canonical };
  if (project) {
    for (const reference of project.translations) {
      const target = snapshot.projects.find(record => record.id === reference.recordId && record.locale === reference.locale);
      if (target) languages[target.locale] = `${siteConfig.baseUrl}/${target.locale}/projects/${target.slug}/`;
    }
  } else {
    for (const language of snapshot.locales) languages[language] = `${siteConfig.baseUrl}/${language}/projects/`;
  }
  const title = project ? project.metadata.title : `${indexTitle(locale)} | ${settings.siteTitle}`;
  const description = project ? project.metadata.description : settings.siteDescription;
  return {
    metadataBase: new URL(siteConfig.baseUrl), title, description,
    alternates: { canonical, languages },
    openGraph: { title, description, url: canonical, siteName: settings.siteTitle, locale: locale === 'vi' ? 'vi_VN' : 'en_US', type: 'website' },
    twitter: { card: 'summary', title, description },
    robots: siteConfig.isProduction ? { index: true, follow: true } : { index: false, follow: false },
  };
}

function href(target: LinkTarget, snapshot: Snapshot): string | null {
  if (target.kind === 'external') return target.url;
  if (target.kind === 'internal') return target.path;
  const record = snapshot[target.collection].find(item => item.id === target.recordId);
  return record ? `/${record.locale}/${target.collection === 'posts' ? 'blog' : 'projects'}/${record.slug}/` : null;
}
function inlines(items: readonly Inline[], snapshot: Snapshot) {
  return items.map((item, i) => {
    if (item.type === 'text') return <span key={i}>{item.text}</span>;
    const target = href(item.target, snapshot);
    return target ? <a key={i} href={target} rel={item.target.kind === 'external' ? 'noopener noreferrer' : undefined}>{item.label}</a> : <span key={i}>{item.label}</span>;
  });
}
function image(use: ImageUse, snapshot: Snapshot) {
  const media = snapshot.media.find(asset => asset.id === use.mediaId);
  if (!media) notFound(); // Validator has already required every referenced asset.
  return <figure><Image src={media.path} alt={use.alt} width={media.width} height={media.height} />{'caption' in use && use.caption ? <figcaption>{use.caption}</figcaption> : null}</figure>;
}
function bodyBlock(block: Block, snapshot: Snapshot) {
  switch (block.type) {
    case 'paragraph': return <p>{inlines(block.children, snapshot)}</p>;
    case 'heading':
      if (block.level === 2) return <h2>{block.text}</h2>;
      if (block.level === 3) return <h3>{block.text}</h3>;
      return <h4>{block.text}</h4>;
    case 'list': {
      const items = block.items.map((item, i) => <li key={i}>{inlines(item, snapshot)}</li>);
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case 'quote': return <blockquote>{inlines(block.children, snapshot)}{block.attribution ? <cite>{block.attribution}</cite> : null}</blockquote>;
    case 'code': return <pre><code>{block.code}</code></pre>;
    case 'image': return image(block.image, snapshot);
  }
}

function indexTitle(locale: Locale) { return locale === 'vi' ? 'Dự án' : 'Projects'; }

// Semantic wiring only; project listing/detail design and rich presentation follow in M05b.
export default async function ProjectPage({ params }: { params: RouteParams }) {
  const { locale, project, projects, snapshot } = await route(params);
  return (
    <div className="flex-1 flex flex-col">
      <Header locale={locale} />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-12 space-y-8 focus:outline-none">
        {project ? <>
          <Link href={`/${locale}/projects/`}>{indexTitle(locale)}</Link>
          <article data-published-project>
            <h1 className="font-display text-3xl sm:text-5xl">{project.title}</h1>
            <p>{project.summary}</p>
            <ul>{project.technologies.map(technology => <li key={technology}>{technology}</li>)}</ul>
            <a href={project.sourceUrl} rel="noopener noreferrer">{locale === 'vi' ? 'Mã nguồn' : 'Source repository'}</a>
            {project.liveUrl ? <a href={project.liveUrl} rel="noopener noreferrer">{locale === 'vi' ? 'Xem website' : 'Visit website'}</a> : null}
            {project.cover ? image(project.cover, snapshot) : null}
            <div className="space-y-6">{project.body.map((block, i) => <div key={i}>{bodyBlock(block, snapshot)}</div>)}</div>
          </article>
        </> : <>
          <h1 className="font-display text-3xl sm:text-5xl">{indexTitle(locale)}</h1>
          {projects.length === 0 ? <p data-project-empty>{locale === 'vi' ? 'Chưa có dự án được công bố.' : 'No published projects yet.'}</p> : (
            <ul className="space-y-8" data-project-list>
              {projects.map(record => <li key={record.id}>
                <h2 className="font-display text-2xl"><Link href={`/${locale}/projects/${record.slug}/`}>{record.title}</Link></h2>
                <p>{record.summary}</p>
              </li>)}
            </ul>
          )}
        </>}
      </main>
      <Footer locale={locale} />
    </div>
  );
}
