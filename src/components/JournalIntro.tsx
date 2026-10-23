interface JournalIntroProps {
  locale: string;
}

export default function JournalIntro({ locale }: JournalIntroProps) {
  const isVi = locale === 'vi';

  const kicker = isVi ? 'GHI CHÉP' : 'JOURNAL';
  const heading = isVi
    ? 'Ghi chép về việc học và làm web'
    : 'Notes on learning and building for the web';
  const emptyNote = isVi
    ? 'Mình chưa đăng bài nào. Khi có ghi chép đủ rõ, mình sẽ chia sẻ ở đây.'
    : "No posts yet. I'll share notes here when they're ready.";

  return (
    <section id="journal" className="space-y-6 sm:space-y-8 scroll-mt-24 pt-12 sm:pt-16 border-t border-[var(--color-border)]">
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-brick-deep)] font-semibold">
          {kicker}
        </div>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-ink)]">
          {heading}
        </h2>
      </div>

      <p className="font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-xl">
        {emptyNote}
      </p>
    </section>
  );
}
