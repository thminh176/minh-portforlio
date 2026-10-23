import type { Dictionary } from './types';

export const viDictionary: Dictionary = {
  common: {
    skipLink: 'Bỏ qua đến nội dung chính',
    home: 'Trang chủ',
    about: 'Giới thiệu',
    services: 'Dịch vụ',
    contact: 'Liên hệ',
    switchLanguage: 'English',
    switchThemeLight: 'Chuyển sang giao diện sáng',
    switchThemeDark: 'Chuyển sang giao diện tối',
    footerCopyright: 'Bảo lưu mọi quyền.',
    openMenu: 'Mở menu',
    closeMenu: 'Đóng menu',
    mobileMenu: 'Menu di động',
    mainNavigation: 'Điều hướng chính',
  },
  home: {
    badge: 'Web Developer',
    ctaDiscuss: 'Liên hệ với tôi',
    ctaAbout: 'Tìm hiểu thêm',
    servicesTitle: 'Dịch vụ làm website',
    servicesSubtitle:
      'Các website được xây dựng gọn gàng, tập trung vào nội dung và sự thuận tiện của người xem.',
    servicesList: [
      {
        id: 'business',
        title: 'Website cho doanh nghiệp và dịch vụ',
        description:
          'Phù hợp khi bạn cần giới thiệu thông tin, dịch vụ và phương thức liên hệ một cách rõ ràng.',
        features: [
          'Bố cục thông tin rõ ràng, dễ theo dõi',
          'Hiển thị thuận tiện trên điện thoại và máy tính',
          'Đầy đủ thông tin liên hệ và giới thiệu',
        ],
      },
      {
        id: 'landing',
        title: 'Trang giới thiệu sản phẩm & landing page',
        description:
          'Trang đơn tập trung giới thiệu một sản phẩm, dịch vụ hoặc nội dung cụ thể để người xem dễ nắm bắt.',
        features: [
          'Tập trung vào một mục tiêu cụ thể',
          'Dẫn dắt tự nhiên đến nút liên hệ',
          'Gọn nhẹ, mở trang nhanh',
        ],
      },
    ],
    processTitle: 'Các bước làm việc',
    processSubtitle:
      'Từ làm rõ yêu cầu đến kiểm thử và đưa ứng dụng vào sử dụng.',
    processSteps: [
      {
        step: 1,
        title: 'Làm rõ yêu cầu',
        description:
          'Xác định mục tiêu, người dùng và cách ứng dụng hỗ trợ công việc thực tế.',
      },
      {
        step: 2,
        title: 'Phát triển và rà soát',
        description:
          'Dùng AI hỗ trợ viết mã; rà soát phần triển khai và điều chỉnh theo yêu cầu.',
      },
      {
        step: 3,
        title: 'Kiểm thử và vận hành',
        description:
          'Kiểm tra hoạt động của ứng dụng, triển khai và theo dõi để bảo trì khi cần.',
      },
    ],
    aboutPreviewTitle: 'Về Đàm Thiên Minh',
    aboutPreviewText:
      'Mình là Minh. Ở đây có các dự án cá nhân và ghi chép về quá trình mình học, làm web.',
    learnMore: 'Tìm hiểu thêm về mình',
    contactTitle: 'Liên hệ',
    contactSubtitle:
      'Trao đổi về nhu cầu làm website hoặc dự án sắp tới của bạn.',
  },
  about: {
    badge: 'Giới thiệu',
    title: 'Giới thiệu về Đàm Thiên Minh',
    lead:
      'Mình làm web và đang học thêm về backend, DevOps.',
    approachTitle: 'Những công nghệ mình đã làm việc cùng',
    approachSubtitle:
      'Các công nghệ và dự án mình đã làm việc cùng.',
    approachPoints: [
      {
        title: 'Ứng dụng web',
        description:
          'Mình đã làm việc với ứng dụng Next.js, từ xác định yêu cầu đến rà soát và kiểm thử.',
      },
      {
        title: 'Triển khai và hạ tầng',
        description:
          'Mình cấu hình môi trường Ubuntu Server, làm việc với Docker, PostgreSQL, Cloudflare và quản lý tên miền.',
      },
      {
        title: 'Dự án cá nhân',
        description:
          'Mình chia sẻ mã nguồn MCP Project Assistant và portfolio cá nhân trong hai repo mcp-project-assistant và minh-portforlio.',
      },
    ],
    servicesTitle: 'Mình đang học thêm',
    servicesSubtitle:
      'Xây nền tảng để phát triển theo hướng backend và DevOps.',
    servicesText: [
      'Mình đang học Java ở mức nền tảng, gồm cú pháp và lập trình hướng đối tượng (OOP), cùng các nguyên tắc phát triển backend. Spring Boot là hướng tìm hiểu tiếp theo, chưa phải kinh nghiệm làm việc hiện tại.',
      'Mình tiếp tục học quản trị Linux và DevOps, dựa trên kinh nghiệm triển khai và vận hành đã có.',
      'Mình đã hoàn thành các khóa F8: Nhập môn Công nghệ thông tin, HTML & CSS, JavaScript cơ bản và JavaScript nâng cao. Đây là chứng nhận hoàn thành khóa học, không phải chứng chỉ nghề nghiệp hay khẳng định trình độ chuyên sâu.',
    ],
    contactCtaTitle: 'Bạn cần trao đổi về website?',
    contactCtaSubtitle:
      'Gửi mình câu hỏi hoặc ý tưởng dự án bạn muốn trao đổi.',
    contactCtaButton: 'Trao đổi về website của bạn',
  },
  contactForm: {
    nameLabel: 'Họ và tên',
    namePlaceholder: 'Tên của bạn',
    emailLabel: 'Email',
    emailPlaceholder: 'Email của bạn',
    purposeLabel: 'Nhu cầu của bạn',
    purposePlaceholder: 'Chọn nội dung trao đổi...',
    messageLabel: 'Nội dung trao đổi',
    messagePlaceholder: 'Mô tả ngắn gọn về website bạn muốn làm hoặc câu hỏi của bạn...',
    submitButton: 'Gửi tin nhắn',
    submittingButton: 'Đang gửi...',
    disabledNotice:
      'Biểu mẫu hiện chưa nhận tin nhắn.',
    privacyNotice:
      'Khi bật tính năng gửi, tên, email và nội dung được chuyển qua dịch vụ email đến hộp thư. Website không có cơ sở dữ liệu tin nhắn; dịch vụ email và hộp thư có thể lưu thư. Xác thực bảo mật được thực hiện để tránh gửi tự động. Nếu bật thông báo Telegram, chỉ gửi thông báo chung không chứa dữ liệu cá nhân. Theo dõi truy cập hiện chưa bật.',
    statusReadyLabel: 'Trạng thái: Đang bật',
    statusConfigLabel: 'Trạng thái: Chưa bật',
    successMessage:
      'Hệ thống đã tiếp nhận tin nhắn của bạn. Cảm ơn bạn đã liên hệ!',
    retryTurnstile: 'Thử xác thực lại',
    errors: {
      nameRequired: 'Vui lòng nhập họ và tên của bạn.',
      emailInvalid: 'Vui lòng nhập địa chỉ email hợp lệ.',
      purposeRequired: 'Vui lòng chọn nội dung trao đổi.',
      messageLength: 'Nội dung tin nhắn phải có từ 10 đến 5000 ký tự.',
      turnstileRequired: 'Vui lòng hoàn thành bước xác thực bảo mật.',
      turnstileExpired: 'Mã xác thực bảo mật đã hết hạn. Vui lòng xác thực lại.',
      turnstileError: 'Xác thực bảo mật không thành công. Vui lòng thử lại.',
      sendFailed: 'Không thể gửi tin nhắn lúc này. Vui lòng thử lại sau.',
      serviceUnavailable: 'Dịch vụ tiếp nhận tin nhắn hiện chưa được kích hoạt trên hệ thống.',
      timeout: 'Yêu cầu gửi tin nhắn đã quá thời gian chờ. Vui lòng kiểm tra kết nối và thử lại.',
      networkError: 'Lỗi kết nối mạng khi gửi tin nhắn. Vui lòng kiểm tra đường truyền và thử lại.',
    },
  },
};
