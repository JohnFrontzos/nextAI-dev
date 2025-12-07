import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import {
  addFeature,
  getFeature,
  findFeature,
  listFeatures,
  getActiveFeatures,
  updateFeaturePhase,
  blockFeature,
  unblockFeature,
  incrementRetryCount,
  resetRetryCount,
} from '../../../../src/core/state/ledger';
import {
  createTestProject,
  initNextAIStructure,
  createFeatureFixture,
  readTestJson,
  type TestContext,
} from '../../../helpers/test-utils';
import {
  createdPhaseArtifacts,
  productRefinementArtifacts,
  techSpecArtifacts,
  implementationCompleteArtifacts,
} from '../../../fixtures/artifacts';
import type { Ledger } from '../../../../src/schemas/ledger';

describe('Ledger State', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    initNextAIStructure(testContext.projectRoot);
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('addFeature()', () => {
    it('adds feature to empty ledger', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      expect(feature.title).toBe('Test Feature');
      expect(feature.type).toBe('feature');
      expect(feature.phase).toBe('created');
      expect(feature.retry_count).toBe(0);

      const ledger = readTestJson<Ledger>(testContext.projectRoot, '.nextai/state/ledger.json');
      expect(ledger.features).toHaveLength(1);
      expect(ledger.features[0].id).toBe(feature.id);
    });

    it('generates unique ID for same title on same day', () => {
      const feature1 = addFeature(testContext.projectRoot, 'Same Title', 'feature');
      const feature2 = addFeature(testContext.projectRoot, 'Same Title', 'feature');

      expect(feature1.id).not.toBe(feature2.id);
      expect(feature2.id).toBe(`${feature1.id}-1`);
    });

    it('logs feature_created event', () => {
      addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      const historyPath = path.join(testContext.projectRoot, '.nextai', 'state', 'history.log');
      const fs = require('fs');
      const historyContent = fs.readFileSync(historyPath, 'utf-8');
      const events = historyContent.trim().split('\n').filter(Boolean).map(JSON.parse);

      expect(events.some((e: { event: string }) => e.event === 'feature_created')).toBe(true);
    });

    it('sets correct type', () => {
      const bug = addFeature(testContext.projectRoot, 'Fix Bug', 'bug');
      expect(bug.type).toBe('bug');

      const task = addFeature(testContext.projectRoot, 'Task', 'task');
      expect(task.type).toBe('task');
    });

    it('sets external_id when provided', () => {
      const feature = addFeature(testContext.projectRoot, 'JIRA Feature', 'feature', 'JIRA-123');
      expect(feature.external_id).toBe('JIRA-123');
    });
  });

  describe('getFeature()', () => {
    it('returns feature by exact ID', () => {
      const created = addFeature(testContext.projectRoot, 'Test', 'feature');
      const found = getFeature(testContext.projectRoot, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('returns undefined for missing', () => {
      const found = getFeature(testContext.projectRoot, 'nonexistent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('findFeature()', () => {
    it('returns exact match first', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      const found = findFeature(testContext.projectRoot, feature.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(feature.id);
    });

    it('returns partial match', () => {
      addFeature(testContext.projectRoot, 'Unique Feature Name', 'feature');
      const found = findFeature(testContext.projectRoot, 'unique-feature');

      expect(found).toBeDefined();
      expect(found?.title).toBe('Unique Feature Name');
    });

    it('returns undefined for ambiguous', () => {
      addFeature(testContext.projectRoot, 'Test One', 'feature');
      addFeature(testContext.projectRoot, 'Test Two', 'feature');

      const found = findFeature(testContext.projectRoot, 'test');
      expect(found).toBeUndefined();
    });
  });

  describe('listFeatures()', () => {
    beforeEach(() => {
      addFeature(testContext.projectRoot, 'Feature 1', 'feature');
      addFeature(testContext.projectRoot, 'Bug 1', 'bug');
      addFeature(testContext.projectRoot, 'Task 1', 'task');
    });

    it('returns all non-complete by default', () => {
      const features = listFeatures(testContext.projectRoot);
      expect(features).toHaveLength(3);
    });

    it('returns all with includeComplete', async () => {
      // First, manually set one to complete
      const feature = addFeature(testContext.projectRoot, 'Complete One', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, implementationCompleteArtifacts);
      await updateFeaturePhase(testContext.projectRoot, feature.id, 'complete', {
        force: true,
        skipValidation: true,
      });

      const withoutComplete = listFeatures(testContext.projectRoot, {});
      const withComplete = listFeatures(testContext.projectRoot, { includeComplete: true });

      expect(withComplete.length).toBeGreaterThan(withoutComplete.length);
    });

    it('filters by type', () => {
      const bugs = listFeatures(testContext.projectRoot, { type: 'bug' });
      expect(bugs).toHaveLength(1);
      expect(bugs[0].type).toBe('bug');
    });

    it('filters by phase', () => {
      const created = listFeatures(testContext.projectRoot, { phase: 'created' });
      expect(created).toHaveLength(3);

      const review = listFeatures(testContext.projectRoot, { phase: 'review' });
      expect(review).toHaveLength(0);
    });
  });

  describe('getActiveFeatures()', () => {
    it('returns non-complete features', () => {
      addFeature(testContext.projectRoot, 'Active 1', 'feature');
      addFeature(testContext.projectRoot, 'Active 2', 'feature');

      const active = getActiveFeatures(testContext.projectRoot);
      expect(active).toHaveLength(2);
      expect(active.every((f) => f.phase !== 'complete')).toBe(true);
    });
  });

  describe('updateFeaturePhase()', () => {
    it('updates phase when valid transition', async () => {
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

    it('blocks invalid transition', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');

      const result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'implementation'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot transition');
    });

    it('runs validator before transition', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      // No artifacts created

      const result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'product_refinement'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('bypasses validation with force', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      // No artifacts created, but force

      const result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'product_refinement',
        { force: true }
      );

      expect(result.success).toBe(true);
      expect(result.bypassed).toBe(true);
    });

    it('logs validation result', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      createFeatureFixture(testContext.projectRoot, feature.id, createdPhaseArtifacts);

      await updateFeaturePhase(testContext.projectRoot, feature.id, 'product_refinement');

      const fs = require('fs');
      const historyPath = path.join(testContext.projectRoot, '.nextai', 'state', 'history.log');
      const historyContent = fs.readFileSync(historyPath, 'utf-8');
      const events = historyContent.trim().split('\n').filter(Boolean).map(JSON.parse);

      expect(events.some((e: { event: string }) => e.event === 'validation')).toBe(true);
    });

    it('logs validation_bypass when forced', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');

      await updateFeaturePhase(testContext.projectRoot, feature.id, 'product_refinement', {
        force: true,
      });

      const fs = require('fs');
      const historyPath = path.join(testContext.projectRoot, '.nextai', 'state', 'history.log');
      const historyContent = fs.readFileSync(historyPath, 'utf-8');
      const events = historyContent.trim().split('\n').filter(Boolean).map(JSON.parse);

      expect(events.some((e: { event: string }) => e.event === 'validation_bypass')).toBe(true);
    });

    it('updates timestamps', async () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      const originalUpdatedAt = feature.updated_at;
      createFeatureFixture(testContext.projectRoot, feature.id, createdPhaseArtifacts);

      // Wait a tiny bit to ensure timestamp changes
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

  describe('blockFeature()', () => {
    it('sets blocked_reason', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      blockFeature(testContext.projectRoot, feature.id, 'Waiting for approval');

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.blocked_reason).toBe('Waiting for approval');
    });

    it('updates timestamp', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      const originalUpdatedAt = feature.updated_at;

      // Wait a tiny bit
      const start = Date.now();
      while (Date.now() - start < 10);

      blockFeature(testContext.projectRoot, feature.id, 'Reason');

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.updated_at).not.toBe(originalUpdatedAt);
    });

    it('no-op for missing feature', () => {
      // Should not throw
      expect(() => {
        blockFeature(testContext.projectRoot, 'nonexistent', 'Reason');
      }).not.toThrow();
    });
  });

  describe('unblockFeature()', () => {
    it('clears blocked_reason', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      blockFeature(testContext.projectRoot, feature.id, 'Reason');
      unblockFeature(testContext.projectRoot, feature.id);

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.blocked_reason).toBeNull();
    });

    it('updates timestamp', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      blockFeature(testContext.projectRoot, feature.id, 'Reason');

      const blocked = getFeature(testContext.projectRoot, feature.id);
      const blockedUpdatedAt = blocked?.updated_at;

      // Wait a tiny bit
      const start = Date.now();
      while (Date.now() - start < 10);

      unblockFeature(testContext.projectRoot, feature.id);

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.updated_at).not.toBe(blockedUpdatedAt);
    });
  });

  describe('incrementRetryCount()', () => {
    it('increments retry_count', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      expect(feature.retry_count).toBe(0);

      const newCount = incrementRetryCount(testContext.projectRoot, feature.id);
      expect(newCount).toBe(1);

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.retry_count).toBe(1);
    });

    it('returns new count', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      incrementRetryCount(testContext.projectRoot, feature.id);
      incrementRetryCount(testContext.projectRoot, feature.id);

      const count = incrementRetryCount(testContext.projectRoot, feature.id);
      expect(count).toBe(3);
    });

    it('updates timestamp', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      const originalUpdatedAt = feature.updated_at;

      // Wait a tiny bit
      const start = Date.now();
      while (Date.now() - start < 10);

      incrementRetryCount(testContext.projectRoot, feature.id);

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.updated_at).not.toBe(originalUpdatedAt);
    });

    it('returns 0 for missing', () => {
      const count = incrementRetryCount(testContext.projectRoot, 'nonexistent');
      expect(count).toBe(0);
    });
  });

  describe('resetRetryCount()', () => {
    it('sets retry_count to 0', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      incrementRetryCount(testContext.projectRoot, feature.id);
      incrementRetryCount(testContext.projectRoot, feature.id);
      incrementRetryCount(testContext.projectRoot, feature.id);

      resetRetryCount(testContext.projectRoot, feature.id);

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.retry_count).toBe(0);
    });

    it('updates timestamp', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      incrementRetryCount(testContext.projectRoot, feature.id);

      const incremented = getFeature(testContext.projectRoot, feature.id);
      const incrementedUpdatedAt = incremented?.updated_at;

      // Wait a tiny bit
      const start = Date.now();
      while (Date.now() - start < 10);

      resetRetryCount(testContext.projectRoot, feature.id);

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.updated_at).not.toBe(incrementedUpdatedAt);
    });
  });
});
