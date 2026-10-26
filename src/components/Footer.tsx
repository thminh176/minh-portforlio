import Link from 'next/link';
import { getDictionary } from '@/i18n';
import { siteConfig } from '@/config/site';
import { getPublishedSocialLinks } from '@/config/socials';
import { getProfile } from '@/lib/content';
import type { Locale } from '@/lib/content/types';

interface FooterProps {
  locale: string;
}

export default async function Footer({ locale }: FooterProps) {
  if (locale !== 'vi' && locale !== 'en') throw new Error('Unsupported Footer locale');
  const profile = await getProfile(locale as Locale);
  const dict = getDictionary(locale);
  const currentYear = new Date().getFullYear();
  const publishedSocials = getPublishedSocialLinks();

  return (
    <footer className="w-full border-t border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-ink)] transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-12 flex flex-col gap-8">
        {/* Upper Ledger: Direct Contacts & Site Navigation */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-[var(--color-border)]">
          {publishedSocials.length > 0 && (
            <div
              role="group"
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs"
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
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--color-brick-deep)] transition-colors min-h-[44px] inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)] rounded-xs py-1"
                  >
                    <span className="font-medium text-[var(--color-ink)] whitespace-nowrap">{label}:</span>
                    <span className="break-all font-mono text-[11px] sm:text-xs text-[var(--text-secondary)]">
                      {social.value || social.href}
                    </span>
                  </a>
                );
              })}
            </div>
          )}

          <nav
            className="flex items-center gap-6 text-xs font-medium"
            aria-label={locale === 'vi' ? 'Liên kết chân trang' : 'Footer navigation'}
          >
            <Link
              href={`/${locale}/`}
              className="text-[var(--color-ink)] hover:text-[var(--color-brick-deep)] transition-colors min-h-[44px] inline-flex items-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)] rounded-xs py-1"
            >
              {dict.common.home}
            </Link>
            <Link
              href={`/${locale}/about/`}
              className="text-[var(--color-ink)] hover:text-[var(--color-brick-deep)] transition-colors min-h-[44px] inline-flex items-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)] rounded-xs py-1"
            >
              {dict.common.about}
            </Link>
          </nav>
        </div>

        {/* Lower Ledger: Colophon & Copyright */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-[var(--text-secondary)]">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-left">
            <span className="font-mono text-xs font-semibold tracking-wider text-[var(--color-brick-deep)]">
              {new URL(siteConfig.baseUrl).hostname}
            </span>
            <span className="text-[var(--color-border)] select-none" aria-hidden="true">
              /
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {profile.name} · {profile.role}
            </span>
          </div>

          <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
            © {currentYear} {profile.name}. {dict.common.footerCopyright}
          </div>
        </div>
      </div>
    </footer>
  );
}
