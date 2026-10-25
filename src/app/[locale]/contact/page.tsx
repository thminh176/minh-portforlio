import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ContactPage from '@/components/ContactPage';
import { getDictionary } from '@/i18n';
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
  if (locale !== 'vi' && locale !== 'en') {
    notFound();
  }
  const isVi = locale === 'vi';
  const title = isVi
    ? 'Đàm Thiên Minh — Liên hệ'
    : 'Thien Minh Dam — Contact';
  const description = isVi
    ? 'Liên hệ với Đàm Thiên Minh để trao đổi về các dự án website, ý tưởng cộng tác hoặc câu hỏi kỹ thuật.'
    : 'Get in touch with Thien Minh Dam for website projects, collaboration ideas, or technical questions.';

  return {
    metadataBase: new URL(siteConfig.baseUrl),
    title,
    description,
    alternates: {
      canonical: `${siteConfig.baseUrl}/${locale}/contact/`,
      languages: {
        vi: `${siteConfig.baseUrl}/vi/contact/`,
        en: `${siteConfig.baseUrl}/en/contact/`,
        'x-default': `${siteConfig.baseUrl}/en/contact/`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.baseUrl}/${locale}/contact/`,
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

export default async function ContactRoutePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'vi' && locale !== 'en') {
    notFound();
  }
  const dict = getDictionary(locale);

  return (
    <div className="flex-1 flex flex-col justify-between">
      <Header locale={locale} />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 space-y-16 sm:space-y-24 focus:outline-none"
      >
        <ContactPage locale={locale} dict={dict} />
      </main>

      <Footer locale={locale} />
    </div>
  );
}
