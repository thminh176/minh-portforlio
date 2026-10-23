import Header from '@/components/Header';
import Hero from '@/components/Hero';
import FeaturedMcpProject from '@/components/FeaturedMcpProject';
import FeaturedPortfolioProject from '@/components/FeaturedPortfolioProject';
import JournalIntro from '@/components/JournalIntro';
import ContactInvitation from '@/components/ContactInvitation';
import Footer from '@/components/Footer';
import ContactForm from '@/components/ContactForm';
import DirectContact from '@/components/DirectContact';
import { getDictionary } from '@/i18n';

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

  return (
    <div className="flex-1 flex flex-col justify-between">
      <Header locale={locale} activeRoute="home" />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 space-y-20 sm:space-y-28 focus:outline-none"
      >
        {/* 1. Hero Section */}
        <Hero locale={locale} />

        {/* 2. Work Section */}
        <section id="work" className="space-y-8 sm:space-y-12 scroll-mt-24">
          <div className="space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-brick-deep)] font-semibold">
              {isVi ? 'CHỌN DỰ ÁN' : 'SELECTED WORK'}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
              {isVi ? 'Code, giao diện và quyết định kỹ thuật.' : 'Code, interfaces, and technical decisions.'}
            </h2>
          </div>

          <div className="space-y-12 sm:space-y-16">
            <FeaturedMcpProject locale={locale} />
            <FeaturedPortfolioProject locale={locale} />
          </div>
        </section>

        {/* 3. Journal Section */}
        <JournalIntro locale={locale} />

        {/* Contact Invitation */}
        <ContactInvitation locale={locale} />

        {/* 4. Contact Section */}
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
