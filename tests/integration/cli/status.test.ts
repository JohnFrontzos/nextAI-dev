import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { scaffoldProject } from '../../../src/core/scaffolding/project';
import {
  addFeature,
  getFeature,
  blockFeature,
  unblockFeature,
  incrementRetryCount,
  resetRetryCount,
} from '../../../src/core/state/ledger';
import { readHistory } from '../../../src/core/state/history';
import {
  createTestProject,
  type TestContext,
} from '../../helpers/test-utils';

describe('Status Command Integration', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    scaffoldProject(testContext.projectRoot, 'Test Project');
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('Block/Unblock', () => {
    it('blocks feature with --block', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      blockFeature(testContext.projectRoot, feature.id, 'Waiting for approval');

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.blocked_reason).toBe('Waiting for approval');
    });

    it('unblocks feature with --unblock', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      blockFeature(testContext.projectRoot, feature.id, 'Reason');
      unblockFeature(testContext.projectRoot, feature.id);

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.blocked_reason).toBeNull();
    });
  });

  describe('Retry Count', () => {
    it('increments retry with --retry-increment', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      expect(feature.retry_count).toBe(0);

      const newCount = incrementRetryCount(testContext.projectRoot, feature.id);
      expect(newCount).toBe(1);

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.retry_count).toBe(1);
    });

    it('resets retry with --retry-reset', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      incrementRetryCount(testContext.projectRoot, feature.id);
      incrementRetryCount(testContext.projectRoot, feature.id);
      incrementRetryCount(testContext.projectRoot, feature.id);

      resetRetryCount(testContext.projectRoot, feature.id);

      const updated = getFeature(testContext.projectRoot, feature.id);
      expect(updated?.retry_count).toBe(0);
    });
  });

  describe('Feature Status', () => {
    it('shows feature status', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');

      const fetched = getFeature(testContext.projectRoot, feature.id);
      expect(fetched).toBeDefined();
      expect(fetched?.phase).toBe('created');
      expect(fetched?.blocked_reason).toBeNull();
      expect(fetched?.retry_count).toBe(0);
    });

    it('shows blocked_reason if set', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      blockFeature(testContext.projectRoot, feature.id, 'Blocked for testing');

      const fetched = getFeature(testContext.projectRoot, feature.id);
      expect(fetched?.blocked_reason).toBe('Blocked for testing');
    });

    it('shows retry_count if > 0', () => {
      const feature = addFeature(testContext.projectRoot, 'Test', 'feature');
      incrementRetryCount(testContext.projectRoot, feature.id);
      incrementRetryCount(testContext.projectRoot, feature.id);

      const fetched = getFeature(testContext.projectRoot, feature.id);
      expect(fetched?.retry_count).toBe(2);
    });
  });
});
