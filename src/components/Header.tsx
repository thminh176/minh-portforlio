import HeaderClient from './HeaderClient';
import { loadSnapshot } from '@/lib/content';
import { createHeaderNavigation } from '@/lib/content/navigation';

interface HeaderProps {
  locale: string;
  activeRoute?: 'home' | 'about';
}

export default async function Header({ locale, activeRoute }: HeaderProps) {
  if (locale !== 'vi' && locale !== 'en') throw new Error('Unsupported Header locale');
  const snapshot = await loadSnapshot();
  return <HeaderClient {...createHeaderNavigation(snapshot, locale)} activeRoute={activeRoute} />;
}
