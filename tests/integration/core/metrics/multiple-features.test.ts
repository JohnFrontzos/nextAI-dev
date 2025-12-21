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
import { calculateAggregatedMetrics, updateAggregates } from '../../../../src/core/metrics/metrics-writer';
import type { AggregatedMetrics } from '../../../../src/schemas/metrics';
import { existsSync } from 'fs';

describe('Metrics Multiple Features Integration', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    initNextAIStructure(testContext.projectRoot);
  });

  afterEach(() => {
    testContext.cleanup();
  });

  it('creates and completes multiple features', () => {
    const feature1 = addFeature(testContext.projectRoot, 'Feature 1', 'feature');
    const feature2 = addFeature(testContext.projectRoot, 'Feature 2', 'feature');
    const bug = addFeature(testContext.projectRoot, 'Bug Fix', 'bug');

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

    // Complete bug
    updateLedgerPhase(testContext.projectRoot, bug.id, 'product_refinement');
    updateLedgerPhase(testContext.projectRoot, bug.id, 'tech_spec');
    updateLedgerPhase(testContext.projectRoot, bug.id, 'implementation');
    updateLedgerPhase(testContext.projectRoot, bug.id, 'review');
    updateLedgerPhase(testContext.projectRoot, bug.id, 'testing');
    updateLedgerPhase(testContext.projectRoot, bug.id, 'complete');

    appendHistory(testContext.projectRoot, {
      event: 'feature_completed',
      feature_id: bug.id,
    });

    // Leave feature2 incomplete (in implementation phase)
    updateLedgerPhase(testContext.projectRoot, feature2.id, 'product_refinement');
    updateLedgerPhase(testContext.projectRoot, feature2.id, 'tech_spec');
    updateLedgerPhase(testContext.projectRoot, feature2.id, 'implementation');

    const aggregated = calculateAggregatedMetrics(testContext.projectRoot);

    expect(aggregated.totals.done).toBe(2);
    expect(aggregated.totals.todo).toBe(1);
    expect(aggregated.totals.by_type.feature.done).toBe(1);
    expect(aggregated.totals.by_type.feature.todo).toBe(1);
    expect(aggregated.totals.by_type.bug.done).toBe(1);
    expect(aggregated.totals.by_type.bug.todo).toBe(0);
  });

  it('calculates correct type-based statistics', () => {
    const feature1 = addFeature(testContext.projectRoot, 'Feature 1', 'feature');
    const feature2 = addFeature(testContext.projectRoot, 'Feature 2', 'feature');
    const bug1 = addFeature(testContext.projectRoot, 'Bug 1', 'bug');
    const bug2 = addFeature(testContext.projectRoot, 'Bug 2', 'bug');
    const task1 = addFeature(testContext.projectRoot, 'Task 1', 'task');

    // Complete one of each type
    for (const feature of [feature1, bug1, task1]) {
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

    expect(aggregated.totals.done).toBe(3);
    expect(aggregated.totals.todo).toBe(2);
    expect(aggregated.totals.by_type.feature.done).toBe(1);
    expect(aggregated.totals.by_type.feature.todo).toBe(1);
    expect(aggregated.totals.by_type.bug.done).toBe(1);
    expect(aggregated.totals.by_type.bug.todo).toBe(1);
    expect(aggregated.totals.by_type.task.done).toBe(1);
    expect(aggregated.totals.by_type.task.todo).toBe(0);
  });

  it('calculates averages across multiple features', () => {
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
    expect(aggregated.averages.total_duration_ms).toBeGreaterThan(0);
    expect(aggregated.averages.implementation_to_complete_ms).toBeDefined();
    expect(aggregated.averages.implementation_to_complete_ms).toBeGreaterThan(0);

    expect(aggregated.phase_averages.product_refinement_ms).toBeDefined();
    expect(aggregated.phase_averages.tech_spec_ms).toBeDefined();
    expect(aggregated.phase_averages.implementation_ms).toBeDefined();
    expect(aggregated.phase_averages.review_ms).toBeDefined();
    expect(aggregated.phase_averages.testing_ms).toBeDefined();
  });

  it('persists aggregated metrics correctly', () => {
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

    updateAggregates(testContext.projectRoot);

    const aggregatedPath = join(testContext.projectRoot, '.nextai', 'metrics', 'aggregated.json');
    expect(existsSync(aggregatedPath)).toBe(true);

    const aggregated = readTestJson<AggregatedMetrics>(
      testContext.projectRoot,
      '.nextai/metrics/aggregated.json'
    );

    expect(aggregated.totals.done).toBe(2);
    expect(aggregated.averages.total_duration_ms).toBeDefined();
  });

  it('handles mix of completed and incomplete features', () => {
    const feature1 = addFeature(testContext.projectRoot, 'Completed', 'feature');
    const feature2 = addFeature(testContext.projectRoot, 'In Progress', 'feature');
    const feature3 = addFeature(testContext.projectRoot, 'Just Started', 'feature');

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

    // Partially complete feature2
    updateLedgerPhase(testContext.projectRoot, feature2.id, 'product_refinement');
    updateLedgerPhase(testContext.projectRoot, feature2.id, 'tech_spec');
    updateLedgerPhase(testContext.projectRoot, feature2.id, 'implementation');

    // Leave feature3 in created state

    const aggregated = calculateAggregatedMetrics(testContext.projectRoot);

    expect(aggregated.totals.done).toBe(1);
    expect(aggregated.totals.todo).toBe(2);

    // Averages should only include completed feature
    expect(aggregated.averages.total_duration_ms).toBeDefined();
    expect(aggregated.averages.total_duration_ms).toBeGreaterThan(0);
  });
});
