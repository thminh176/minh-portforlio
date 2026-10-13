import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Footer from '@/components/Footer';
import ContactForm from '@/components/ContactForm';
import DirectContact from '@/components/DirectContact';
import Link from 'next/link';
import { getDictionary } from '@/i18n';
import { profileConfig } from '@/config/profile';

export function generateStaticParams() {
  return [{ locale: 'vi' }, { locale: 'en' }];
}

export default async function HomePage({
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
      <Header locale={locale} activeRoute="home" />

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 space-y-20 sm:space-y-28 focus:outline-none">
        {/* 1. Hero Section */}
        <Hero locale={locale} />

        {/* 2. Website Services Offerings */}
        <section id="services" className="space-y-8 scroll-mt-24">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[var(--accent-primary)]" aria-hidden="true" />
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                {dict.home.servicesTitle}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              {dict.home.servicesSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {dict.home.servicesList.map((service) => (
              <div
                key={service.id}
                className="p-7 sm:p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-5 flex flex-col justify-between transition-colors shadow-sm"
              >
                <div className="space-y-3">
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    {service.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2.5">
                  <span className="text-xs font-semibold text-[var(--accent-primary)]">
                    {isVi ? 'Đặc điểm chính:' : 'Key features:'}
                  </span>
                  <ul className="space-y-2 text-xs sm:text-sm text-[var(--text-secondary)]">
                    {service.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <svg
                          className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Engagement Process */}
        <section id="process" className="p-8 sm:p-10 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-8 shadow-sm transition-colors scroll-mt-24">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[var(--accent-primary)]" aria-hidden="true" />
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                {dict.home.processTitle}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              {dict.home.processSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {dict.home.processSteps.map((step) => (
              <div
                key={step.step}
                className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] space-y-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[var(--accent-subtle)] text-[var(--accent-hover)] text-xs font-bold flex items-center justify-center shrink-0 border border-[var(--border-subtle)]">
                    {step.step}
                  </span>
                  <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                    {step.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. About Preview Section */}
        <section className="p-8 sm:p-10 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-6 shadow-sm transition-colors">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-[var(--accent-primary)]" aria-hidden="true" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {dict.home.aboutPreviewTitle}
            </h2>
          </div>

          <div className="space-y-3 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            <p>{dict.home.aboutPreviewText}</p>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">
              {profile.bioSummary}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href={`/${locale}/about/`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-primary)] hover:underline min-h-[44px]"
            >
              <span>{dict.home.learnMore}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* 5. Contact Section */}
        <section id="contact" className="space-y-8 scroll-mt-24">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-strong)]">
              <span>{isVi ? 'Liên hệ' : 'Contact'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {dict.home.contactTitle}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {dict.home.contactSubtitle}
            </p>
          </div>

          {/* Direct Public Contact Details */}
          <DirectContact locale={locale} />

          <ContactForm locale={locale} dict={dict.contactForm} />
        </section>

      </main>

      <Footer locale={locale} />
    </div>
  );
}
