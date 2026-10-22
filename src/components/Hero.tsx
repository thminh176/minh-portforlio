import Link from 'next/link';

interface HeroProps {
  locale: string;
}

export default function Hero({ locale }: HeroProps) {
  const isVi = locale === 'vi';

  const identity = isVi ? 'Đàm Thiên Minh' : 'Thien Minh Dam';
  const headline = isVi
    ? 'Mình làm web. Đây là những gì mình đang xây.'
    : "I build for the web. Here's what I'm working on.";
  const supporting = isVi
    ? 'Mình dùng Codex và Antigravity để hỗ trợ phát triển, từ làm rõ yêu cầu đến kiểm tra và vận hành.'
    : 'I use Codex and Antigravity to support development, from defining requirements to reviewing and running the result.';
  const primaryCta = isVi ? 'Trao đổi với mình' : 'Get in touch';
  const secondaryCta = isVi ? 'Về mình' : 'About me';

  return (
    <section className="pt-2 pb-12 sm:pb-16 border-b border-[var(--color-border)] text-left">
      {/* Mono Top Ledger Label */}
      <div className="flex items-center justify-between text-xs font-mono tracking-wider uppercase text-[var(--text-secondary)] pb-3 border-b border-[var(--color-border)] mb-8 sm:mb-12">
        <span>{isVi ? 'SELECTED WORK / PORTFOLIO' : 'SELECTED WORK / PORTFOLIO'}</span>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Large Identity Line */}
        <div className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold text-[var(--color-ink)] leading-tight tracking-tight">
          {identity}
        </div>

        {/* Short Brick Accent Rule */}
        <div
          className="w-12 h-1 bg-[var(--color-brick-deep)]"
          aria-hidden="true"
        />

        {/* Single Semantic H1: Multiline Narrative */}
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-bold text-[var(--color-ink)] leading-[1.12] tracking-tight">
          {isVi ? (
            <>
              <span className="block">Mình làm web.</span>
              <span className="block">Đây là những gì</span>
              <span className="block">mình đang xây.</span>
            </>
          ) : (
            <>
              <span className="block">I build for the web.</span>
              <span className="block">Here&apos;s what I&apos;m</span>
              <span className="block">working on.</span>
            </>
          )}
        </h1>

        {/* Supporting Editorial Copy */}
        <p className="font-body text-base sm:text-lg lg:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl pt-2">
          {supporting}
        </p>

        {/* Real CTAs */}
        <div className="pt-4 flex flex-wrap items-center gap-4">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--color-dark)] text-white hover:bg-[var(--color-ink)] font-medium text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2 min-h-[44px] rounded-xs"
          >
            <span>{primaryCta}</span>
            <span aria-hidden="true">↗</span>
          </a>
          <Link
            href={`/${locale}/about/`}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--color-subtle)] text-[var(--color-ink)] hover:bg-[#E4E2DA] border border-[var(--color-border)] font-medium text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2 min-h-[44px] rounded-xs"
          >
            <span>{secondaryCta}</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
