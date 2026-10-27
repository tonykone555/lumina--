import type { CapacitorConfig } from "@capacitor/cli";

// Private beta shell: YNOT remains hosted on Vercel so catalogue and UI updates
// can ship without rebuilding the native binary. Review App Store guidelines
// before external distribution; native capabilities must add real app value.
const config: CapacitorConfig = {
  appId: "app.ynotworld.ios",
  appName: "YNOT",
  webDir: "www",
  server: {
    url: "https://ynotworld.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
