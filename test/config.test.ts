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

  it('handles special characters in project name', () => {
    const now = new Date('2025-06-01T00:00:00.000Z');
    const config = buildInitConfig('my cool-project 2.0', now);

    expect(config.workspace).toBe('my cool-project 2.0');
    expect(config.schemaVersion).toBe(1);
    expect(config.createdAt).toBe('2025-06-01T00:00:00.000Z');
  });

  it('result has the correct shape with all required fields', () => {
    const config = buildInitConfig('test', new Date('2025-01-01T00:00:00.000Z'));

    expect(config).toHaveProperty('schemaVersion');
    expect(config).toHaveProperty('createdAt');
    expect(config).toHaveProperty('workspace');
    expect(Object.keys(config)).toHaveLength(3);
  });

  it('returns a deepEqual-comparable object', () => {
    const now = new Date('2025-03-15T08:30:00.000Z');
    const a = buildInitConfig('workspace-a', now);
    const b = buildInitConfig('workspace-a', now);

    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
