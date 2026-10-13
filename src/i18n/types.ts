export type Locale = 'vi' | 'en';

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  features: string[];
}

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
}

export interface ApproachPoint {
  title: string;
  description: string;
}

export interface Dictionary {
  common: {
    skipLink: string;
    home: string;
    about: string;
    services: string;
    contact: string;
    switchLanguage: string;
    switchThemeLight: string;
    switchThemeDark: string;
    footerCopyright: string;
    openMenu: string;
    closeMenu: string;
    mobileMenu: string;
    mainNavigation: string;
  };
  home: {
    badge: string;
    ctaDiscuss: string;
    ctaAbout: string;
    servicesTitle: string;
    servicesSubtitle: string;
    servicesList: ServiceItem[];
    processTitle: string;
    processSubtitle: string;
    processSteps: ProcessStep[];
    aboutPreviewTitle: string;
    aboutPreviewText: string;
    learnMore: string;
    contactTitle: string;
    contactSubtitle: string;
  };
  about: {
    badge: string;
    title: string;
    lead: string;
    approachTitle: string;
    approachSubtitle: string;
    approachPoints: ApproachPoint[];
    servicesTitle: string;
    servicesSubtitle: string;
    servicesText: string[];
    contactCtaTitle: string;
    contactCtaSubtitle: string;
    contactCtaButton: string;
  };
  contactForm: {
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    purposeLabel: string;
    purposePlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    submitButton: string;
    submittingButton: string;
    disabledNotice: string;
    privacyNotice: string;
    statusReadyLabel: string;
    statusConfigLabel: string;
    successMessage: string;
    retryTurnstile: string;
    errors: {
      nameRequired: string;
      emailInvalid: string;
      purposeRequired: string;
      messageLength: string;
      turnstileRequired: string;
      turnstileExpired: string;
      turnstileError: string;
      sendFailed: string;
      serviceUnavailable: string;
      timeout: string;
      networkError: string;
    };
  };
}
