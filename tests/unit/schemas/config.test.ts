import { describe, it, expect } from 'vitest';
import { ConfigSchema, defaultConfig } from '../../../src/schemas/config';

describe('Config Schema', () => {
  describe('ConfigSchema.parse', () => {
    const validConfig = {
      project: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Project',
        repo_root: '/path/to/project',
      },
      clients: {
        synced: ['claude'],
        default: 'claude',
      },
      preferences: {
        verbose: false,
      },
    };

    it('accepts valid config', () => {
      expect(() => ConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('requires project.id as UUID', () => {
      const invalidUUID = {
        ...validConfig,
        project: { ...validConfig.project, id: 'not-a-uuid' },
      };
      expect(() => ConfigSchema.parse(invalidUUID)).toThrow();
    });

    it('requires project.name', () => {
      const missingName = {
        ...validConfig,
        project: { id: validConfig.project.id, repo_root: validConfig.project.repo_root },
      };
      expect(() => ConfigSchema.parse(missingName)).toThrow();
    });

    it('allows empty clients.synced', () => {
      const emptySynced = {
        ...validConfig,
        clients: { ...validConfig.clients, synced: [] },
      };
      expect(() => ConfigSchema.parse(emptySynced)).not.toThrow();
    });

    it('validates client enum values', () => {
      const invalidClient = {
        ...validConfig,
        clients: { ...validConfig.clients, synced: ['invalid'] },
      };
      expect(() => ConfigSchema.parse(invalidClient)).toThrow();
    });

    it('allows optional preferences', () => {
      const withoutPreferences = {
        project: validConfig.project,
        clients: validConfig.clients,
      };
      expect(() => ConfigSchema.parse(withoutPreferences)).not.toThrow();
    });

    it('accepts all valid client types', () => {
      for (const client of ['claude', 'opencode', 'codex']) {
        const config = {
          ...validConfig,
          clients: { synced: [client], default: client },
        };
        expect(() => ConfigSchema.parse(config)).not.toThrow();
      }
    });

    it('accepts optional languages', () => {
      const withLanguages = {
        ...validConfig,
        project: {
          ...validConfig.project,
          languages: [
            { name: 'TypeScript', detected_from: ['package.json', 'tsconfig.json'] },
          ],
        },
      };
      expect(() => ConfigSchema.parse(withLanguages)).not.toThrow();
    });
  });

  describe('defaultConfig', () => {
    it('returns valid Config', () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const config = defaultConfig(projectId, 'My Project', '/path');

      expect(() => ConfigSchema.parse(config)).not.toThrow();
    });

    it('sets empty synced array', () => {
      const config = defaultConfig('550e8400-e29b-41d4-a716-446655440000', 'Test', '/path');
      expect(config.clients.synced).toEqual([]);
    });

    it('sets claude as default client', () => {
      const config = defaultConfig('550e8400-e29b-41d4-a716-446655440000', 'Test', '/path');
      expect(config.clients.default).toBe('claude');
    });

    it('sets verbose to false', () => {
      const config = defaultConfig('550e8400-e29b-41d4-a716-446655440000', 'Test', '/path');
      expect(config.preferences?.verbose).toBe(false);
    });

    it('sets project fields correctly', () => {
      const config = defaultConfig('550e8400-e29b-41d4-a716-446655440000', 'My Project', '/my/path');
      expect(config.project.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(config.project.name).toBe('My Project');
      expect(config.project.repo_root).toBe('/my/path');
    });
  });
});
