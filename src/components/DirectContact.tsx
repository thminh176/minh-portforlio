import { directContact } from '@/config/socials';

interface DirectContactProps {
  locale: string;
  variant?: 'cards' | 'compact';
  className?: string;
}

export default function DirectContact({
  locale,
  variant = 'cards',
  className = '',
}: DirectContactProps) {
  const isVi = locale === 'vi';
  const email = directContact.email;
  const phone = directContact.phone;

  if (variant === 'compact') {
    return (
      <div
        role="group"
        className={`flex flex-col sm:flex-row items-center justify-center gap-3 text-sm ${className}`}
        aria-label={isVi ? 'Thông tin liên hệ trực tiếp' : 'Direct contact details'}
      >
        <a
          href={email.href}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          <svg
            className="w-4 h-4 text-[var(--accent-primary)] shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <span className="font-semibold text-[var(--text-primary)]">
            {isVi ? email.labelVi : email.labelEn}:
          </span>
          <span className="break-all">{email.value}</span>
        </a>

        <a
          href={phone.href}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          <svg
            className="w-4 h-4 text-[var(--accent-primary)] shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span className="font-semibold text-[var(--text-primary)]">
            {isVi ? phone.labelVi : phone.labelEn}:
          </span>
          <span>{phone.value}</span>
        </a>
      </div>
    );
  }

  return (
    <div
      role="group"
      className={`grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full ${className}`}
      aria-label={isVi ? 'Thông tin liên hệ trực tiếp' : 'Direct contact details'}
    >
      <a
        href={email.href}
        className="group p-5 sm:p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-card)] transition-colors shadow-sm flex items-start gap-4 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] min-h-[44px]"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
          <svg
            className="w-5 h-5 text-[var(--accent-primary)]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <span className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider block">
            {isVi ? email.labelVi : email.labelEn}
          </span>
          <span className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors break-all block">
            {email.value}
          </span>
        </div>
      </a>

      <a
        href={phone.href}
        className="group p-5 sm:p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-card)] transition-colors shadow-sm flex items-start gap-4 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] min-h-[44px]"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
          <svg
            className="w-5 h-5 text-[var(--accent-primary)]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          <span className="text-xs font-semibold text-[var(--accent-primary)] uppercase tracking-wider block">
            {isVi ? phone.labelVi : phone.labelEn}
          </span>
          <span className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors block">
            {phone.value}
          </span>
        </div>
      </a>
    </div>
  );
}
