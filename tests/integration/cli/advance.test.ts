import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scaffoldProject } from '../../../src/core/scaffolding/project';
import { addFeature, getFeature, updateFeaturePhase, blockFeature } from '../../../src/core/state/ledger';
import { createFeatureFixture } from '../../helpers/test-utils';
import {
  createTestProject,
  type TestContext,
} from '../../helpers/test-utils';
import {
  createdPhaseArtifacts,
  productRefinementArtifacts,
  techSpecArtifacts,
  implementationCompleteArtifacts,
  reviewPassArtifacts,
  reviewFailArtifacts,
  testingPassArtifacts,
} from '../../fixtures/artifacts';

describe('Advance Command Integration', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    scaffoldProject(testContext.projectRoot, 'Test Project');
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('Basic Behavior', () => {
    it('advances to next phase', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, createdPhaseArtifacts);

      const result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'product_refinement'
      );

      expect(result.success).toBe(true);
      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.phase).toBe('product_refinement');
    });

    it('runs validation', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      // No artifacts created

      const result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'product_refinement'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('bypasses with --force', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');

      const result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'product_refinement',
        { force: true }
      );

      expect(result.success).toBe(true);
      expect(result.bypassed).toBe(true);
    });

    it('updates updated_at timestamp', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      const originalUpdatedAt = feature.updated_at;
      createFeatureFixture(testContext.projectRoot, feature.id, createdPhaseArtifacts);

      await new Promise((resolve) => setTimeout(resolve, 10));
      await updateFeaturePhase(testContext.projectRoot, feature.id, 'product_refinement');

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.updated_at).not.toBe(originalUpdatedAt);
    });

    it('clears blocked_reason on success', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      blockFeature(testContext.projectRoot, feature.id, 'Some reason');
      createFeatureFixture(testContext.projectRoot, feature.id, createdPhaseArtifacts);

      await updateFeaturePhase(testContext.projectRoot, feature.id, 'product_refinement');

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.blocked_reason).toBeNull();
    });
  });

  describe('Full Phase Progression', () => {
    it('created -> product_refinement', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, createdPhaseArtifacts);

      const result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'product_refinement'
      );

      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('product_refinement');
    });

    it('product_refinement -> tech_spec', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, productRefinementArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature.id, 'product_refinement', {
        force: true,
      });

      const result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'tech_spec');

      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('tech_spec');
    });

    it('tech_spec -> implementation', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, techSpecArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature.id, 'tech_spec', { force: true });

      const result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'implementation'
      );

      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('implementation');
    });

    it('implementation -> review', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, implementationCompleteArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature.id, 'implementation', {
        force: true,
      });

      const result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'review');

      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('review');
    });

    it('review -> testing (PASS)', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, reviewPassArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature.id, 'review', { force: true });

      const result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'testing');

      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('testing');
    });

    it('testing -> complete', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, testingPassArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature.id, 'testing', { force: true });

      const result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'complete');

      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('complete');
    });
  });

  describe('Validation Failures', () => {
    it('blocks advance without init.md', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');

      const result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'product_refinement'
      );

      expect(result.success).toBe(false);
      const unchanged = getFeature(testContext.projectRoot, feature.id);
      expect(unchanged?.phase).toBe('created');
    });

    it('blocks advance without requirements.md', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, createdPhaseArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature.id, 'product_refinement');

      const result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'tech_spec');

      expect(result.success).toBe(false);
    });

    it('blocks advance with incomplete tasks', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, techSpecArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature.id, 'implementation', {
        force: true,
      });

      const result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'review');

      expect(result.success).toBe(false);
    });

    it('blocks advance on review FAIL -> testing', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, reviewFailArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature.id, 'review', { force: true });

      const result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'testing');

      expect(result.success).toBe(false);
      expect(result.errors?.some((e) => e.includes('Review failed'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('cannot advance from complete', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, testingPassArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature.id, 'complete', { force: true });

      // There's no phase after complete
      const result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'created' // Try to go backwards
      );

      expect(result.success).toBe(false);
    });

    it('rejects skipping phases without force', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, createdPhaseArtifacts);

      const result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'implementation' // Skip product_refinement and tech_spec
      );

      expect(result.success).toBe(false);
    });
  });
});
