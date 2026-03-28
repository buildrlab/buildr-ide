import { describe, expect, it, vi } from 'vitest';
import { withRetry, RetryOptions } from '../src/core/retry';

describe('withRetry', () => {
  it('succeeds on first try', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on second try', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('exhausts retries and throws last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent'));

    await expect(
      withRetry(fn, { maxAttempts: 3, delayMs: 10 })
    ).rejects.toThrow('persistent');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respects shouldRetry callback', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('no-retry'));

    const shouldRetry: RetryOptions['shouldRetry'] = (error) =>
      error instanceof Error && error.message !== 'no-retry';

    await expect(
      withRetry(fn, { maxAttempts: 3, delayMs: 10, shouldRetry })
    ).rejects.toThrow('no-retry');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
