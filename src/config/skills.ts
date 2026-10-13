export type SkillStatus = 'used';

export interface SkillItem {
  name: string;
  category: 'web' | 'ai_workflow';
  status: SkillStatus;
  descriptionVi: string;
  descriptionEn: string;
}

export interface SkillCategoryInfo {
  id: 'web' | 'ai_workflow';
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
}

export const skillCategories: SkillCategoryInfo[] = [
  {
    id: 'web',
    titleVi: 'Web và hạ tầng',
    titleEn: 'Web and infrastructure',
    descriptionVi: 'Công nghệ đã làm việc cùng trong ứng dụng web và môi trường triển khai; không phải mức đánh giá thành thạo.',
    descriptionEn: 'Technologies worked with in web applications and deployment environments, not proficiency ratings.',
  },
  {
    id: 'ai_workflow',
    titleVi: 'Quy trình và công cụ AI',
    titleEn: 'AI workflow and tooling',
    descriptionVi: 'AI hỗ trợ viết mã; tôi xác định yêu cầu, rà soát và kiểm tra kết quả.',
    descriptionEn: 'AI supports coding; I define requirements, review the output and test the results.',
  },
];

// Owner-confirmed experience plus tools used in this portfolio; learning stays
// separate in the localized About copy. No proficiency or certification claims.
export const skillsList: SkillItem[] = [
  // Web Development
  {
    name: 'Next.js',
    category: 'web',
    status: 'used',
    descriptionVi: 'Đã làm việc với website và ứng dụng Next.js, gồm quản lý nội dung và quy trình vận hành.',
    descriptionEn: 'Worked with Next.js websites and applications, including content management and operational workflows.',
  },
  {
    name: 'React',
    category: 'web',
    status: 'used',
    descriptionVi: 'Dùng trong các phần tương tác của portfolio này; không hàm ý tự viết toàn bộ mã ứng dụng.',
    descriptionEn: 'Used for interactions in this portfolio; this does not imply I hand-coded the entire application.',
  },
  {
    name: 'TypeScript',
    category: 'web',
    status: 'used',
    descriptionVi: 'Dùng trong portfolio để kiểm tra kiểu dữ liệu khi rà soát phần triển khai.',
    descriptionEn: 'Used in this portfolio for type checking during implementation review.',
  },
  {
    name: 'Tailwind CSS',
    category: 'web',
    status: 'used',
    descriptionVi: 'Giúp tùy chỉnh màu sắc và bố cục hiển thị cho máy tính và điện thoại.',
    descriptionEn: 'Controls styling, colors, and layout across desktop and mobile screens.',
  },

  // Deployment and infrastructure
  {
    name: 'Ubuntu Server', category: 'web', status: 'used',
    descriptionVi: 'Cấu hình và quản lý môi trường máy chủ cho ứng dụng web.',
    descriptionEn: 'Configure and manage server environments for web applications.',
  },
  {
    name: 'Docker', category: 'web', status: 'used',
    descriptionVi: 'Đã làm việc với Docker trong môi trường triển khai ứng dụng.',
    descriptionEn: 'Worked with Docker in application deployment environments.',
  },
  {
    name: 'PostgreSQL', category: 'web', status: 'used',
    descriptionVi: 'Đã làm việc với PostgreSQL trong các ứng dụng phục vụ doanh nghiệp.',
    descriptionEn: 'Worked with PostgreSQL in business-oriented applications.',
  },
  {
    name: 'Cloudflare', category: 'web', status: 'used',
    descriptionVi: 'Đã làm việc với Cloudflare trong quản lý tên miền và hạ tầng web.',
    descriptionEn: 'Worked with Cloudflare in domain and web infrastructure management.',
  },
  {
    name: 'Codex',
    category: 'ai_workflow',
    status: 'used',
    descriptionVi: 'Hỗ trợ phát triển và rà soát mã theo yêu cầu tôi xác định.',
    descriptionEn: 'Supports development and code review against requirements I define.',
  },
  {
    name: 'Antigravity',
    category: 'ai_workflow',
    status: 'used',
    descriptionVi: 'Hỗ trợ viết mã và kiểm thử; kết quả cần được rà soát và đánh giá.',
    descriptionEn: 'Supports coding and testing; its output still needs review and evaluation.',
  },
  {
    name: 'Playwright',
    category: 'ai_workflow',
    status: 'used',
    descriptionVi: 'Playwright chạy kiểm thử tự động trên trình duyệt để kiểm tra bố cục và tương tác.',
    descriptionEn: 'Playwright runs automated browser tests to check layout and interactions.',
  },
];
