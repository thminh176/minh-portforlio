export interface LocalizedProfile {
  name: string;
  role: string;
  tagline: string;
  bioSummary: string;
  aboutStory: string[];
}

export interface ProfileConfig {
  domain: string;
  vi: LocalizedProfile;
  en: LocalizedProfile;
}

export const profileConfig: ProfileConfig = {
  domain: 'damthienminh.id.vn',
  vi: {
    name: 'Đàm Thiên Minh',
    role: 'Web Developer',
    tagline: 'Tôi xây dựng website và ứng dụng web phục vụ nhu cầu thực tế, từ ý tưởng đến vận hành.',
    bioSummary:
      'Web Developer có kinh nghiệm triển khai và vận hành hạ tầng web, đang phát triển theo hướng backend và DevOps.',
    aboutStory: [
      'Tôi là Minh. Tôi quan tâm đến việc xây dựng website và ứng dụng web hữu ích, dễ dùng và phù hợp với công việc thực tế.',
      'Tôi đã làm việc với các ứng dụng dùng Next.js, trong đó có quản lý nội dung và quy trình vận hành. Công việc của tôi gồm làm rõ yêu cầu, rà soát phần triển khai, kiểm thử, đánh giá, triển khai và bảo trì ứng dụng.',
      'Tôi cũng cấu hình và quản lý môi trường Ubuntu Server, làm việc với Docker, PostgreSQL và Cloudflare, cùng việc quản lý tên miền và hạ tầng web.',
      'Tôi dùng Codex và Antigravity để hỗ trợ phát triển, không tự viết tay mọi phần của ứng dụng. Tôi xác định yêu cầu, kiểm tra mã và đánh giá hoạt động của ứng dụng trước khi đưa vào sử dụng.',
    ],
  },
  en: {
    name: 'Thien Minh Dam',
    role: 'Web Developer',
    tagline: 'I build websites and web applications for everyday needs, from idea to deployment and maintenance.',
    bioSummary:
      'Web Developer with hands-on deployment and web infrastructure experience, working toward backend engineering and DevOps.',
    aboutStory: [
      "I'm Minh. I focus on building useful, approachable websites and web applications that fit the work people need to do.",
      'I have worked with Next.js applications, including content management and operational workflows. My involvement covers defining requirements, reviewing implementations, testing, evaluating, deploying and maintaining applications.',
      'I also configure and manage Ubuntu Server environments and work with Docker, PostgreSQL and Cloudflare, alongside managing domains and web infrastructure.',
      'I use Codex and Antigravity to support development; I do not hand-code every part of an application. I define requirements, review the code and evaluate how the application behaves before putting it into use.',
    ],
  },
};
