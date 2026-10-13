export interface AnalyticsConfig {
  enabled: boolean;
  token: string | null;
  provider: 'none' | 'cloudflare_web_analytics';
}

// By default and per Phase 1 requirements, analytics is disabled absent approved configuration.
// No tracking scripts or beacons are injected. Only privacy-preserving Cloudflare Web Analytics
// preparation is defined (no Google Analytics / GA4 even dormant).
export const analyticsConfig: AnalyticsConfig = {
  enabled: false,
  token: null,
  provider: 'none',
};
