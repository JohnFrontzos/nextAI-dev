import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { onPhaseTransition, onFeatureComplete } from '../../../../src/core/metrics/metrics-collector';
import {
  createTestProject,
  initNextAIStructure,
  type TestContext,
} from '../../../helpers/test-utils';
import { addFeature, updateLedgerPhase } from '../../../../src/core/state/ledger';
import { appendHistory } from '../../../../src/cli/utils/config';
import { existsSync } from 'fs';

describe('Metrics Collector', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    initNextAIStructure(testContext.projectRoot);
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('onPhaseTransition()', () => {
    it('updates feature metrics after phase transition', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');

      onPhaseTransition(testContext.projectRoot, feature.id);

      const metricsPath = join(
        testContext.projectRoot,
        '.nextai',
        'metrics',
        'features',
        `${feature.id}.json`
      );

      expect(existsSync(metricsPath)).toBe(true);
    });

    it('handles errors gracefully without throwing', () => {
      // Should not throw even for non-existent feature
      expect(() => {
        onPhaseTransition(testContext.projectRoot, 'nonexistent');
      }).not.toThrow();
    });
  });

  describe('onFeatureComplete()', () => {
    it('updates feature metrics and aggregates when feature completes', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      // Complete the feature
      updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'tech_spec');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'implementation');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'review');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'testing');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'complete');

      appendHistory(testContext.projectRoot, {
        event: 'feature_completed',
        feature_id: feature.id,
      });

      onFeatureComplete(testContext.projectRoot, feature.id);

      // Check feature metrics
      const featureMetricsPath = join(
        testContext.projectRoot,
        '.nextai',
        'metrics',
        'features',
        `${feature.id}.json`
      );

      expect(existsSync(featureMetricsPath)).toBe(true);

      // Check aggregated metrics
      const aggregatedPath = join(
        testContext.projectRoot,
        '.nextai',
        'metrics',
        'aggregated.json'
      );

      expect(existsSync(aggregatedPath)).toBe(true);
    });

    it('handles errors gracefully without throwing', () => {
      // Should not throw even for non-existent feature
      expect(() => {
        onFeatureComplete(testContext.projectRoot, 'nonexistent');
      }).not.toThrow();
    });
  });
});
