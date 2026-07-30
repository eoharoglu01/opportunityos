import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.opportunityos.app",
  appName: "MarketRadar",
  webDir: "out",
  android: {
    allowMixedContent: false,
  },
};

export default config;