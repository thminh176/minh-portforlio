import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectDetail from '@/components/projects/ProjectDetail';
import ProjectListing from '@/components/projects/ProjectListing';
import { getProjects, loadSnapshot } from '@/lib/content';
import type { Locale, Project, SiteSettings, Snapshot } from '@/lib/content/types';
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

function indexTitle(locale: Locale) { return locale === 'vi' ? 'Dự án' : 'Projects'; }

export default async function ProjectPage({ params }: { params: RouteParams }) {
  const { locale, project, projects, settings, snapshot } = await route(params);
  return (
    <div className="flex-1 flex flex-col justify-between">
      <Header locale={locale} />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-10 sm:py-16 focus:outline-none">
        {project ? (
          <ProjectDetail locale={locale} project={project} snapshot={snapshot} />
        ) : (
          <ProjectListing locale={locale} projects={projects} settings={settings} />
        )}
      </main>
      <Footer locale={locale} />
    </div>
  );
}
