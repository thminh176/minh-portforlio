import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DirectContact from '@/components/DirectContact';
import Link from 'next/link';
import { getDictionary } from '@/i18n';
import { profileConfig } from '@/config/profile';
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
  const profile = isVi ? profileConfig.vi : profileConfig.en;

  return (
    <div className="flex-1 flex flex-col justify-between">
      <Header locale={locale} activeRoute="about" />

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-12 sm:py-16 space-y-16 sm:space-y-24 focus:outline-none">
        {/* 1. Header / Intro Narrative */}
        <section className="space-y-6">
          <div className="inline-block px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-strong)]">
            {dict.about.badge}
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {dict.about.title}
          </h1>
          <p className="text-base sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-3xl">
            {dict.about.lead}
          </p>

          <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)] text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-3xl">
            {profile.aboutStory.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* 2. Approach to Website Projects */}
        <section className="p-8 sm:p-10 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-8 shadow-sm transition-colors">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[var(--accent-primary)]" aria-hidden="true" />
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {dict.about.approachTitle}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              {dict.about.approachSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {dict.about.approachPoints.map((point, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-hover)] text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                    {point.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Services Overview */}
        <section className="p-8 sm:p-10 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-6 shadow-sm transition-colors">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-[var(--accent-primary)]" aria-hidden="true" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {dict.about.servicesTitle}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
            {dict.about.servicesSubtitle}
          </p>

          <div className="space-y-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            {dict.about.servicesText.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>
        </section>

        {/* 4. Contact CTA */}
        <section className="p-8 sm:p-10 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] text-center space-y-6 shadow-sm transition-colors">
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {dict.about.contactCtaTitle}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {dict.about.contactCtaSubtitle}
            </p>
          </div>

          <DirectContact locale={locale} variant="compact" />

          <div className="flex justify-center pt-2">
            <Link
              href={`/${locale}/#contact`}

              className="min-h-[48px] px-8 py-3 rounded-lg bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] font-semibold text-sm transition-colors shadow-md flex items-center justify-center cursor-pointer"
            >
              {dict.about.contactCtaButton}
            </Link>
          </div>
        </section>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
