import {
  ensureDir,
  writeJson,
  getMetricsDir,
  getMetricsFeaturesDir,
  getAggregatedMetricsPath,
  getMetricsIndexPath,
} from '../../cli/utils/config.js';
import type { AggregatedMetrics, MetricsIndex } from '../../schemas/metrics.js';

/**
 * Initialize metrics directory structure and files
 */
export function initMetrics(projectRoot: string): void {
  try {
    const metricsDir = getMetricsDir(projectRoot);
    const featuresDir = getMetricsFeaturesDir(projectRoot);

    ensureDir(metricsDir);
    ensureDir(featuresDir);

    // Initialize empty aggregated metrics
    const aggregated: AggregatedMetrics = {
      updated_at: new Date().toISOString(),
      totals: {
        done: 0,
        todo: 0,
        by_type: {
          feature: { done: 0, todo: 0 },
          bug: { done: 0, todo: 0 },
          task: { done: 0, todo: 0 },
        },
      },
      averages: {},
      phase_averages: {},
    };

    writeJson(getAggregatedMetricsPath(projectRoot), aggregated);

    // Initialize index
    const index: MetricsIndex = {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      feature_count: 0,
      completed_count: 0,
    };

    writeJson(getMetricsIndexPath(projectRoot), index);
  } catch (error) {
    // Log error but don't crash - metrics are non-critical
    console.error('Failed to initialize metrics:', error);
  }
}
