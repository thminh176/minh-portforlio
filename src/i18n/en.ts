import type { Dictionary } from './types';

export const enDictionary: Dictionary = {
  common: {
    skipLink: 'Skip to main content',
    home: 'Home',
    about: 'About',
    services: 'Services',
    contact: 'Contact',
    switchLanguage: 'Tiếng Việt',
    switchThemeLight: 'Switch to light mode',
    switchThemeDark: 'Switch to dark mode',
    footerCopyright: 'All rights reserved.',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    mobileMenu: 'Mobile menu',
    mainNavigation: 'Main navigation',
  },
  home: {
    badge: 'Web Developer',
    ctaDiscuss: 'Get in touch',
    ctaAbout: 'Learn more',
    servicesTitle: 'Website services',
    servicesSubtitle:
      'Straightforward websites focused on clear content and ease of use for visitors.',
    servicesList: [
      {
        id: 'business',
        title: 'Websites for businesses and service providers',
        description:
          'Suited for introducing your background, services, and contact details clearly.',
        features: [
          'Clear layout that makes information easy to find',
          'Comfortable reading on phone and desktop',
          'Clear contact and background details',
        ],
      },
      {
        id: 'landing',
        title: 'Product and service landing pages',
        description:
          'A single page focused on a specific product, service, or offering so visitors get the point quickly.',
        features: [
          'Focused on one clear goal',
          'Direct path to getting in touch',
          'Lightweight and quick to load',
        ],
      },
    ],
    processTitle: 'How we work together',
    processSubtitle:
      'From defining requirements to testing and putting an application into use.',
    processSteps: [
      {
        step: 1,
        title: 'Define requirements',
        description:
          'Clarify the goals, users and how the application should support their work.',
      },
      {
        step: 2,
        title: 'Develop and review',
        description:
          'Use AI to support coding, review the implementation and refine it against the requirements.',
      },
      {
        step: 3,
        title: 'Test and maintain',
        description:
          'Check how the application behaves, deploy it and monitor it for ongoing maintenance.',
      },
    ],
    aboutPreviewTitle: 'About Thien Minh Dam',
    aboutPreviewText:
      'I am Minh. Here I share personal projects and notes on learning and building for the web.',
    learnMore: 'More about me',
    contactTitle: 'Contact',
    contactSubtitle:
      'Get in touch to discuss your website needs or upcoming project.',
  },
  about: {
    badge: 'About',
    title: 'About Thien Minh Dam',
    lead:
      'I build for the web and am learning more about backend engineering and DevOps.',
    approachTitle: 'Technologies I have worked with',
    approachSubtitle:
      'Technologies and projects I have worked with.',
    approachPoints: [
      {
        title: 'Web applications',
        description:
          'I have worked with Next.js applications, from defining requirements to reviewing and testing.',
      },
      {
        title: 'Deployment and infrastructure',
        description:
          'I configure Ubuntu Server environments, work with Docker, PostgreSQL and Cloudflare, and manage domains.',
      },
      {
        title: 'Personal projects',
        description:
          'I share the source for MCP Project Assistant and my personal portfolio in the mcp-project-assistant and minh-portforlio repositories.',
      },
    ],
    servicesTitle: 'Currently learning',
    servicesSubtitle:
      'Building foundations for backend engineering and DevOps.',
    servicesText: [
      'I am learning Java fundamentals, including syntax and object-oriented programming (OOP), alongside backend engineering principles. Spring Boot is a future learning focus, not part of my current work experience.',
      'I am continuing to learn Linux system administration and DevOps, building on my deployment and maintenance experience.',
      'I have completed the F8 courses Information Technology Onboarding, HTML & CSS, JavaScript Basic and JavaScript Advanced. These are course completion certificates, not professional certifications or claims of advanced expertise.',
    ],
    contactCtaTitle: 'Need a website?',
    contactCtaSubtitle:
      'Send me a question or a project idea you would like to discuss.',
    contactCtaButton: 'Discuss your website',
  },
  contactForm: {
    nameLabel: 'Full name',
    namePlaceholder: 'Your name',
    emailLabel: 'Email',
    emailPlaceholder: 'Your email',
    purposeLabel: 'Reason for contact',
    purposePlaceholder: 'Select an option...',
    messageLabel: 'Message',
    messagePlaceholder: 'Briefly describe your website needs or question...',
    submitButton: 'Send message',
    submittingButton: 'Sending...',
    disabledNotice:
      'The form is not enabled yet. No message is sent.',
    privacyNotice:
      'When form sending is enabled, your name, email, and message are forwarded through an email service to the mailbox. This website has no message database; the email service and mailbox may retain messages. Security verification is performed to prevent automated spam. If Telegram notifications are enabled, only a generic notice without personal data is sent. Web analytics are currently not enabled.',
    statusReadyLabel: 'Status: Ready to receive',
    statusConfigLabel: 'Status: Not enabled',
    successMessage:
      'Your message has been accepted for sending. Thank you for getting in touch.',
    retryTurnstile: 'Retry verification',
    errors: {
      nameRequired: 'Please enter your full name.',
      emailInvalid: 'Please enter a valid email address.',
      purposeRequired: 'Please select an inquiry purpose.',
      messageLength: 'Message must be between 10 and 5000 characters long.',
      turnstileRequired: 'Please complete the security verification.',
      turnstileExpired: 'Security verification token expired. Please verify again.',
      turnstileError: 'Security verification failed. Please try again.',
      sendFailed: 'Unable to send message at this time. Please try again later.',
      serviceUnavailable: 'The form is currently unavailable. Please try again later.',
      timeout: 'Request timed out while sending message. Please try again.',
      networkError: 'A network error occurred while sending your message. Please try again.',
    },
  },
};
