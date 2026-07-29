export interface RateLimiter {
  waitIfNeeded(key: string): Promise<void>;
}

export class NoopRateLimiter implements RateLimiter {
  async waitIfNeeded(): Promise<void> {
    return undefined;
  }
}

export class TokenBucketRateLimiter implements RateLimiter {
  private readonly timestamps = new Map<string, number[]>();

  constructor(private readonly requestsPerMinute: number) {}

  async waitIfNeeded(key: string): Promise<void> {
    const now = Date.now();
    const window = 60_000;
    const history = this.timestamps.get(key) ?? [];
    const recent = history.filter((timestamp) => now - timestamp < window);

    if (recent.length >= this.requestsPerMinute) {
      const waitMs = window - (now - recent[0]);
      await new Promise((resolve) => {
        setTimeout(resolve, waitMs);
      });
    }

    recent.push(now);
    this.timestamps.set(key, recent);
  }
}
