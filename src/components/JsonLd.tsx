import type { Locale } from '@/i18n/types';
import { siteConfig } from '@/config/site';
import { profileConfig } from '@/config/profile';

interface JsonLdProps {
  locale: Locale | string;
}

export default function JsonLd({ locale }: JsonLdProps) {
  const isVi = locale === 'vi';
  const personName = isVi ? siteConfig.author.vi : siteConfig.author.en;
  const alternateName = isVi ? siteConfig.author.en : siteConfig.author.vi;
  const bio = isVi ? profileConfig.vi.bioSummary : profileConfig.en.bioSummary;

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: personName,
    url: `${siteConfig.baseUrl}/`,
    inLanguage: ['vi', 'en'],
  };

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: personName,
    alternateName: alternateName,
    url: `${siteConfig.baseUrl}/`,
    description: bio,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
    </>
  );
}
