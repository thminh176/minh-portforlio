import type { Metadata } from 'next';
import '../globals.css';
import SkipLink from '@/components/SkipLink';
import JsonLd from '@/components/JsonLd';
import { siteConfig } from '@/config/site';

export function generateStaticParams() {
  return [{ locale: 'vi' }, { locale: 'en' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isVi = locale === 'vi';
  const title = isVi
    ? 'Đàm Thiên Minh — Web Developer'
    : 'Thien Minh Dam — Web Developer';
  const description = isVi
    ? 'Portfolio của Đàm Thiên Minh: phát triển ứng dụng web, triển khai và vận hành hạ tầng; hướng học tiếp là backend và DevOps.'
    : 'Thien Minh Dam: Web Developer with hands-on application deployment and infrastructure experience, working toward backend engineering and DevOps.';

  return {
    metadataBase: new URL(siteConfig.baseUrl),
    icons: { icon: '/favicon.svg' },
    title,
    description,
    alternates: {
      canonical: `${siteConfig.baseUrl}/${locale}/`,
      languages: {
        vi: `${siteConfig.baseUrl}/vi/`,
        en: `${siteConfig.baseUrl}/en/`,
        'x-default': `${siteConfig.baseUrl}/`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.baseUrl}/${locale}/`,
      siteName: isVi ? 'Đàm Thiên Minh' : 'Thien Minh Dam',
      locale: isVi ? 'vi_VN' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    robots: siteConfig.isProduction
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
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

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <JsonLd locale={locale} />
        <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors lg:pl-64">
          <SkipLink locale={locale} />
          {children}
        </div>
      </body>
    </html>
  );
}
