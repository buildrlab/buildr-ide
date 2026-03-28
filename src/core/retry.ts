export type RetryOptions = {
  maxAttempts: number;
  delayMs: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, delayMs, backoffFactor = 2, shouldRetry = () => true } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const waitMs = delayMs * Math.pow(backoffFactor, attempt - 1);
      await delay(waitMs);
    }
  }

  throw lastError;
}
