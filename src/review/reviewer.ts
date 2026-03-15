import { createChatCompletion } from '../core/provider';

export interface ReviewIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  title: string;
  description: string;
  fix?: string;
}

export interface ReviewRequest {
  code: string;
  language: string;
  context?: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

const buildReviewPrompt = (code: string, language: string, context?: string): string => {
  let prompt = `Review this ${language} code. Be concise and practical. Focus on:
- Bugs and edge cases
- Performance issues
- Security concerns
- Readability improvements

Give each issue a severity: 🔴 Critical | 🟡 Warning | 🟢 Suggestion

Respond ONLY with a JSON array. Each element must have:
- "severity": "critical" | "warning" | "suggestion"
- "title": short title string
- "description": explanation string
- "fix": optional code fix string (omit if not applicable)

If the code has no issues, return an empty array: []

Do not include any text outside the JSON array.`;

  if (context) {
    prompt += `\n\nSurrounding context (for reference only, do not review):\n\`\`\`\n${context}\n\`\`\``;
  }

  prompt += `\n\nCode to review:\n\`\`\`${language}\n${code}\n\`\`\``;

  return prompt;
};

const parseReviewResponse = (raw: string): ReviewIssue[] => {
  const trimmed = raw.trim();

  // Try to extract JSON array from the response
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
      .map((item) => ({
        severity: normalizeSeverity(item.severity),
        title: typeof item.title === 'string' ? item.title : 'Issue',
        description: typeof item.description === 'string' ? item.description : '',
        ...(typeof item.fix === 'string' && item.fix.trim() ? { fix: item.fix } : {})
      }));
  } catch {
    return [];
  }
};

const normalizeSeverity = (value: unknown): ReviewIssue['severity'] => {
  if (value === 'critical') return 'critical';
  if (value === 'warning') return 'warning';
  return 'suggestion';
};

export const reviewCode = async (request: ReviewRequest): Promise<ReviewIssue[]> => {
  const prompt = buildReviewPrompt(request.code, request.language, request.context);

  const response = await createChatCompletion({
    baseUrl: request.baseUrl,
    apiKey: request.apiKey,
    model: request.model,
    prompt
  });

  return parseReviewResponse(response);
};
