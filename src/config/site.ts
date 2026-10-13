export interface SiteConfig {
  domain: string;
  baseUrl: string;
  author: {
    vi: string;
    en: string;
  };
  isProduction: boolean;
}

export const siteConfig: SiteConfig = {
  domain: 'damthienminh.id.vn',
  baseUrl: 'https://damthienminh.id.vn',
  author: {
    vi: 'Đàm Thiên Minh',
    en: 'Thien Minh Dam',
  },
  // Default to false for preview / local builds; strictly true only when explicitly configured for production
  isProduction: process.env.NEXT_PUBLIC_SITE_ENV === 'production',
};
