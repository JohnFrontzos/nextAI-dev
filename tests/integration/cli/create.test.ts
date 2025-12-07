import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { scaffoldProject } from '../../../src/core/scaffolding/project';
import { addFeature, getFeature } from '../../../src/core/state/ledger';
import { scaffoldFeature, featureFolderExists } from '../../../src/core/scaffolding/feature';
import {
  createTestProject,
  readTestJson,
  type TestContext,
} from '../../helpers/test-utils';
import type { Ledger } from '../../../src/schemas/ledger';

describe('Create Command Integration', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    scaffoldProject(testContext.projectRoot, 'Test Project');
  });

  afterEach(() => {
    testContext.cleanup();
  });

  // Helper to simulate CLI create command (addFeature + scaffoldFeature)
  function createFeature(title: string, type: 'feature' | 'bug' | 'task' = 'feature', externalId?: string) {
    const feature = addFeature(testContext.projectRoot, title, type, externalId);
    scaffoldFeature(testContext.projectRoot, feature.id, title, type);
    return feature;
  }

  describe('Create workflow (addFeature + scaffoldFeature)', () => {
    it('creates feature folder', () => {
      const feature = createFeature('Test Feature', 'feature');

      expect(featureFolderExists(testContext.projectRoot, feature.id)).toBe(true);
    });

    it('adds to ledger', () => {
      const feature = createFeature('Test Feature', 'feature');

      const ledger = readTestJson<Ledger>(testContext.projectRoot, '.nextai/state/ledger.json');
      expect(ledger.features.some((f) => f.id === feature.id)).toBe(true);
    });

    it("sets phase to 'created'", () => {
      const feature = createFeature('Test Feature', 'feature');

      expect(feature.phase).toBe('created');
    });

    it('generates correct ID format', () => {
      const feature = createFeature('My Feature', 'feature');

      // ID should be YYYYMMDD_slug format
      expect(feature.id).toMatch(/^\d{8}_my-feature$/);
    });

    it('respects --type flag', () => {
      const bug = createFeature('Bug Fix', 'bug');
      expect(bug.type).toBe('bug');

      const task = createFeature('Task Item', 'task');
      expect(task.type).toBe('task');
    });

    it('respects --external-id', () => {
      const feature = addFeature(testContext.projectRoot, 'JIRA Feature', 'feature', 'JIRA-123');
      scaffoldFeature(testContext.projectRoot, feature.id, 'JIRA Feature', 'feature');

      expect(feature.external_id).toBe('JIRA-123');
    });

    it('creates initialization.md with title', () => {
      const feature = createFeature('Test Feature', 'feature');

      const initPath = path.join(
        testContext.projectRoot,
        'todo',
        feature.id,
        'planning',
        'initialization.md'
      );
      expect(fs.existsSync(initPath)).toBe(true);

      const content = fs.readFileSync(initPath, 'utf-8');
      expect(content).toContain('Test Feature');
    });
  });

  describe('addFeature() only', () => {
    it('adds to ledger without scaffolding folder', () => {
      const feature = addFeature(testContext.projectRoot, 'Ledger Only', 'feature');

      const ledger = readTestJson<Ledger>(testContext.projectRoot, '.nextai/state/ledger.json');
      expect(ledger.features.some((f) => f.id === feature.id)).toBe(true);

      // Folder should NOT exist since we only called addFeature
      expect(featureFolderExists(testContext.projectRoot, feature.id)).toBe(false);
    });
  });
});
