export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ChatCompletionRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  fetchFn?: FetchFn;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const readErrorBody = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    return text || response.statusText;
  } catch {
    return response.statusText;
  }
};

export const createChatCompletion = async ({
  baseUrl,
  apiKey,
  model,
  prompt,
  fetchFn
}: ChatCompletionRequest): Promise<string> => {
  if (!prompt.trim()) {
    throw new Error('Prompt is empty.');
  }

  const requestUrl = `${normalizeBaseUrl(baseUrl)}/chat/completions`;
  const callFetch = fetchFn ?? fetch;

  const response = await callFetch(requestUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const message = await readErrorBody(response);
    throw new Error(`Provider error (${response.status}): ${message}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Provider response did not include content.');
  }

  return content;
};
