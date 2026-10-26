import type { Metadata } from 'next';
import '../globals.css';
import SkipLink from '@/components/SkipLink';
import JsonLd from '@/components/JsonLd';
import { siteConfig } from '@/config/site';
import { loadSnapshot } from '@/lib/content';
import { fixedMetadata } from '@/lib/content/seo';

export function generateStaticParams() {
  return [{ locale: 'vi' }, { locale: 'en' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'vi' && locale !== 'en') throw new Error('Unsupported layout locale');
  return fixedMetadata(await loadSnapshot(), locale, 'home', siteConfig);
}

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('dtm_theme');
    if (stored === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'vi' && locale !== 'en') throw new Error('Unsupported layout locale');
  const snapshot = await loadSnapshot();
  const profile = snapshot.profiles.find(record => record.locale === locale)!;
  const alternateName = snapshot.profiles.find(record => record.locale !== locale)!.name;

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <JsonLd profile={profile} alternateName={alternateName} />
        <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors lg:pl-64">
          <SkipLink locale={locale} />
          {children}
        </div>
      </body>
    </html>
  );
}
