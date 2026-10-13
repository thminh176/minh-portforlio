import type { Metadata } from 'next';
import '../globals.css';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
    icons: { icon: '/favicon.svg' },
  title: 'Đàm Thiên Minh / Thien Minh Dam — Portfolio',
  description: 'Thien Minh Dam — Web Developer with practical deployment and web infrastructure experience.',
  alternates: {
    canonical: `${siteConfig.baseUrl}/`,
    languages: {
      vi: `${siteConfig.baseUrl}/vi/`,
      en: `${siteConfig.baseUrl}/en/`,
      'x-default': `${siteConfig.baseUrl}/`,
    },
  },
  robots: siteConfig.isProduction
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
