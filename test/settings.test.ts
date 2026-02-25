import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL, DEFAULT_PROVIDERS, normalizeModel, normalizeProviders } from '../src/core/settings';

describe('normalizeProviders', () => {
  it('falls back to defaults when no providers are provided', () => {
    expect(normalizeProviders(undefined)).toEqual(DEFAULT_PROVIDERS);
  });

  it('filters and normalizes providers', () => {
    const providers = normalizeProviders([
      {
        id: 'custom',
        label: 'Custom',
        baseUrl: 'https://example.com/v1/',
        apiKeyEnvVar: 'CUSTOM_KEY'
      },
      { label: 'Missing fields' }
    ]);

    expect(providers).toEqual([
      {
        id: 'custom',
        label: 'Custom',
        baseUrl: 'https://example.com/v1',
        apiKeyEnvVar: 'CUSTOM_KEY'
      }
    ]);
  });
});

describe('normalizeModel', () => {
  it('falls back to default model', () => {
    expect(normalizeModel('')).toBe(DEFAULT_MODEL);
  });
});
