import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ContactPage from '@/components/ContactPage';
import { getDictionary } from '@/i18n';
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
  if (locale !== 'vi' && locale !== 'en') {
    notFound();
  }
  return fixedMetadata(await loadSnapshot(), locale, 'contact', siteConfig);
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
