import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { copyResourcesToNextAI, getResourceManifest } from '../../../../src/core/sync/resources';
import { scaffoldProject } from '../../../../src/core/scaffolding/project';
import {
  createTestProject,
  type TestContext,
} from '../../../helpers/test-utils';

describe('Resources Sync Unit Tests', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('getResourceManifest', () => {
    it('should return manifest with testing-investigator skill', () => {
      const manifest = getResourceManifest();

      expect(manifest.skills).toContain('testing-investigator');
    });

    it('should return all expected agents', () => {
      const manifest = getResourceManifest();

      expect(manifest.agents).toContain('developer.md');
      expect(manifest.agents).toContain('reviewer.md');
      expect(manifest.agents).toContain('investigator.md');
    });

    it('should return all expected commands', () => {
      const manifest = getResourceManifest();

      expect(manifest.commands).toContain('create.md');
      expect(manifest.commands).toContain('implement.md');
      expect(manifest.commands).toContain('sync.md');
    });
  });

  describe('copyResourcesToNextAI', () => {
    beforeEach(() => {
      scaffoldProject(testContext.projectRoot, 'Test Project');
    });

    it('should copy all resources successfully', () => {
      const result = copyResourcesToNextAI(testContext.projectRoot);

      expect(result.agents).toBeGreaterThan(0);
      expect(result.skills).toBeGreaterThan(0);
      expect(result.commands).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should restore missing skills', () => {
      // Remove a skill to simulate it being missing
      const skillPath = path.join(
        testContext.projectRoot,
        '.nextai',
        'skills',
        'testing-investigator',
        'SKILL.md'
      );

      if (fs.existsSync(skillPath)) {
        fs.unlinkSync(skillPath);
      }

      // Verify it's deleted
      expect(fs.existsSync(skillPath)).toBe(false);

      // Copy resources should restore it
      const result = copyResourcesToNextAI(testContext.projectRoot);

      expect(fs.existsSync(skillPath)).toBe(true);
      expect(result.skills).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should restore missing agents', () => {
      // Remove an agent to simulate it being missing
      const agentPath = path.join(
        testContext.projectRoot,
        '.nextai',
        'agents',
        'developer.md'
      );

      if (fs.existsSync(agentPath)) {
        fs.unlinkSync(agentPath);
      }

      // Verify it's deleted
      expect(fs.existsSync(agentPath)).toBe(false);

      // Copy resources should restore it
      const result = copyResourcesToNextAI(testContext.projectRoot);

      expect(fs.existsSync(agentPath)).toBe(true);
      expect(result.agents).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should restore missing commands', () => {
      // Remove a command to simulate it being missing
      const commandPath = path.join(
        testContext.projectRoot,
        '.nextai',
        'templates',
        'commands',
        'implement.md'
      );

      if (fs.existsSync(commandPath)) {
        fs.unlinkSync(commandPath);
      }

      // Verify it's deleted
      expect(fs.existsSync(commandPath)).toBe(false);

      // Copy resources should restore it
      const result = copyResourcesToNextAI(testContext.projectRoot);

      expect(fs.existsSync(commandPath)).toBe(true);
      expect(result.commands).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple missing resources', () => {
      // Remove multiple resources
      const skillPath = path.join(
        testContext.projectRoot,
        '.nextai',
        'skills',
        'testing-investigator',
        'SKILL.md'
      );
      const agentPath = path.join(
        testContext.projectRoot,
        '.nextai',
        'agents',
        'reviewer.md'
      );

      if (fs.existsSync(skillPath)) {
        fs.unlinkSync(skillPath);
      }
      if (fs.existsSync(agentPath)) {
        fs.unlinkSync(agentPath);
      }

      // Copy resources should restore both
      const result = copyResourcesToNextAI(testContext.projectRoot);

      expect(fs.existsSync(skillPath)).toBe(true);
      expect(fs.existsSync(agentPath)).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should be idempotent', () => {
      const result1 = copyResourcesToNextAI(testContext.projectRoot);
      const result2 = copyResourcesToNextAI(testContext.projectRoot);

      // Both should succeed with same counts
      expect(result1.agents).toBe(result2.agents);
      expect(result1.skills).toBe(result2.skills);
      expect(result1.commands).toBe(result2.commands);
      expect(result2.errors).toHaveLength(0);
    });
  });
});
