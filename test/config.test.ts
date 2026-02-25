import { describe, expect, it } from 'vitest';
import { buildInitConfig } from '../src/core/config';

describe('buildInitConfig', () => {
  it('creates a deterministic config payload', () => {
    const now = new Date('2025-02-24T12:00:00.000Z');
    const config = buildInitConfig('Buildr-Workspace', now);

    expect(config).toEqual({
      schemaVersion: 1,
      createdAt: '2025-02-24T12:00:00.000Z',
      workspace: 'Buildr-Workspace'
    });
  });
});
