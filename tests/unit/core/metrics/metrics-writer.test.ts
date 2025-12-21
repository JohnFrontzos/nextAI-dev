import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import {
  calculateFeatureMetrics,
  updateFeatureMetrics,
  calculateAggregatedMetrics,
  updateAggregates,
} from '../../../../src/core/metrics/metrics-writer';
import {
  createTestProject,
  initNextAIStructure,
  readTestJson,
  type TestContext,
} from '../../../helpers/test-utils';
import { addFeature, updateLedgerPhase } from '../../../../src/core/state/ledger';
import { appendHistory } from '../../../../src/cli/utils/config';
import type { FeatureMetrics, AggregatedMetrics } from '../../../../src/schemas/metrics';
import { existsSync } from 'fs';

describe('Metrics Writer', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    initNextAIStructure(testContext.projectRoot);
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('calculateFeatureMetrics()', () => {
    it('returns null for non-existent feature', () => {
      const metrics = calculateFeatureMetrics(testContext.projectRoot, 'nonexistent');
      expect(metrics).toBeNull();
    });

    it('calculates metrics for simple feature lifecycle', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      // Transition through phases
      updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'tech_spec');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'implementation');

      const metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);

      expect(metrics).toBeDefined();
      expect(metrics?.feature_id).toBe(feature.id);
      expect(metrics?.title).toBe('Test Feature');
      expect(metrics?.type).toBe('feature');
      expect(metrics?.phases.created).toBeDefined();
      expect(metrics?.phases.product_refinement).toBeDefined();
      expect(metrics?.phases.tech_spec).toBeDefined();
    });

    it('calculates phase durations', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      // Wait a tiny bit and transition
      updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');

      const metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);

      expect(metrics?.phases.created?.duration_ms).toBeDefined();
      expect(metrics?.phases.created?.duration_ms).toBeGreaterThan(0);
      expect(metrics?.phases.created?.entered_at).toBeDefined();
      expect(metrics?.phases.created?.exited_at).toBeDefined();
    });

    it('tracks review iterations when transitioning back to implementation', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      // Go through normal flow
      updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'tech_spec');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'implementation');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'review');

      // Transition back to implementation (review iteration)
      updateLedgerPhase(testContext.projectRoot, feature.id, 'implementation');

      const metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);

      expect(metrics?.phases.review?.iterations).toBe(2);
    });

    it('tracks validation counts', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      // Log some validation events
      appendHistory(testContext.projectRoot, {
        event: 'validation',
        feature_id: feature.id,
        target_phase: 'product_refinement',
        result: 'passed',
      });

      appendHistory(testContext.projectRoot, {
        event: 'validation',
        feature_id: feature.id,
        target_phase: 'tech_spec',
        result: 'failed',
      });

      appendHistory(testContext.projectRoot, {
        event: 'validation_bypass',
        feature_id: feature.id,
        target_phase: 'tech_spec',
        errors_ignored: ['error1'],
        bypass_method: '--force',
      });

      const metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);

      expect(metrics?.validations.passed).toBe(1);
      expect(metrics?.validations.failed).toBe(1);
      expect(metrics?.validations.bypassed).toBe(1);
    });

    it('calculates total duration for completed features', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      // Complete the feature
      updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'tech_spec');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'implementation');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'review');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'testing');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'complete');

      // Log completion event
      appendHistory(testContext.projectRoot, {
        event: 'feature_completed',
        feature_id: feature.id,
      });

      const metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);

      expect(metrics?.completed_at).toBeDefined();
      expect(metrics?.total_duration_ms).toBeDefined();
      expect(metrics?.total_duration_ms).toBeGreaterThan(0);
    });

    it('calculates implementation-to-complete duration', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      // Complete the feature
      updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'tech_spec');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'implementation');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'review');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'testing');
      updateLedgerPhase(testContext.projectRoot, feature.id, 'complete');

      // Log completion event
      appendHistory(testContext.projectRoot, {
        event: 'feature_completed',
        feature_id: feature.id,
      });

      const metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);

      expect(metrics?.implementation_to_complete_ms).toBeDefined();
      expect(metrics?.implementation_to_complete_ms).toBeGreaterThan(0);
    });

    it('handles missing phase transitions gracefully', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      // Only transition once
      updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');

      const metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);

      expect(metrics).toBeDefined();
      expect(metrics?.phases.created).toBeDefined();
      expect(metrics?.phases.product_refinement).toBeUndefined(); // Not exited yet
      expect(metrics?.completed_at).toBeUndefined();
      expect(metrics?.total_duration_ms).toBeUndefined();
    });
  });

  describe('updateFeatureMetrics()', () => {
    it('writes metrics to JSON file', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');

      updateFeatureMetrics(testContext.projectRoot, feature.id);

      const metricsPath = join(
        testContext.projectRoot,
        '.nextai',
        'metrics',
        'features',
        `${feature.id}.json`
      );

      expect(existsSync(metricsPath)).toBe(true);

      const metrics = readTestJson<FeatureMetrics>(
        testContext.projectRoot,
        `.nextai/metrics/features/${feature.id}.json`
      );

      expect(metrics.feature_id).toBe(feature.id);
      expect(metrics.title).toBe('Test Feature');
    });

    it('updates metrics index', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      updateFeatureMetrics(testContext.projectRoot, feature.id);

      const indexPath = join(testContext.projectRoot, '.nextai', 'metrics', 'index.json');

      expect(existsSync(indexPath)).toBe(true);

      const index = readTestJson<any>(testContext.projectRoot, '.nextai/metrics/index.json');

      expect(index.feature_count).toBe(1);
      expect(index.completed_count).toBe(0);
    });

    it('handles non-existent feature gracefully', () => {
      // Should not throw
      expect(() => {
        updateFeatureMetrics(testContext.projectRoot, 'nonexistent');
      }).not.toThrow();
    });
  });

  describe('calculateAggregatedMetrics()', () => {
    it('calculates totals for done and todo features', () => {
      const feature1 = addFeature(testContext.projectRoot, 'Feature 1', 'feature');
      const feature2 = addFeature(testContext.projectRoot, 'Feature 2', 'feature');
      const bug = addFeature(testContext.projectRoot, 'Bug 1', 'bug');

      // Complete feature1
      updateLedgerPhase(testContext.projectRoot, feature1.id, 'product_refinement');
      updateLedgerPhase(testContext.projectRoot, feature1.id, 'tech_spec');
      updateLedgerPhase(testContext.projectRoot, feature1.id, 'implementation');
      updateLedgerPhase(testContext.projectRoot, feature1.id, 'review');
      updateLedgerPhase(testContext.projectRoot, feature1.id, 'testing');
      updateLedgerPhase(testContext.projectRoot, feature1.id, 'complete');

      appendHistory(testContext.projectRoot, {
        event: 'feature_completed',
        feature_id: feature1.id,
      });

      const aggregated = calculateAggregatedMetrics(testContext.projectRoot);

      expect(aggregated.totals.done).toBe(1);
      expect(aggregated.totals.todo).toBe(2);
      expect(aggregated.totals.by_type.feature.done).toBe(1);
      expect(aggregated.totals.by_type.feature.todo).toBe(1);
      expect(aggregated.totals.by_type.bug.todo).toBe(1);
    });

    it('calculates averages for completed features only', () => {
      const feature1 = addFeature(testContext.projectRoot, 'Feature 1', 'feature');
      const feature2 = addFeature(testContext.projectRoot, 'Feature 2', 'feature');

      // Complete both features
      for (const feature of [feature1, feature2]) {
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
      }

      const aggregated = calculateAggregatedMetrics(testContext.projectRoot);

      expect(aggregated.averages.total_duration_ms).toBeDefined();
      expect(aggregated.averages.implementation_to_complete_ms).toBeDefined();
      expect(aggregated.phase_averages.product_refinement_ms).toBeDefined();
    });

    it('returns empty averages when no features completed', () => {
      addFeature(testContext.projectRoot, 'Feature 1', 'feature');

      const aggregated = calculateAggregatedMetrics(testContext.projectRoot);

      expect(aggregated.totals.done).toBe(0);
      expect(aggregated.totals.todo).toBe(1);
      expect(aggregated.averages.total_duration_ms).toBeUndefined();
    });
  });

  describe('updateAggregates()', () => {
    it('writes aggregated metrics to JSON file', () => {
      const feature = addFeature(testContext.projectRoot, 'Test Feature', 'feature');

      updateAggregates(testContext.projectRoot);

      const aggregatedPath = join(
        testContext.projectRoot,
        '.nextai',
        'metrics',
        'aggregated.json'
      );

      expect(existsSync(aggregatedPath)).toBe(true);

      const aggregated = readTestJson<AggregatedMetrics>(
        testContext.projectRoot,
        '.nextai/metrics/aggregated.json'
      );

      expect(aggregated.totals).toBeDefined();
      expect(aggregated.updated_at).toBeDefined();
    });
  });
});
