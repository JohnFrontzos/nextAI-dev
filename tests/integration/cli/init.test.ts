import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { scaffoldProject, isProjectInitialized } from '../../../src/core/scaffolding/project';
import {
  createTestProject,
  initNextAIStructure,
  readTestJson,
  type TestContext,
} from '../../helpers/test-utils';
import type { Config } from '../../../src/schemas/config';

describe('Init Command Integration', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('scaffoldProject()', () => {
    it('creates .nextai/ structure', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      expect(fs.existsSync(path.join(testContext.projectRoot, '.nextai'))).toBe(true);
      expect(fs.existsSync(path.join(testContext.projectRoot, '.nextai', 'config.json'))).toBe(true);
      expect(fs.existsSync(path.join(testContext.projectRoot, '.nextai', 'profile.json'))).toBe(true);
      expect(fs.existsSync(path.join(testContext.projectRoot, '.nextai', 'state', 'ledger.json'))).toBe(true);
    });

    it('detects existing client folders', () => {
      // Create .claude folder first
      fs.mkdirSync(path.join(testContext.projectRoot, '.claude'), { recursive: true });

      scaffoldProject(testContext.projectRoot, 'Test Project', 'claude');

      // Should still initialize without errors
      expect(isProjectInitialized(testContext.projectRoot)).toBe(true);
    });

    it('respects --client flag', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project', 'claude');

      const historyPath = path.join(testContext.projectRoot, '.nextai', 'state', 'history.log');
      const content = fs.readFileSync(historyPath, 'utf-8');
      const events = content.trim().split('\n').filter(Boolean).map(JSON.parse);
      const initEvent = events.find((e: { event: string }) => e.event === 'init');

      expect(initEvent?.client).toBe('claude');
    });

    it('is idempotent', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      // Run again
      expect(() => {
        scaffoldProject(testContext.projectRoot, 'Test Project');
      }).not.toThrow();

      expect(isProjectInitialized(testContext.projectRoot)).toBe(true);
    });

    it('logs init event', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      const historyPath = path.join(testContext.projectRoot, '.nextai', 'state', 'history.log');
      const content = fs.readFileSync(historyPath, 'utf-8');
      const events = content.trim().split('\n').filter(Boolean).map(JSON.parse);

      expect(events.some((e: { event: string }) => e.event === 'init')).toBe(true);
    });
  });
});
