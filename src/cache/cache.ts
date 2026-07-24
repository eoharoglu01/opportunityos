import type { CacheEntry } from "../types/collection";

export interface Cache<TValue> {
  get(key: string): TValue | undefined;
  set(key: string, value: TValue, ttlMs: number): void;
  delete(key: string): void;
}

export class InMemoryCache<TValue> implements Cache<TValue> {
  private readonly entries = new Map<string, CacheEntry<TValue>>();

  get(key: string): TValue | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: TValue, ttlMs: number): void {
    const now = Date.now();
    this.entries.set(key, {
      value,
      expiresAt: now + ttlMs,
      createdAt: now,
    });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }
}
