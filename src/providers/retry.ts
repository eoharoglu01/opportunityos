import { ConsoleLogger, type Logger } from "../logger";

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 250,
  maxDelayMs: 2_000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy,
  logger: Logger = new ConsoleLogger(),
  operationName = "operation",
): Promise<T> {
  let attempt = 0;
  let delayMs = policy.initialDelayMs;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      if (attempt >= policy.maxAttempts) {
        logger.error(`Retry exhausted for ${operationName}`, { error });
        throw error;
      }

      logger.warn(`Retrying ${operationName} after ${delayMs}ms`, { attempt, error });
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs);
      });
      delayMs = Math.min(delayMs * policy.backoffMultiplier, policy.maxDelayMs);
    }
  }
}
