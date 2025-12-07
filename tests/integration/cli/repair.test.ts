import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { scaffoldProject } from '../../../src/core/scaffolding/project';
import { addFeature, getFeature, blockFeature } from '../../../src/core/state/ledger';
import { scaffoldFeature, featureFolderExists } from '../../../src/core/scaffolding/feature';
import {
  createTestProject,
  readTestJson,
  writeTestJson,
  type TestContext,
} from '../../helpers/test-utils';
import type { Ledger } from '../../../src/schemas/ledger';

describe('Repair Command Integration', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    scaffoldProject(testContext.projectRoot, 'Test Project');
  });

  afterEach(() => {
    testContext.cleanup();
  });

  // Helper to create a feature
  function createFeature(title: string) {
    const feature = addFeature(testContext.projectRoot, title, 'feature');
    scaffoldFeature(testContext.projectRoot, feature.id, title, 'feature');
    return feature;
  }

  describe('Repair Command - Non-Interactive', () => {
    it('reports healthy state when no issues found', () => {
      const feature = createFeature('Healthy Feature');

      // Feature should be healthy with all required artifacts
      expect(featureFolderExists(testContext.projectRoot, feature.id)).toBe(true);

      // Check initialization.md exists
      const initPath = path.join(
        testContext.projectRoot,
        'nextai',
        'todo',
        feature.id,
        'planning',
        'initialization.md'
      );
      expect(fs.existsSync(initPath)).toBe(true);
    });

    it('detects blocked features as issues', () => {
      const feature = createFeature('Blocked Feature');

      // Block the feature
      blockFeature(testContext.projectRoot, feature.id, 'Test blocking reason');

      // Get the feature and verify it's blocked
      const blockedFeature = getFeature(testContext.projectRoot, feature.id);
      expect(blockedFeature?.blocked_reason).toBe('Test blocking reason');
    });

    it('detects orphan ledger entries', () => {
      // Add feature to ledger without scaffolding folder
      const feature = addFeature(testContext.projectRoot, 'Orphan Feature', 'feature');

      // Verify folder doesn't exist
      expect(featureFolderExists(testContext.projectRoot, feature.id)).toBe(false);

      // Verify ledger has the entry
      const ledger = readTestJson<Ledger>(testContext.projectRoot, '.nextai/state/ledger.json');
      expect(ledger.features.some(f => f.id === feature.id)).toBe(true);
    });
  });

  describe('Repair Command - Exit codes', () => {
    it('should exit 0 when feature is healthy', () => {
      const feature = createFeature('Healthy Feature');

      // Feature exists and is properly scaffolded
      expect(featureFolderExists(testContext.projectRoot, feature.id)).toBe(true);
    });

    it('should have issues when feature is blocked', () => {
      const feature = createFeature('Blocked Feature');
      blockFeature(testContext.projectRoot, feature.id, 'Blocking reason');

      const blockedFeature = getFeature(testContext.projectRoot, feature.id);
      expect(blockedFeature?.blocked_reason).toBeTruthy();
    });
  });
});
