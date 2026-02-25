import { BuildrProviderConfig } from './types';

export const DEFAULT_MODEL = 'gpt-4o-mini';

export const DEFAULT_PROVIDERS: BuildrProviderConfig[] = [
  {
    id: 'openai',
    label: 'OpenAI Compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnvVar: 'OPENAI_API_KEY'
  }
];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const toProvider = (value: unknown): BuildrProviderConfig | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (!isNonEmptyString(record.label) || !isNonEmptyString(record.baseUrl) || !isNonEmptyString(record.apiKeyEnvVar)) {
    return null;
  }

  const id = isNonEmptyString(record.id)
    ? record.id.trim()
    : record.label.trim().toLowerCase().replace(/\s+/g, '-');

  if (!id) {
    return null;
  }

  const provider: BuildrProviderConfig = {
    id,
    label: record.label.trim(),
    baseUrl: normalizeBaseUrl(record.baseUrl),
    apiKeyEnvVar: record.apiKeyEnvVar.trim()
  };

  if (isNonEmptyString(record.apiKey)) {
    provider.apiKey = record.apiKey.trim();
  }

  return provider;
};

export const normalizeProviders = (raw: unknown): BuildrProviderConfig[] => {
  if (!Array.isArray(raw)) {
    return DEFAULT_PROVIDERS;
  }

  const providers = raw
    .map((entry) => toProvider(entry))
    .filter((entry): entry is BuildrProviderConfig => Boolean(entry));

  return providers.length ? providers : DEFAULT_PROVIDERS;
};

export const normalizeModel = (raw: unknown): string => {
  if (!isNonEmptyString(raw)) {
    return DEFAULT_MODEL;
  }

  return raw.trim();
};
