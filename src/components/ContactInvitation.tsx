interface ContactInvitationProps {
  locale: string;
}

export default function ContactInvitation({ locale }: ContactInvitationProps) {
  const isVi = locale === 'vi';
  const heading = isVi ? 'Có dự án muốn trao đổi?' : 'Have a project to discuss?';
  const cta = isVi ? 'Trao đổi với mình' : 'Get in touch';

  return (
    <section
      aria-label={isVi ? 'Lời mời liên hệ' : 'Contact invitation'}
      className="bg-[var(--color-dark)] text-white border border-[#243438] rounded-xs p-6 sm:p-8 lg:p-10"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
          {heading}
        </h2>

        <div className="shrink-0">
          <a
            href="#contact"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-white font-medium text-sm sm:text-base transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2 min-h-[44px] rounded-xs"
          >
            <span>{cta}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
