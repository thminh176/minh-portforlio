export const CONTACT_PURPOSES = ['freelance', 'job_opportunity', 'collaboration', 'other'] as const;
export type ContactPurposeId = (typeof CONTACT_PURPOSES)[number];

export interface ContactPurpose {
  id: ContactPurposeId;
  labelVi: string;
  labelEn: string;
}

export interface ContactFieldLimits {
  name: { min: number; max: number };
  email: { max: number };
  message: { min: number; max: number };
  turnstileToken: { max: number };
  maxBodyBytes: number;
}

export interface ContactConfig {
  isConfigured: boolean;
  status: 'needs_configuration' | 'ready';
  noticeVi: string;
  noticeEn: string;
  purposes: ContactPurpose[];
  fieldLimits: ContactFieldLimits;
  endpoint: string;
  turnstileSiteKey: string | null;
}

export const contactFieldLimits: ContactFieldLimits = {
  name: { min: 1, max: 100 },
  email: { max: 254 },
  message: { min: 10, max: 5000 },
  turnstileToken: { max: 2048 },
  maxBodyBytes: 16 * 1024, // 16 KiB = 16384 bytes
};

const isContactEnabled = process.env.NEXT_PUBLIC_CONTACT_ENABLED === 'true';
const turnstileSiteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '').trim() || null;
const isConfigured = Boolean(isContactEnabled && turnstileSiteKey);

export const contactConfig: ContactConfig = {
  isConfigured,
  status: isConfigured ? 'ready' : 'needs_configuration',
  noticeVi: isConfigured
    ? 'Biểu mẫu liên hệ đang hoạt động.'
    : 'Biểu mẫu hiện chưa nhận tin nhắn.',
  noticeEn: isConfigured
    ? 'The contact form is enabled.'
    : 'The form is not enabled yet. No message is sent.',
  purposes: [
    { id: 'freelance', labelVi: 'Làm website mới', labelEn: 'New website project' },
    { id: 'collaboration', labelVi: 'Chỉnh sửa hoặc nâng cấp website', labelEn: 'Website redesign or update' },
    { id: 'other', labelVi: 'Tư vấn hoặc trao đổi khác', labelEn: 'General consultation or other inquiry' },
    { id: 'job_opportunity', labelVi: 'Cơ hội công việc khác', labelEn: 'Other opportunity' },
  ],
  fieldLimits: contactFieldLimits,
  endpoint: '/api/contact',
  turnstileSiteKey,
};

export { directContact } from './socials';

