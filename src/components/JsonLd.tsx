import { siteConfig } from '@/config/site';
import type { Profile } from '@/lib/content/types';

interface JsonLdProps {
  profile: Profile;
  alternateName: string;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export default function JsonLd({ profile, alternateName }: JsonLdProps) {

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: profile.name,
    url: `${siteConfig.baseUrl}/`,
    inLanguage: ['vi', 'en'],
  };

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    alternateName: alternateName,
    url: `${siteConfig.baseUrl}/`,
    description: profile.bioSummary,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(personSchema) }}
      />
    </>
  );
}
