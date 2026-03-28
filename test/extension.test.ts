import { describe, expect, it } from 'vitest';
import { BuildrProviderConfig } from '../src/core/types';

// Inline the selectProvider logic for testing (since it's not exported)
const selectProvider = (
  providers: BuildrProviderConfig[],
  providerId?: string
): BuildrProviderConfig | undefined => {
  if (!providers.length) {
    return undefined;
  }

  if (!providerId) {
    return providers[0];
  }

  return providers.find((provider) => provider.id === providerId) ?? providers[0];
};

const makeProvider = (id: string): BuildrProviderConfig => ({
  id,
  label: `Provider ${id}`,
  baseUrl: `https://${id}.example.com/v1`,
  apiKeyEnvVar: `${id.toUpperCase()}_KEY`
});

describe('selectProvider', () => {
  it('returns undefined when providers array is empty', () => {
    expect(selectProvider([])).toBeUndefined();
  });

  it('returns first provider when no providerId given', () => {
    const providers = [makeProvider('alpha'), makeProvider('beta')];
    expect(selectProvider(providers)).toBe(providers[0]);
  });

  it('returns matching provider by id', () => {
    const providers = [makeProvider('alpha'), makeProvider('beta')];
    expect(selectProvider(providers, 'beta')).toBe(providers[1]);
  });

  it('falls back to first provider when id not found', () => {
    const providers = [makeProvider('alpha'), makeProvider('beta')];
    expect(selectProvider(providers, 'nonexistent')).toBe(providers[0]);
  });
});
