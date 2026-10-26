import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DirectContact from '@/components/DirectContact';
import Link from 'next/link';
import { getDictionary } from '@/i18n';
import { getProfile } from '@/lib/content';
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
    ? 'Đàm Thiên Minh — Giới thiệu'
    : 'Thien Minh Dam — About';
  const description = isVi
    ? 'Tìm hiểu về Minh, các dự án web cá nhân, kinh nghiệm triển khai và việc học Java, backend, DevOps.'
    : 'About Minh: personal web projects, deployment experience, and ongoing Java, backend and DevOps learning.';

  return {
    metadataBase: new URL(siteConfig.baseUrl),
    title,
    description,
    alternates: {
      canonical: `${siteConfig.baseUrl}/${locale}/about/`,
      languages: {
        vi: `${siteConfig.baseUrl}/vi/about/`,
        en: `${siteConfig.baseUrl}/en/about/`,
        'x-default': `${siteConfig.baseUrl}/en/about/`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.baseUrl}/${locale}/about/`,
      siteName: isVi ? 'Đàm Thiên Minh' : 'Thien Minh Dam',
      locale: isVi ? 'vi_VN' : 'en_US',
      type: 'profile',
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

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isVi = locale === 'vi';
  const dict = getDictionary(locale);
  if (locale !== 'vi' && locale !== 'en') throw new Error('Unsupported About locale');
  const profile = await getProfile(locale);
  const kicker = isVi ? 'VỀ MÌNH' : 'ABOUT';

  return (
    <div className="flex-1 flex flex-col justify-between">
      <Header locale={locale} activeRoute="about" />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 space-y-16 sm:space-y-24 focus:outline-none"
      >
        {/* 1. Header / Intro Narrative */}
        <section className="pt-0 sm:pt-2 pb-8 sm:pb-12 border-b border-[var(--color-border)] text-left">
          <div className="max-w-3xl flex flex-col gap-4 sm:gap-6">
            {/* Identity Kicker */}
            <div className="font-mono text-xs sm:text-sm tracking-wider uppercase text-[var(--color-brick-deep)] font-semibold">
              {kicker}
            </div>

            {/* Single Semantic H1: Page Title */}
            <h1 className="font-display text-[32px] leading-[1.18] sm:text-4xl sm:leading-tight md:text-5xl lg:text-[56px] lg:leading-[1.12] font-bold text-[var(--color-ink)] tracking-tight">
              {dict.about.title}
            </h1>

            {/* Supporting Lead Copy */}
            <p className="font-body text-base sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              {dict.about.lead}
            </p>

            {/* Factual Story Paragraphs */}
            <div className="space-y-4 pt-4 sm:pt-6 border-t border-[var(--color-border)] font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              {profile.aboutStory.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Technologies & Work Experience */}
        <section className="space-y-6 sm:space-y-8">
          {/* Mono Ledger Header */}
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] pb-3 border-b border-[var(--color-border)]">
            <span>{isVi ? 'KINH NGHIỆM & DỰ ÁN' : 'EXPERIENCE & PROJECTS'}</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              {dict.about.approachTitle}
            </h2>
            <p className="font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              {dict.about.approachSubtitle}
            </p>
          </div>

          {/* 3 Editorial Rows divided by rules (stack on mobile, index/category left, description right) */}
          <div className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {dict.about.approachPoints.map((point, idx) => (
              <div
                key={idx}
                className="py-6 sm:py-8 flex flex-col md:flex-row md:items-start gap-3 md:gap-8 lg:gap-12"
              >
                <div className="flex items-center gap-3 md:w-1/3 shrink-0">
                  <span className="font-mono text-xs font-semibold text-[var(--color-brick-deep)]">
                    0{idx + 1}
                  </span>
                  <h3 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--color-ink)]">
                    {point.title}
                  </h3>
                </div>
                <div className="md:w-2/3">
                  <p className="font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Continued Learning Section */}
        <section className="space-y-6 sm:space-y-8">
          {/* Mono Ledger Header */}
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] pb-3 border-b border-[var(--color-border)]">
            <span>{isVi ? 'HỌC HỎI & PHÁT TRIỂN' : 'CONTINUED LEARNING'}</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              {dict.about.servicesTitle}
            </h2>
            <p className="font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              {dict.about.servicesSubtitle}
            </p>
          </div>

          {/* Plain editorial paragraphs without card containers or badge filler */}
          <div className="space-y-4 pt-2 font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-3xl">
            {dict.about.servicesText.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* 4. Contact & Inquiries Section */}
        <section className="space-y-6 sm:space-y-8">
          {/* Mono Ledger Header */}
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] pb-3 border-b border-[var(--color-border)]">
            <span>{isVi ? 'LIÊN HỆ & TRAO ĐỔI' : 'CONTACT & INQUIRIES'}</span>
          </div>

          <div className="bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-xs p-6 sm:p-10 lg:p-12 space-y-8 text-center">
            <div className="space-y-3 max-w-xl mx-auto">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
                {dict.about.contactCtaTitle}
              </h2>
              <p className="font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                {dict.about.contactCtaSubtitle}
              </p>
            </div>

            <DirectContact locale={locale} variant="compact" />

            <div className="flex justify-center pt-2">
              <Link
                href={`/${locale}/#contact`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--color-dark)] text-white hover:bg-[var(--color-ink)] font-medium text-sm sm:text-base transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2 min-h-[44px] rounded-xs cursor-pointer"
              >
                <span>{dict.about.contactCtaButton}</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
