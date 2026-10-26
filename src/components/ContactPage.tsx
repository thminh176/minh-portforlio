import type { Dictionary } from '@/i18n/types';
import { getProfile } from '@/lib/content';
import ContactForm from '@/components/ContactForm';
import DirectContact from '@/components/DirectContact';

export interface ContactPageProps {
  locale: string;
  dict: Dictionary;
}

export default async function ContactPage({ locale, dict }: ContactPageProps) {
  const isVi = locale === 'vi';
  if (locale !== 'vi' && locale !== 'en') throw new Error('Unsupported Contact locale');
  const profile = await getProfile(locale);
  const kicker = isVi ? 'LIÊN HỆ' : 'CONTACT';
  const heading = isVi
    ? 'Bạn đang làm gì? Mình muốn nghe thử.'
    : 'What are you working on? I’d love to hear.';
  const lead = isVi
    ? 'Có thể bắt đầu bằng một câu hỏi về dự án, một vấn đề kỹ thuật hoặc lời đề nghị hợp tác. Mình sẽ xem khi có thời gian.'
    : 'Feel free to reach out with a question about a project, a technical discussion, or a collaboration idea. I’ll read and respond when time permits.';

  const panelSubtitle = isVi
    ? 'Nếu bạn cần trao đổi nhanh, có thể gửi email hoặc gọi điện trực tiếp cho mình.'
    : 'If you prefer direct communication, feel free to send an email or give me a call.';

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* 1. Restrained Paper Hero */}
      <section className="pt-0 sm:pt-2 pb-8 sm:pb-12 border-b border-[var(--color-border)] text-left">
        <div className="max-w-3xl flex flex-col gap-4 sm:gap-6">
          {/* Identity Kicker */}
          <div className="font-mono text-xs sm:text-sm tracking-wider uppercase text-[var(--color-brick-deep)] font-semibold">
            {kicker}
          </div>

          {/* Single Semantic H1: Page Title */}
          <h1 className="font-display text-[32px] leading-[1.18] sm:text-4xl sm:leading-tight md:text-5xl lg:text-[56px] lg:leading-[1.12] font-bold text-[var(--color-ink)] tracking-tight">
            {heading}
          </h1>

          {/* Supporting Lead Copy */}
          <p className="font-body text-base sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            {lead}
          </p>
        </div>
      </section>

      {/* 2. Responsive Two-Column Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Form Presentation */}
        <div className="lg:col-span-7 w-full">
          <ContactForm locale={locale} dict={dict.contactForm} />
        </div>

        {/* Right Column: Dark Contact Panel per V2 Node 14:64 */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-[var(--color-dark)] text-[var(--color-dark-copy)] border border-[#243438] rounded-xs p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="font-mono text-xs uppercase tracking-wider text-[var(--color-dark-copy)]/80 font-semibold">
                {isVi ? 'LIÊN HỆ TRỰC TIẾP' : 'DIRECT CONTACT'}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {profile.name}
              </h2>
              <p className="font-body text-sm text-[var(--color-dark-copy)] leading-relaxed">
                {panelSubtitle}
              </p>
            </div>

            <div className="pt-4 border-t border-[#263539]">
              <DirectContact
                locale={locale}
                variant="compact"
                className="!flex-col !items-stretch gap-3 w-full text-xs sm:text-sm"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
