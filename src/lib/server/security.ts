import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function secureCompare(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export function isBearerAuthorized(request: Request, expectedSecret?: string): boolean {
  const secret = expectedSecret?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  return secureCompare(header.slice(prefix.length), secret);
}

export function requestFingerprint(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "local";
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    const value = { count: 1, resetAt: now + windowMs };
    buckets.set(key, value);
    return { allowed: true, remaining: limit - 1, resetAt: value.resetAt };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

export function errorId(error: unknown): string {
  const input = error instanceof Error ? `${error.name}:${error.message}:${error.stack ?? ""}` : String(error);
  return createHash("sha256").update(`${Date.now()}:${input}`).digest("hex").slice(0, 12);
}
