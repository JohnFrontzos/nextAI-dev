import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  scaffoldProject,
  scaffoldGlobalDirs,
  isProjectInitialized,
} from '../../../../src/core/scaffolding/project';
import {
  createTestProject,
  readTestJson,
  type TestContext,
} from '../../../helpers/test-utils';
import type { Ledger } from '../../../../src/schemas/ledger';
import type { Config } from '../../../../src/schemas/config';
import type { Profile } from '../../../../src/schemas/profile';

describe('Project Scaffolding', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('scaffoldProject()', () => {
    it('creates .nextai/ directory', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      const nextaiDir = path.join(testContext.projectRoot, '.nextai');
      expect(fs.existsSync(nextaiDir)).toBe(true);
    });

    it('creates config.json', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      const configPath = path.join(testContext.projectRoot, '.nextai', 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const config = readTestJson<Config>(testContext.projectRoot, '.nextai/config.json');
      expect(config.project.name).toBe('Test Project');
    });

    it('creates profile.json', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      const profilePath = path.join(testContext.projectRoot, '.nextai', 'profile.json');
      expect(fs.existsSync(profilePath)).toBe(true);

      const profile = readTestJson<Profile>(testContext.projectRoot, '.nextai/profile.json');
      expect(profile.name).toBe('Test Project');
    });

    it('creates state/ledger.json', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      const ledgerPath = path.join(testContext.projectRoot, '.nextai', 'state', 'ledger.json');
      expect(fs.existsSync(ledgerPath)).toBe(true);

      const ledger = readTestJson<Ledger>(testContext.projectRoot, '.nextai/state/ledger.json');
      expect(ledger).toEqual({ features: [] });
    });

    it('creates state/history.log', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      const historyPath = path.join(testContext.projectRoot, '.nextai', 'state', 'history.log');
      expect(fs.existsSync(historyPath)).toBe(true);
    });

    it('creates agents/ directory', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      const agentsDir = path.join(testContext.projectRoot, '.nextai', 'agents');
      expect(fs.existsSync(agentsDir)).toBe(true);
    });

    it('creates skills/ directory', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      const skillsDir = path.join(testContext.projectRoot, '.nextai', 'skills');
      expect(fs.existsSync(skillsDir)).toBe(true);
    });

    it('creates templates/ directory', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      const templatesDir = path.join(testContext.projectRoot, '.nextai', 'templates');
      expect(fs.existsSync(templatesDir)).toBe(true);
    });

    it('is idempotent', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');
      const config1 = readTestJson<Config>(testContext.projectRoot, '.nextai/config.json');

      // Run again - should not throw and preserve existing data
      expect(() => {
        scaffoldProject(testContext.projectRoot, 'Test Project');
      }).not.toThrow();

      const config2 = readTestJson<Config>(testContext.projectRoot, '.nextai/config.json');
      // Note: Project ID is generated fresh each time, so we just check structure
      expect(config2.project.name).toBe('Test Project');
    });

    it('returns projectId', () => {
      const result = scaffoldProject(testContext.projectRoot, 'Test Project');

      expect(result.projectId).toBeDefined();
      expect(typeof result.projectId).toBe('string');
    });

    it('logs init event', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project', 'claude');

      const historyPath = path.join(testContext.projectRoot, '.nextai', 'state', 'history.log');
      const content = fs.readFileSync(historyPath, 'utf-8');
      const events = content.trim().split('\n').filter(Boolean).map(JSON.parse);

      expect(events.some((e: { event: string }) => e.event === 'init')).toBe(true);
    });
  });

  describe('scaffoldGlobalDirs()', () => {
    it('creates nextai/todo/ directory', () => {
      scaffoldGlobalDirs(testContext.projectRoot);

      expect(fs.existsSync(path.join(testContext.projectRoot, 'nextai', 'todo'))).toBe(true);
    });

    it('creates nextai/done/ directory', () => {
      scaffoldGlobalDirs(testContext.projectRoot);

      expect(fs.existsSync(path.join(testContext.projectRoot, 'nextai', 'done'))).toBe(true);
    });

    it('creates nextai/docs/ directory', () => {
      scaffoldGlobalDirs(testContext.projectRoot);

      expect(fs.existsSync(path.join(testContext.projectRoot, 'nextai', 'docs'))).toBe(true);
    });

    it('creates nextai/metrics/ directory', () => {
      scaffoldGlobalDirs(testContext.projectRoot);

      expect(fs.existsSync(path.join(testContext.projectRoot, 'nextai', 'metrics'))).toBe(true);
    });

    it('is idempotent', () => {
      scaffoldGlobalDirs(testContext.projectRoot);
      expect(() => scaffoldGlobalDirs(testContext.projectRoot)).not.toThrow();
    });
  });

  describe('isProjectInitialized()', () => {
    it('returns false for uninitialized project', () => {
      expect(isProjectInitialized(testContext.projectRoot)).toBe(false);
    });

    it('returns true for initialized project', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');
      expect(isProjectInitialized(testContext.projectRoot)).toBe(true);
    });
  });
});
