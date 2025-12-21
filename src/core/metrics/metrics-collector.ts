import { updateFeatureMetrics, updateAggregates } from './metrics-writer.js';

/**
 * Called after any phase transition
 */
export function onPhaseTransition(projectRoot: string, featureId: string): void {
  try {
    updateFeatureMetrics(projectRoot, featureId);
  } catch (error) {
    // Log error but don't crash - metrics are non-critical
    console.error(`Metrics collection failed for phase transition (${featureId}):`, error);
  }
}

/**
 * Called when a feature is completed
 */
export function onFeatureComplete(projectRoot: string, featureId: string): void {
  try {
    updateFeatureMetrics(projectRoot, featureId);
    updateAggregates(projectRoot);
  } catch (error) {
    // Log error but don't crash - metrics are non-critical
    console.error(`Metrics collection failed for feature completion (${featureId}):`, error);
  }
}
