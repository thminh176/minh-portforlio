export interface SocialLink {
  id: 'github' | 'linkedin' | 'email' | 'zalo' | 'phone';
  labelVi: string;
  labelEn: string;
  value?: string;
  href: string;
  isPublished: boolean;
}

export interface DirectContactDetail {
  id: 'email' | 'phone';
  labelVi: string;
  labelEn: string;
  value: string;
  href: string;
  isPublished: boolean;
}

export interface DirectContact {
  email: DirectContactDetail;
  phone: DirectContactDetail;
}

// Authorized owner-provided public contact details (2026-10-12 clarification).
// Native mailto and tel links; no provider credentials or unverified Zalo links.
export const directContact: DirectContact = {
  email: {
    id: 'email',
    labelVi: 'Email',
    labelEn: 'Email',
    value: 'thminh.176.vn@gmail.com',
    href: 'mailto:thminh.176.vn@gmail.com',
    isPublished: true,
  },
  phone: {
    id: 'phone',
    labelVi: 'Điện thoại',
    labelEn: 'Phone',
    value: '0777747704',
    href: 'tel:+84777747704',
    isPublished: true,
  },
};

// Configured social/contact channels.
// Published entries derive directly from canonical directContact.
// Unverified channels (github, linkedin, zalo) remain unpublished per safety guidelines.
export const socialLinks: SocialLink[] = [
  directContact.email,
  directContact.phone,

  {
    id: 'github',
    labelVi: 'GitHub',
    labelEn: 'GitHub',
    href: '',
    isPublished: false,
  },
  {
    id: 'linkedin',
    labelVi: 'LinkedIn',
    labelEn: 'LinkedIn',
    href: '',
    isPublished: false,
  },
  {
    id: 'zalo',
    labelVi: 'Zalo',
    labelEn: 'Zalo',
    href: '',
    isPublished: false,
  },
];

export function getPublishedSocialLinks(): SocialLink[] {
  return socialLinks.filter((link) => link.isPublished && link.href.length > 0);
}

