import type { Locale, Post, Profile, Project, SiteSettings, Snapshot } from './types.ts';

/** Pure projection of one already validated, media-checked publication revision. */
export function selectHomeContent(snapshot: Snapshot, locale: Locale): {
  profile: Profile;
  settings: SiteSettings;
  featuredProjects: readonly Project[];
  recentPosts: readonly Post[];
} {
  const profile = snapshot.profiles.find(record => record.locale === locale);
  const settings = snapshot.settings.find(record => record.locale === locale);
  if (!profile || !settings) throw new Error('Missing published locale');
  const projects = new Map(snapshot.projects.filter(record => record.locale === locale).map(record => [record.id, record]));
  const featuredProjects = settings.featuredProjectIds.map(id => {
    const project = projects.get(id);
    if (!project) throw new Error('Invalid featured project reference');
    return project;
  });
  const recentPosts = snapshot.posts.filter(record => record.locale === locale).slice(0, settings.recentPostLimit);
  return { profile, settings, featuredProjects, recentPosts };
}

export const MCP_SOURCE = 'https://github.com/thminh176/mcp-project-assistant';
export const PORTFOLIO_SOURCE = 'https://github.com/thminh176/minh-portforlio';

/** Specialized artwork describes these exact verified repositories only. */
export function projectArtwork(project: Project): 'mcp' | 'portfolio' | 'generic' {
  if (project.translationGroup === 'mcp-project-assistant' && project.sourceUrl === MCP_SOURCE) return 'mcp';
  if (project.translationGroup === 'personal-portfolio' && project.sourceUrl === PORTFOLIO_SOURCE) return 'portfolio';
  return 'generic';
}
