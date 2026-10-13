import Link from 'next/link';
import { getDictionary } from '@/i18n';
import { profileConfig } from '@/config/profile';
import { getPublishedSocialLinks } from '@/config/socials';

interface FooterProps {
  locale: string;
}

export default function Footer({ locale }: FooterProps) {
  const profile = locale === 'vi' ? profileConfig.vi : profileConfig.en;
  const dict = getDictionary(locale);
  const currentYear = new Date().getFullYear();
  const publishedSocials = getPublishedSocialLinks();

  return (
    <footer className="w-full border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-10 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-[var(--text-secondary)]">
        {/* Moniker & Copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
          <span className="font-medium text-xs text-[var(--accent-primary)]">
            {profileConfig.domain}
          </span>
          <span className="hidden sm:inline text-[var(--border-strong)]" aria-hidden="true">•</span>
          <span className="text-xs text-[var(--text-muted)]">
            © {currentYear} {profile.name}. {dict.common.footerCopyright}
          </span>
        </div>

        {/* Footer Navigation & Published Contact Links */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {publishedSocials.length > 0 && (
            <div
              role="group"
              className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 text-xs"
              aria-label={locale === 'vi' ? 'Thông tin liên hệ trực tiếp' : 'Direct contact details'}
            >
              {publishedSocials.map((social) => {
                const isNativeProtocol =
                  social.href.startsWith('mailto:') || social.href.startsWith('tel:');
                const label = locale === 'vi' ? social.labelVi : social.labelEn;
                return (
                  <a
                    key={social.id}
                    href={social.href}
                    {...(!isNativeProtocol ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors min-h-[44px] flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] rounded px-1"
                  >
                    <span className="font-semibold text-[var(--text-primary)]">{label}:</span>
                    <span className="break-all">{social.value || social.href}</span>
                  </a>
                );
              })}
            </div>
          )}

          <nav className="flex items-center gap-6 text-xs font-medium" aria-label={locale === 'vi' ? 'Liên kết chân trang' : 'Footer navigation'}>
            <Link
              href={`/${locale}/`}
              className="hover:text-[var(--accent-primary)] transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] rounded px-1"
            >
              {dict.common.home}
            </Link>
            <Link
              href={`/${locale}/about/`}
              className="hover:text-[var(--accent-primary)] transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] rounded px-1"
            >
              {dict.common.about}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
