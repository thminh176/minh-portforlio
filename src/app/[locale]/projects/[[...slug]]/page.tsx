import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectDetail from '@/components/projects/ProjectDetail';
import ProjectListing from '@/components/projects/ProjectListing';
import { getProjects, loadSnapshot } from '@/lib/content';
import type { Locale, Project, SiteSettings, Snapshot } from '@/lib/content/types';
import { siteConfig } from '@/config/site';
import { detailMetadata, fixedMetadata } from '@/lib/content/seo';

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
  const { locale, project, snapshot } = await route(params);
  return project ? detailMetadata(snapshot, project, 'projects', siteConfig) : fixedMetadata(snapshot, locale, 'projects', siteConfig);
}

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
