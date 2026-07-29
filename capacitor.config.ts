import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.opportunityos.app",
  appName: "MarketRadar",
  webDir: "out",
  server: {
    url: "https://opportunityos-orcin.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
