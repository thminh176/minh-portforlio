import { getDictionary } from '@/i18n';

export default function SkipLink({ locale }: { locale: string }) {
  const dict = getDictionary(locale);
  return (
    <a href="#main-content" className="skip-link">
      {dict.common.skipLink}
    </a>
  );
}
