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
    tagline: 'Mình làm web và chia sẻ các dự án cá nhân cùng ghi chép học tập.',
    bioSummary:
      'Mình làm các dự án web, có kinh nghiệm triển khai hạ tầng và đang học thêm về backend, DevOps.',
    aboutStory: [
      'Mình là Minh. Mình làm các dự án web và chia sẻ ghi chép về quá trình học, xây dựng chúng tại đây.',
      'Mình đã làm việc với ứng dụng Next.js và triển khai trên Ubuntu Server, sử dụng Docker, PostgreSQL và Cloudflare.',
    ],
  },
  en: {
    name: 'Thien Minh Dam',
    role: 'Web Developer',
    tagline: 'I build for the web and share personal projects and learning notes.',
    bioSummary:
      'I work on web projects, have deployment experience and am learning more about backend engineering and DevOps.',
    aboutStory: [
      "I'm Minh. I work on web projects and share notes here about learning and building them.",
      'I have worked with Next.js applications and deployments on Ubuntu Server, using Docker, PostgreSQL and Cloudflare.',
    ],
  },
};
