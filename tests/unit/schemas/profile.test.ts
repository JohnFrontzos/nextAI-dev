import { describe, it, expect } from 'vitest';
import { ProfileSchema, createProfile } from '../../../src/schemas/profile';

describe('Profile Schema', () => {
  describe('ProfileSchema.parse', () => {
    const validProfile = {
      project_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Project',
      repo_root: '/path/to/project',
      created_at: '2025-12-06T10:00:00.000Z',
      last_initialized_at: '2025-12-06T10:00:00.000Z',
    };

    it('accepts valid profile', () => {
      expect(() => ProfileSchema.parse(validProfile)).not.toThrow();
    });

    it('requires project_id as UUID', () => {
      const invalidUUID = { ...validProfile, project_id: 'not-a-uuid' };
      expect(() => ProfileSchema.parse(invalidUUID)).toThrow();
    });

    it('requires timestamps', () => {
      const missingCreatedAt = { ...validProfile };
      delete (missingCreatedAt as Record<string, unknown>).created_at;
      expect(() => ProfileSchema.parse(missingCreatedAt)).toThrow();

      const missingLastInit = { ...validProfile };
      delete (missingLastInit as Record<string, unknown>).last_initialized_at;
      expect(() => ProfileSchema.parse(missingLastInit)).toThrow();
    });

    it('requires valid datetime format for timestamps', () => {
      const invalidCreatedAt = { ...validProfile, created_at: 'invalid-date' };
      expect(() => ProfileSchema.parse(invalidCreatedAt)).toThrow();

      const invalidLastInit = { ...validProfile, last_initialized_at: '2025-12-06' };
      expect(() => ProfileSchema.parse(invalidLastInit)).toThrow();
    });

    it('allows optional languages', () => {
      const withoutLanguages = { ...validProfile };
      expect(() => ProfileSchema.parse(withoutLanguages)).not.toThrow();

      const withLanguages = {
        ...validProfile,
        languages: [
          { name: 'TypeScript', detected_from: ['package.json'] },
          { name: 'Python', detected_from: ['requirements.txt'] },
        ],
      };
      expect(() => ProfileSchema.parse(withLanguages)).not.toThrow();
    });

    it('requires name field', () => {
      const missingName = { ...validProfile };
      delete (missingName as Record<string, unknown>).name;
      expect(() => ProfileSchema.parse(missingName)).toThrow();
    });

    it('requires repo_root field', () => {
      const missingRepoRoot = { ...validProfile };
      delete (missingRepoRoot as Record<string, unknown>).repo_root;
      expect(() => ProfileSchema.parse(missingRepoRoot)).toThrow();
    });
  });

  describe('createProfile', () => {
    it('returns valid Profile', () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const profile = createProfile(projectId, 'My Project', '/path');

      expect(() => ProfileSchema.parse(profile)).not.toThrow();
    });

    it('sets project fields correctly', () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const profile = createProfile(projectId, 'My Project', '/my/path');

      expect(profile.project_id).toBe(projectId);
      expect(profile.name).toBe('My Project');
      expect(profile.repo_root).toBe('/my/path');
    });

    it('sets timestamps', () => {
      const before = new Date().toISOString();
      const profile = createProfile('550e8400-e29b-41d4-a716-446655440000', 'Test', '/path');
      const after = new Date().toISOString();

      expect(profile.created_at).toBeDefined();
      expect(profile.last_initialized_at).toBeDefined();
      expect(profile.created_at >= before).toBe(true);
      expect(profile.created_at <= after).toBe(true);
      expect(profile.created_at).toBe(profile.last_initialized_at);
    });

    it('accepts optional languages', () => {
      const languages = [
        { name: 'TypeScript', detected_from: ['package.json'] },
      ];
      const profile = createProfile(
        '550e8400-e29b-41d4-a716-446655440000',
        'Test',
        '/path',
        languages
      );

      expect(profile.languages).toEqual(languages);
    });

    it('handles undefined languages', () => {
      const profile = createProfile('550e8400-e29b-41d4-a716-446655440000', 'Test', '/path');
      expect(profile.languages).toBeUndefined();
    });
  });
});
