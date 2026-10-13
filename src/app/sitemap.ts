import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${siteConfig.baseUrl}/vi/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: {
          vi: `${siteConfig.baseUrl}/vi/`,
          en: `${siteConfig.baseUrl}/en/`,
        },
      },
    },
    {
      url: `${siteConfig.baseUrl}/en/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: {
          vi: `${siteConfig.baseUrl}/vi/`,
          en: `${siteConfig.baseUrl}/en/`,
        },
      },
    },
    {
      url: `${siteConfig.baseUrl}/vi/about/`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: {
        languages: {
          vi: `${siteConfig.baseUrl}/vi/about/`,
          en: `${siteConfig.baseUrl}/en/about/`,
        },
      },
    },
    {
      url: `${siteConfig.baseUrl}/en/about/`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: {
        languages: {
          vi: `${siteConfig.baseUrl}/vi/about/`,
          en: `${siteConfig.baseUrl}/en/about/`,
        },
      },
    },
  ];
}
