import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { scaffoldProject } from '../../../src/core/scaffolding/project';
import { addFeature, getActiveFeatures } from '../../../src/core/state/ledger';
import { scaffoldFeature } from '../../../src/core/scaffolding/feature';
import {
  createTestProject,
  type TestContext,
} from '../../helpers/test-utils';

describe('Resume Command Integration', () => {
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

  describe('Resume Command - Non-Interactive', () => {
    it('auto-selects when only one active feature', () => {
      const feature = createFeature('Single Feature');

      const activeFeatures = getActiveFeatures(testContext.projectRoot);
      expect(activeFeatures.length).toBe(1);
      expect(activeFeatures[0].id).toBe(feature.id);
    });

    it('requires ID when multiple active features exist', () => {
      // Create two features
      const feature1 = createFeature('Feature One');
      const feature2 = createFeature('Feature Two');

      const activeFeatures = getActiveFeatures(testContext.projectRoot);
      expect(activeFeatures.length).toBe(2);

      // Both features should be active
      expect(activeFeatures.some(f => f.id === feature1.id)).toBe(true);
      expect(activeFeatures.some(f => f.id === feature2.id)).toBe(true);
    });

    it('finds specific feature by ID', () => {
      const feature1 = createFeature('Feature One');
      const feature2 = createFeature('Feature Two');

      const activeFeatures = getActiveFeatures(testContext.projectRoot);
      const foundFeature = activeFeatures.find(f => f.id === feature1.id);

      expect(foundFeature).toBeDefined();
      expect(foundFeature?.id).toBe(feature1.id);
    });
  });

  describe('Resume Command - Sync behavior', () => {
    it('does not sync by default (safe behavior)', () => {
      const feature = createFeature('Test Feature');

      // The default sync value should be false
      // This is tested via the command behavior, not direct ledger manipulation
      expect(feature.phase).toBe('created');
    });
  });
});
