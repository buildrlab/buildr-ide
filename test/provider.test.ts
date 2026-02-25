import { describe, expect, it, vi } from 'vitest';
import { createChatCompletion } from '../src/core/provider';

describe('createChatCompletion', () => {
  it('posts prompt to chat completions endpoint', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'hello there' } }]
      })
    });

    const response = await createChatCompletion({
      baseUrl: 'https://example.com/v1/',
      apiKey: 'test-key',
      model: 'gpt-test',
      prompt: 'Hello',
      fetchFn: fetchFn as unknown as typeof fetch
    });

    expect(response).toBe('hello there');
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://example.com/v1/chat/completions');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer test-key',
      'Content-Type': 'application/json'
    });

    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      model: 'gpt-test',
      messages: [{ role: 'user', content: 'Hello' }]
    });
  });
});
