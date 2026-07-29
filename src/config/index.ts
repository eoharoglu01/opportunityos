export const appConfig = {
  appName: "OpportunityOS",
  environment: process.env.NODE_ENV ?? "development",
  features: {
    supabase: false,
    redis: false,
    ai: false,
    crawler: false,
    notifications: false,
  },
} as const;
