import { readFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { readHistory } from '../state/history.js';
import { getFeature, listFeatures } from '../state/ledger.js';
import { getFeaturePath } from '../scaffolding/feature.js';
import {
  type FeatureMetrics,
  type AggregatedMetrics,
  type MetricsIndex,
  type TestingAttempt,
  type PhaseMetrics,
  type ReviewPhaseMetrics,
  type TestingPhaseMetrics,
  FeatureMetricsSchema,
  AggregatedMetricsSchema,
  MetricsIndexSchema,
} from '../../schemas/metrics.js';
import {
  writeJson,
  ensureDir,
  getFeatureMetricsPath,
  getAggregatedMetricsPath,
  getMetricsIndexPath,
} from '../../cli/utils/config.js';
import { join } from 'path';

/**
 * Helper to calculate average, filtering out undefined values
 */
function average(values: (number | undefined)[]): number | undefined {
  const defined = values.filter((v): v is number => v !== undefined);
  if (defined.length === 0) return undefined;
  return defined.reduce((a, b) => a + b, 0) / defined.length;
}

/**
 * Extract testing attempts from testing.md file
 */
function extractTestingMetrics(projectRoot: string, featureId: string): TestingAttempt[] {
  const testingPath = join(getFeaturePath(projectRoot, featureId), 'testing.md');

  if (!existsSync(testingPath)) {
    return [];
  }

  try {
    const content = readFileSync(testingPath, 'utf-8');
    const attempts: TestingAttempt[] = [];

    // Match sessions with format: ### Session N - MM/DD/YYYY, HH:MM AM/PM
    const sessionRegex = /### Session (\d+) - (\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}.*?)\n\*\*Status:\*\* (PASS|FAIL)/g;
    let match;

    while ((match = sessionRegex.exec(content)) !== null) {
      const sessionNumber = parseInt(match[1], 10);
      const dateStr = match[2];
      const result = match[3].toLowerCase() as 'pass' | 'fail';

      // Parse date string (MM/DD/YYYY, HH:MM AM/PM)
      const parsedDate = new Date(dateStr);
      const timestamp = parsedDate.toISOString();

      attempts.push({
        attempt: sessionNumber,
        started_at: timestamp,
        result,
      });
    }

    return attempts;
  } catch (error) {
    // If parsing fails, return empty array
    return [];
  }
}

/**
 * Calculate metrics for a single feature by parsing its history
 */
export function calculateFeatureMetrics(projectRoot: string, featureId: string): FeatureMetrics | null {
  try {
    // Get feature from ledger
    const feature = getFeature(projectRoot, featureId);
    if (!feature) return null;

    // Get all history events for this feature
    const history = readHistory(projectRoot).filter((e) => e.feature_id === featureId);

    // Initialize metrics
    const metrics: FeatureMetrics = {
      feature_id: featureId,
      title: feature.title,
      type: feature.type,
      created_at: feature.created_at,
      retry_count: feature.retry_count,
      phases: {},
      validations: {
        passed: 0,
        failed: 0,
        bypassed: 0,
      },
    };

    // Track phase entry times
    const phaseEntryTimes: Record<string, string> = {};

    // Process history events chronologically
    for (const event of history) {
      switch (event.event) {
        case 'feature_created':
          phaseEntryTimes['created'] = event.ts;
          // Initialize created phase immediately
          metrics.phases.created = {
            entered_at: event.ts,
          };
          break;

        case 'phase_transition':
          // Record exit time for previous phase
          if (phaseEntryTimes[event.from_phase]) {
            const enteredAt = phaseEntryTimes[event.from_phase];
            const duration = new Date(event.ts).getTime() - new Date(enteredAt).getTime();

            // Special handling for testing and review phases
            if (event.from_phase === 'testing') {
              const existing = metrics.phases.testing as TestingPhaseMetrics | undefined;
              metrics.phases.testing = {
                entered_at: enteredAt,
                exited_at: event.ts,
                duration_ms: duration,
                iterations: existing?.iterations || 0,
                fail_count: existing?.fail_count || 0,
                pass_count: existing?.pass_count || 0,
                history: existing?.history || [],
              };
            } else if (event.from_phase === 'review') {
              const existing = metrics.phases.review as ReviewPhaseMetrics | undefined;
              metrics.phases.review = {
                entered_at: enteredAt,
                exited_at: event.ts,
                duration_ms: duration,
                iterations: existing?.iterations || 1,
              };
            } else {
              const phaseMetrics: PhaseMetrics = {
                entered_at: enteredAt,
                exited_at: event.ts,
                duration_ms: duration,
              };
              (metrics.phases as any)[event.from_phase] = phaseMetrics;
            }
          }

          // Record entry time for new phase
          phaseEntryTimes[event.to_phase] = event.ts;

          // Set entered_at for complete phase (terminal phase with no exit)
          if (event.to_phase === 'complete') {
            metrics.phases.complete = {
              entered_at: event.ts,
            };
          }

          // Track iterations (transitions back to implementation)
          if (event.to_phase === 'implementation' && event.from_phase === 'review') {
            const current = metrics.phases.review?.iterations || 0;
            const existing = metrics.phases.review as ReviewPhaseMetrics | undefined;
            metrics.phases.review = {
              entered_at: existing?.entered_at || event.ts,
              exited_at: existing?.exited_at,
              duration_ms: existing?.duration_ms,
              iterations: current + 1,
            };
          }
          break;

        case 'validation':
          if (event.result === 'passed') {
            metrics.validations.passed++;
          } else if (event.result === 'failed') {
            metrics.validations.failed++;
          }
          break;

        case 'validation_bypass':
          metrics.validations.bypassed++;
          break;

        case 'feature_completed':
          metrics.completed_at = event.ts;
          if (phaseEntryTimes['complete']) {
            metrics.phases.complete = {
              entered_at: phaseEntryTimes['complete'],
            };
          }
          break;
      }
    }

    // Extract testing metrics from testing.md
    const testingAttempts = extractTestingMetrics(projectRoot, featureId);
    if (testingAttempts.length > 0) {
      const existing = metrics.phases.testing as TestingPhaseMetrics | undefined;
      const failCount = testingAttempts.filter((a) => a.result === 'fail').length;
      const passCount = testingAttempts.filter((a) => a.result === 'pass').length;

      metrics.phases.testing = {
        entered_at: existing?.entered_at || testingAttempts[0].started_at,
        exited_at: existing?.exited_at,
        duration_ms: existing?.duration_ms,
        iterations: testingAttempts.length,
        fail_count: failCount,
        pass_count: passCount,
        history: testingAttempts,
      };
    }

    // Calculate total duration if completed
    if (metrics.completed_at) {
      metrics.total_duration_ms =
        new Date(metrics.completed_at).getTime() - new Date(metrics.created_at).getTime();

      // Calculate implementation-to-complete duration
      if (phaseEntryTimes['implementation']) {
        metrics.implementation_to_complete_ms =
          new Date(metrics.completed_at).getTime() -
          new Date(phaseEntryTimes['implementation']).getTime();
      }
    }

    // Validate with schema
    const validated = FeatureMetricsSchema.parse(metrics);
    return validated;
  } catch (error) {
    // Log error but don't crash - metrics are non-critical
    console.error(`Failed to calculate metrics for feature ${featureId}:`, error);
    return null;
  }
}

/**
 * Write feature metrics to disk
 */
export function updateFeatureMetrics(projectRoot: string, featureId: string): void {
  try {
    const metrics = calculateFeatureMetrics(projectRoot, featureId);
    if (!metrics) return;

    const metricsPath = getFeatureMetricsPath(projectRoot, featureId);
    ensureDir(dirname(metricsPath));
    writeJson(metricsPath, metrics);

    // Update index
    updateMetricsIndex(projectRoot);
  } catch (error) {
    // Log error but don't crash - metrics are non-critical
    console.error(`Failed to update metrics for feature ${featureId}:`, error);
  }
}

/**
 * Calculate aggregated metrics across all completed features
 */
export function calculateAggregatedMetrics(projectRoot: string): AggregatedMetrics {
  try {
    // Get all features from ledger
    const allFeatures = listFeatures(projectRoot, { includeComplete: true });

    // Separate done and todo
    const done = allFeatures.filter((f) => f.phase === 'complete');
    const todo = allFeatures.filter((f) => f.phase !== 'complete');

    // Count by type
    const byType = {
      feature: { done: 0, todo: 0 },
      bug: { done: 0, todo: 0 },
      task: { done: 0, todo: 0 },
    };

    for (const f of done) byType[f.type].done++;
    for (const f of todo) byType[f.type].todo++;

    // Calculate averages from completed features only
    const completedMetrics: FeatureMetrics[] = [];
    for (const feature of done) {
      const metrics = calculateFeatureMetrics(projectRoot, feature.id);
      if (metrics && metrics.completed_at) {
        completedMetrics.push(metrics);
      }
    }

    const averages = {
      total_duration_ms: average(completedMetrics.map((m) => m.total_duration_ms)),
      implementation_to_complete_ms: average(
        completedMetrics.map((m) => m.implementation_to_complete_ms)
      ),
      implementation_duration_ms: average(
        completedMetrics.map((m) => m.phases.implementation?.duration_ms)
      ),
      testing_iterations: average(completedMetrics.map((m) => m.phases.testing?.iterations)),
      testing_fail_count: average(completedMetrics.map((m) => m.phases.testing?.fail_count)),
    };

    const phase_averages = {
      product_refinement_ms: average(
        completedMetrics.map((m) => m.phases.product_refinement?.duration_ms)
      ),
      tech_spec_ms: average(completedMetrics.map((m) => m.phases.tech_spec?.duration_ms)),
      implementation_ms: average(completedMetrics.map((m) => m.phases.implementation?.duration_ms)),
      review_ms: average(completedMetrics.map((m) => m.phases.review?.duration_ms)),
      testing_ms: average(completedMetrics.map((m) => m.phases.testing?.duration_ms)),
    };

    const aggregated: AggregatedMetrics = {
      updated_at: new Date().toISOString(),
      totals: {
        done: done.length,
        todo: todo.length,
        by_type: byType,
      },
      averages,
      phase_averages,
    };

    // Validate with schema
    return AggregatedMetricsSchema.parse(aggregated);
  } catch (error) {
    // Return empty aggregated metrics on error
    console.error('Failed to calculate aggregated metrics:', error);
    return {
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
  }
}

/**
 * Write aggregated metrics to disk
 */
export function updateAggregates(projectRoot: string): void {
  try {
    const aggregated = calculateAggregatedMetrics(projectRoot);
    const path = getAggregatedMetricsPath(projectRoot);
    ensureDir(dirname(path));
    writeJson(path, aggregated);
  } catch (error) {
    // Log error but don't crash - metrics are non-critical
    console.error('Failed to update aggregated metrics:', error);
  }
}

/**
 * Update the metrics index
 */
function updateMetricsIndex(projectRoot: string): void {
  try {
    const allFeatures = listFeatures(projectRoot, { includeComplete: true });
    const completed = allFeatures.filter((f) => f.phase === 'complete');

    const index: MetricsIndex = {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      feature_count: allFeatures.length,
      completed_count: completed.length,
    };

    // Validate with schema
    const validated = MetricsIndexSchema.parse(index);

    const path = getMetricsIndexPath(projectRoot);
    ensureDir(dirname(path));
    writeJson(path, validated);
  } catch (error) {
    // Log error but don't crash - metrics are non-critical
    console.error('Failed to update metrics index:', error);
  }
}
