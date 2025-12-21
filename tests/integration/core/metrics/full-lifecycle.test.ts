import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import {
  createTestProject,
  initNextAIStructure,
  readTestJson,
  type TestContext,
} from '../../../helpers/test-utils';
import { addFeature, updateLedgerPhase } from '../../../../src/core/state/ledger';
import { appendHistory } from '../../../../src/cli/utils/config';
import { calculateFeatureMetrics, updateAggregates } from '../../../../src/core/metrics/metrics-writer';
import type { FeatureMetrics, AggregatedMetrics } from '../../../../src/schemas/metrics';
import { existsSync } from 'fs';

describe('Metrics Full Lifecycle Integration', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    initNextAIStructure(testContext.projectRoot);
  });

  afterEach(() => {
    testContext.cleanup();
  });

  it('captures metrics at each phase of feature lifecycle', () => {
    const feature = addFeature(testContext.projectRoot, 'Full Lifecycle Feature', 'feature');

    // Verify created phase
    let metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);
    expect(metrics?.phases.created).toBeDefined();
    expect(metrics?.phases.created?.entered_at).toBeDefined();

    // Transition to product_refinement
    updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');
    metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);
    expect(metrics?.phases.created?.exited_at).toBeDefined();
    expect(metrics?.phases.created?.duration_ms).toBeGreaterThan(0);

    // Transition to tech_spec
    updateLedgerPhase(testContext.projectRoot, feature.id, 'tech_spec');
    metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);
    expect(metrics?.phases.product_refinement?.duration_ms).toBeGreaterThan(0);

    // Transition to implementation
    updateLedgerPhase(testContext.projectRoot, feature.id, 'implementation');
    metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);
    expect(metrics?.phases.tech_spec?.duration_ms).toBeGreaterThan(0);

    // Transition to review
    updateLedgerPhase(testContext.projectRoot, feature.id, 'review');
    metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);
    expect(metrics?.phases.implementation?.duration_ms).toBeGreaterThan(0);

    // Transition to testing
    updateLedgerPhase(testContext.projectRoot, feature.id, 'testing');
    metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);
    expect(metrics?.phases.review?.duration_ms).toBeGreaterThan(0);

    // Complete the feature
    updateLedgerPhase(testContext.projectRoot, feature.id, 'complete');
    appendHistory(testContext.projectRoot, {
      event: 'feature_completed',
      feature_id: feature.id,
    });

    metrics = calculateFeatureMetrics(testContext.projectRoot, feature.id);
    expect(metrics?.phases.testing?.duration_ms).toBeGreaterThan(0);
    expect(metrics?.completed_at).toBeDefined();
    expect(metrics?.total_duration_ms).toBeGreaterThan(0);
    expect(metrics?.implementation_to_complete_ms).toBeGreaterThan(0);
  });

  it('persists metrics correctly to disk', () => {
    const feature = addFeature(testContext.projectRoot, 'Persistence Test', 'feature');

    updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');
    updateLedgerPhase(testContext.projectRoot, feature.id, 'tech_spec');
    updateLedgerPhase(testContext.projectRoot, feature.id, 'implementation');
    updateLedgerPhase(testContext.projectRoot, feature.id, 'review');
    updateLedgerPhase(testContext.projectRoot, feature.id, 'testing');
    updateLedgerPhase(testContext.projectRoot, feature.id, 'complete');

    // Metrics are automatically written by onFeatureComplete during updateLedgerPhase
    // Check that the file exists
    const metricsPath = join(
      testContext.projectRoot,
      '.nextai',
      'metrics',
      'features',
      `${feature.id}.json`
    );

    expect(existsSync(metricsPath)).toBe(true);

    const persistedMetrics = readTestJson<FeatureMetrics>(
      testContext.projectRoot,
      `.nextai/metrics/features/${feature.id}.json`
    );

    expect(persistedMetrics.feature_id).toBe(feature.id);
    expect(persistedMetrics.title).toBe('Persistence Test');
    // Note: completed_at is set by feature_completed event which is logged
    // separately in the complete command, not during phase transition
    expect(persistedMetrics.phases.complete).toBeDefined();
  });

  it('reads metrics back from disk correctly', () => {
    const feature = addFeature(testContext.projectRoot, 'Read Test', 'feature');

    updateLedgerPhase(testContext.projectRoot, feature.id, 'product_refinement');
    updateLedgerPhase(testContext.projectRoot, feature.id, 'tech_spec');
    updateLedgerPhase(testContext.projectRoot, feature.id, 'implementation');

    const metricsPath = join(
      testContext.projectRoot,
      '.nextai',
      'metrics',
      'features',
      `${feature.id}.json`
    );

    expect(existsSync(metricsPath)).toBe(true);

    const fromDisk = readTestJson<FeatureMetrics>(
      testContext.projectRoot,
      `.nextai/metrics/features/${feature.id}.json`
    );

    const recalculated = calculateFeatureMetrics(testContext.projectRoot, feature.id);

    expect(fromDisk.feature_id).toBe(recalculated?.feature_id);
    expect(fromDisk.phases.created?.entered_at).toBe(recalculated?.phases.created?.entered_at);
  });

  it('updates aggregates when feature completes', () => {
    const feature = addFeature(testContext.projectRoot, 'Aggregate Test', 'feature');

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

    updateAggregates(testContext.projectRoot);

    const aggregatedPath = join(testContext.projectRoot, '.nextai', 'metrics', 'aggregated.json');
    expect(existsSync(aggregatedPath)).toBe(true);

    const aggregated = readTestJson<AggregatedMetrics>(
      testContext.projectRoot,
      '.nextai/metrics/aggregated.json'
    );

    expect(aggregated.totals.done).toBe(1);
    expect(aggregated.totals.todo).toBe(0);
    expect(aggregated.averages.total_duration_ms).toBeDefined();
    expect(aggregated.averages.total_duration_ms).toBeGreaterThan(0);
  });
});
