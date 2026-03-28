import { describe, expect, it } from 'vitest';
import { BuildrProviderConfig } from '../src/core/types';

describe('BuildrProviderConfig shape', () => {
  it('accepts an object with all required fields', () => {
    const config: BuildrProviderConfig = {
      id: 'openai',
      label: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiKeyEnvVar: 'OPENAI_API_KEY'
    };

    expect(config).toHaveProperty('id');
    expect(config).toHaveProperty('label');
    expect(config).toHaveProperty('baseUrl');
    expect(config).toHaveProperty('apiKeyEnvVar');
  });

  it('detects when required fields are missing', () => {
    const partial: Record<string, unknown> = {
      label: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1'
    };

    expect(partial).not.toHaveProperty('id');
    expect(partial).not.toHaveProperty('apiKeyEnvVar');
  });

  it('allows optional apiKey to be omitted', () => {
    const config: BuildrProviderConfig = {
      id: 'openai',
      label: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiKeyEnvVar: 'OPENAI_API_KEY'
    };

    expect(config.apiKey).toBeUndefined();
  });

  it('allows optional apiKey to be provided', () => {
    const config: BuildrProviderConfig = {
      id: 'openai',
      label: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      apiKeyEnvVar: 'OPENAI_API_KEY',
      apiKey: 'sk-test-123'
    };

    expect(config.apiKey).toBe('sk-test-123');
  });
});
