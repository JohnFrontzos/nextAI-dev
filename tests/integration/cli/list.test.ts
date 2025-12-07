import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scaffoldProject } from '../../../src/core/scaffolding/project';
import { addFeature, listFeatures, updateFeaturePhase } from '../../../src/core/state/ledger';
import { createFeatureFixture } from '../../helpers/test-utils';
import {
  createTestProject,
  type TestContext,
} from '../../helpers/test-utils';
import { implementationCompleteArtifacts } from '../../fixtures/artifacts';

describe('List Command Integration', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    scaffoldProject(testContext.projectRoot, 'Test Project');
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('listFeatures()', () => {
    it('lists active features', () => {
      addFeature(testContext.projectRoot, 'Feature 1', 'feature');
      addFeature(testContext.projectRoot, 'Feature 2', 'feature');

      const features = listFeatures(testContext.projectRoot);
      expect(features).toHaveLength(2);
    });

    it('hides complete by default', async () => {
      const feature1 = addFeature(testContext.projectRoot, 'Active', 'feature');
      const feature2 = addFeature(testContext.projectRoot, 'Complete', 'feature');

      createFeatureFixture(testContext.projectRoot, feature2.id, implementationCompleteArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature2.id, 'complete', {
        force: true,
        skipValidation: true,
      });

      const features = listFeatures(testContext.projectRoot);
      expect(features).toHaveLength(1);
      expect(features[0].id).toBe(feature1.id);
    });

    it('shows complete with --all', async () => {
      addFeature(testContext.projectRoot, 'Active', 'feature');
      const feature2 = addFeature(testContext.projectRoot, 'Complete', 'feature');

      createFeatureFixture(testContext.projectRoot, feature2.id, implementationCompleteArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature2.id, 'complete', {
        force: true,
        skipValidation: true,
      });

      const features = listFeatures(testContext.projectRoot, { includeComplete: true });
      expect(features).toHaveLength(2);
    });

    it('filters by --type', () => {
      addFeature(testContext.projectRoot, 'Feature', 'feature');
      addFeature(testContext.projectRoot, 'Bug', 'bug');
      addFeature(testContext.projectRoot, 'Task', 'task');

      const bugs = listFeatures(testContext.projectRoot, { type: 'bug' });
      expect(bugs).toHaveLength(1);
      expect(bugs[0].type).toBe('bug');
    });

    it('filters by --phase', async () => {
      const f1 = addFeature(testContext.projectRoot, 'Created', 'feature');
      const f2 = addFeature(testContext.projectRoot, 'In Progress', 'feature');

      createFeatureFixture(testContext.projectRoot, f2.id, {
        'planning/initialization.md': '# Feature\n\nDescription',
      });
      await updateFeaturePhase(testContext.projectRoot, f2.id, 'product_refinement');

      const created = listFeatures(testContext.projectRoot, { phase: 'created' });
      expect(created).toHaveLength(1);

      const refinement = listFeatures(testContext.projectRoot, { phase: 'product_refinement' });
      expect(refinement).toHaveLength(1);
    });

    it('shows empty message for no features', () => {
      const features = listFeatures(testContext.projectRoot);
      expect(features).toHaveLength(0);
    });
  });
});
