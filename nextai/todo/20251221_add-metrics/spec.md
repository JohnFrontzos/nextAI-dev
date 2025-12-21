# Metrics System Technical Specification

## Overview

This feature implements a comprehensive metrics collection and aggregation system for NextAI to track development workflow performance. The system will collect data about feature lifecycles, phase durations, review iterations, and testing attempts to help operators evaluate the framework's effectiveness.

The metrics system consists of:
1. Per-feature metrics files stored in `.nextai/metrics/features/`
2. Aggregated statistics in `.nextai/metrics/aggregated.json`
3. A metrics catalog in `.nextai/metrics/index.json`
4. Event listeners that update metrics on phase transitions
5. Storage format compatible with future SQLite migration

## Requirements Summary

From the requirements document, the confirmed decisions are:

1. Location: `.nextai/metrics/` (alongside `.nextai/state/`)
2. Architecture: Separate metrics cache (Option B) - updates on events, history log remains source of truth
3. Storage Format: JSON with SQLite-compatible schema
4. Update Timing: On phase transitions + aggregates on completion
5. Scope: Single project only
6. Out of Scope: Agent usage statistics, frontend dashboard, database implementation, multi-project aggregation

Key metrics to track:
- Total done/todo counts
- Feature type breakdown (feature, bug, task)
- Average time to complete (create-to-complete)
- Average implementation time (implementation phase start to complete)
- Testing iterations with FAIL/PASS history
- Review iterations
- Phase durations

## Technical Approach

The metrics system will be implemented as a new module at `src/core/metrics/` with the following components:

1. **Metrics Writer** (`metrics-writer.ts`): Core logic for reading history log, calculating metrics, and writing metrics files
2. **Metrics Collector** (`metrics-collector.ts`): Event listeners that trigger metrics updates on phase transitions
3. **Metrics Schema** (`src/schemas/metrics.ts`): Zod schemas for validation
4. **Integration Points**: Hook into existing phase transition logic in `src/core/state/ledger.ts`

The system will extract data from the existing `.nextai/state/history.log` which already contains:
- `feature_created` events with timestamps
- `phase_transition` events with from/to phases and timestamps
- `feature_completed` events
- `validation` events
- `retry_incremented` events
- `feature_removed` events

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Phase Transition                        │
│            (src/core/state/ledger.ts)                    │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Metrics Collector                           │
│         (src/core/metrics/metrics-collector.ts)          │
│  - onPhaseTransition()                                   │
│  - onFeatureComplete()                                   │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Metrics Writer                              │
│         (src/core/metrics/metrics-writer.ts)             │
│  - updateFeatureMetrics()                                │
│  - updateAggregates()                                    │
│  - calculatePhaseDurations()                             │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              History Log (Source of Truth)               │
│         (.nextai/state/history.log)                      │
└─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Metrics Files (Cache)                       │
│         (.nextai/metrics/)                               │
│  - features/{id}.json                                    │
│  - aggregated.json                                       │
│  - index.json                                            │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Phase Transition**: When a feature transitions phases (via `updateLedgerPhase()` or `updateFeaturePhase()`), a `phase_transition` event is logged to history
2. **Metrics Collection**: After logging the history event, call `updateFeatureMetrics(featureId)` to regenerate metrics from history
3. **Metrics Writing**: Parse all history events for the feature, calculate phase durations and counts, write to `.nextai/metrics/features/{id}.json`
4. **Aggregation**: When a feature completes, also call `updateAggregates()` to recalculate aggregate statistics across all completed features

### Directory Structure

```
.nextai/
├── state/
│   ├── ledger.json           (existing)
│   └── history.log           (existing - source of truth)
└── metrics/
    ├── features/             (per-feature metrics)
    │   ├── 20251212_add-readme-badges.json
    │   └── 20251212_fix-docs-output-path.json
    ├── aggregated.json       (pre-computed aggregates)
    └── index.json            (metrics catalog)
```

## Implementation Details

### 1. Metrics Schema (`src/schemas/metrics.ts`)

Define Zod schemas for type safety:

```typescript
import { z } from 'zod';

// Phase metrics entry
const PhaseMetricsSchema = z.object({
  entered_at: z.string().datetime(),
  exited_at: z.string().datetime().optional(),
  duration_ms: z.number().optional(),
});

// Review phase metrics (with iteration tracking)
const ReviewPhaseMetricsSchema = PhaseMetricsSchema.extend({
  iterations: z.number().default(1),
});

// Testing phase metrics (with PASS/FAIL history)
const TestingAttemptSchema = z.object({
  attempt: z.number(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().optional(),
  result: z.enum(['pass', 'fail']).optional(),
  duration_ms: z.number().optional(),
});

const TestingPhaseMetricsSchema = PhaseMetricsSchema.extend({
  iterations: z.number().default(0),
  fail_count: z.number().default(0),
  pass_count: z.number().default(0),
  history: z.array(TestingAttemptSchema).default([]),
});

// Complete phase metrics
const CompletePhaseMetricsSchema = z.object({
  entered_at: z.string().datetime(),
});

// Feature metrics
export const FeatureMetricsSchema = z.object({
  feature_id: z.string(),
  title: z.string(),
  type: z.enum(['feature', 'bug', 'task']),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  total_duration_ms: z.number().optional(),
  implementation_to_complete_ms: z.number().optional(),
  retry_count: z.number().default(0),
  phases: z.object({
    created: PhaseMetricsSchema.optional(),
    product_refinement: PhaseMetricsSchema.optional(),
    tech_spec: PhaseMetricsSchema.optional(),
    implementation: PhaseMetricsSchema.optional(),
    review: ReviewPhaseMetricsSchema.optional(),
    testing: TestingPhaseMetricsSchema.optional(),
    complete: CompletePhaseMetricsSchema.optional(),
  }),
  validations: z.object({
    passed: z.number().default(0),
    failed: z.number().default(0),
    bypassed: z.number().default(0),
  }),
});

// Aggregated metrics
export const AggregatedMetricsSchema = z.object({
  updated_at: z.string().datetime(),
  totals: z.object({
    done: z.number(),
    todo: z.number(),
    by_type: z.object({
      feature: z.object({ done: z.number(), todo: z.number() }),
      bug: z.object({ done: z.number(), todo: z.number() }),
      task: z.object({ done: z.number(), todo: z.number() }),
    }),
  }),
  averages: z.object({
    total_duration_ms: z.number().optional(),
    implementation_to_complete_ms: z.number().optional(),
    implementation_duration_ms: z.number().optional(),
    testing_iterations: z.number().optional(),
    testing_fail_count: z.number().optional(),
  }),
  phase_averages: z.object({
    product_refinement_ms: z.number().optional(),
    tech_spec_ms: z.number().optional(),
    implementation_ms: z.number().optional(),
    review_ms: z.number().optional(),
    testing_ms: z.number().optional(),
  }),
});

// Index catalog
export const MetricsIndexSchema = z.object({
  version: z.string(),
  last_updated: z.string().datetime(),
  feature_count: z.number(),
  completed_count: z.number(),
});

export type FeatureMetrics = z.infer<typeof FeatureMetricsSchema>;
export type AggregatedMetrics = z.infer<typeof AggregatedMetricsSchema>;
export type MetricsIndex = z.infer<typeof MetricsIndexSchema>;
export type TestingAttempt = z.infer<typeof TestingAttemptSchema>;
```

### 2. Metrics Paths Utility (`src/cli/utils/config.ts` additions)

Add helper functions to get metrics paths:

```typescript
export function getMetricsDir(projectRoot: string): string {
  return join(getNextAIDir(projectRoot), 'metrics');
}

export function getMetricsFeaturesDir(projectRoot: string): string {
  return join(getMetricsDir(projectRoot), 'features');
}

export function getFeatureMetricsPath(projectRoot: string, featureId: string): string {
  return join(getMetricsFeaturesDir(projectRoot), `${featureId}.json`);
}

export function getAggregatedMetricsPath(projectRoot: string): string {
  return join(getMetricsDir(projectRoot), 'aggregated.json');
}

export function getMetricsIndexPath(projectRoot: string): string {
  return join(getMetricsDir(projectRoot), 'index.json');
}
```

### 3. Metrics Writer (`src/core/metrics/metrics-writer.ts`)

Core logic for computing metrics from history:

```typescript
import { readHistory } from '../state/history.js';
import { getFeature, listFeatures } from '../state/ledger.js';
import type { FeatureMetrics, AggregatedMetrics } from '../../schemas/metrics.js';
import { writeJson, ensureDir } from '../../cli/utils/config.js';

/**
 * Calculate metrics for a single feature by parsing its history
 */
export function calculateFeatureMetrics(projectRoot: string, featureId: string): FeatureMetrics | null {
  // Get feature from ledger
  const feature = getFeature(projectRoot, featureId);
  if (!feature) return null;

  // Get all history events for this feature
  const history = readHistory(projectRoot).filter(e => e.feature_id === featureId);

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
        break;

      case 'phase_transition':
        // Record exit time for previous phase
        if (phaseEntryTimes[event.from_phase]) {
          const enteredAt = phaseEntryTimes[event.from_phase];
          const duration = new Date(event.ts).getTime() - new Date(enteredAt).getTime();

          // Special handling for testing and review phases
          if (event.from_phase === 'testing') {
            metrics.phases.testing = {
              ...metrics.phases.testing,
              entered_at: enteredAt,
              exited_at: event.ts,
              duration_ms: duration,
            };
          } else if (event.from_phase === 'review') {
            metrics.phases.review = {
              ...metrics.phases.review,
              entered_at: enteredAt,
              exited_at: event.ts,
              duration_ms: duration,
            };
          } else {
            metrics.phases[event.from_phase] = {
              entered_at: enteredAt,
              exited_at: event.ts,
              duration_ms: duration,
            };
          }
        }

        // Record entry time for new phase
        phaseEntryTimes[event.to_phase] = event.ts;

        // Track iterations (transitions back to implementation)
        if (event.to_phase === 'implementation' && (event.from_phase === 'review' || event.from_phase === 'testing')) {
          if (event.from_phase === 'review') {
            const current = metrics.phases.review?.iterations || 0;
            metrics.phases.review = {
              ...metrics.phases.review,
              iterations: current + 1,
            };
          }
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

  // Calculate total duration if completed
  if (metrics.completed_at) {
    metrics.total_duration_ms = new Date(metrics.completed_at).getTime() - new Date(metrics.created_at).getTime();

    // Calculate implementation-to-complete duration
    if (phaseEntryTimes['implementation']) {
      metrics.implementation_to_complete_ms = new Date(metrics.completed_at).getTime() - new Date(phaseEntryTimes['implementation']).getTime();
    }
  }

  return metrics;
}

/**
 * Write feature metrics to disk
 */
export function updateFeatureMetrics(projectRoot: string, featureId: string): void {
  const metrics = calculateFeatureMetrics(projectRoot, featureId);
  if (!metrics) return;

  const metricsPath = getFeatureMetricsPath(projectRoot, featureId);
  ensureDir(dirname(metricsPath));
  writeJson(metricsPath, metrics);

  // Update index
  updateMetricsIndex(projectRoot);
}

/**
 * Calculate aggregated metrics across all completed features
 */
export function calculateAggregatedMetrics(projectRoot: string): AggregatedMetrics {
  // Get all features from ledger
  const allFeatures = listFeatures(projectRoot, { includeComplete: true });

  // Separate done and todo
  const done = allFeatures.filter(f => f.phase === 'complete');
  const todo = allFeatures.filter(f => f.phase !== 'complete');

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
    total_duration_ms: average(completedMetrics.map(m => m.total_duration_ms)),
    implementation_to_complete_ms: average(completedMetrics.map(m => m.implementation_to_complete_ms)),
    implementation_duration_ms: average(completedMetrics.map(m => m.phases.implementation?.duration_ms)),
    testing_iterations: average(completedMetrics.map(m => m.phases.testing?.iterations)),
    testing_fail_count: average(completedMetrics.map(m => m.phases.testing?.fail_count)),
  };

  const phase_averages = {
    product_refinement_ms: average(completedMetrics.map(m => m.phases.product_refinement?.duration_ms)),
    tech_spec_ms: average(completedMetrics.map(m => m.phases.tech_spec?.duration_ms)),
    implementation_ms: average(completedMetrics.map(m => m.phases.implementation?.duration_ms)),
    review_ms: average(completedMetrics.map(m => m.phases.review?.duration_ms)),
    testing_ms: average(completedMetrics.map(m => m.phases.testing?.duration_ms)),
  };

  return {
    updated_at: new Date().toISOString(),
    totals: {
      done: done.length,
      todo: todo.length,
      by_type: byType,
    },
    averages,
    phase_averages,
  };
}

/**
 * Helper to calculate average, filtering out undefined values
 */
function average(values: (number | undefined)[]): number | undefined {
  const defined = values.filter((v): v is number => v !== undefined);
  if (defined.length === 0) return undefined;
  return defined.reduce((a, b) => a + b, 0) / defined.length;
}

/**
 * Write aggregated metrics to disk
 */
export function updateAggregates(projectRoot: string): void {
  const aggregated = calculateAggregatedMetrics(projectRoot);
  const path = getAggregatedMetricsPath(projectRoot);
  ensureDir(dirname(path));
  writeJson(path, aggregated);
}

/**
 * Update the metrics index
 */
function updateMetricsIndex(projectRoot: string): void {
  const allFeatures = listFeatures(projectRoot, { includeComplete: true });
  const completed = allFeatures.filter(f => f.phase === 'complete');

  const index: MetricsIndex = {
    version: '1.0.0',
    last_updated: new Date().toISOString(),
    feature_count: allFeatures.length,
    completed_count: completed.length,
  };

  const path = getMetricsIndexPath(projectRoot);
  writeJson(path, index);
}
```

### 4. Metrics Collector (`src/core/metrics/metrics-collector.ts`)

Event listeners that trigger metrics updates:

```typescript
import { updateFeatureMetrics, updateAggregates } from './metrics-writer.js';

/**
 * Called after any phase transition
 */
export function onPhaseTransition(projectRoot: string, featureId: string): void {
  updateFeatureMetrics(projectRoot, featureId);
}

/**
 * Called when a feature is completed
 */
export function onFeatureComplete(projectRoot: string, featureId: string): void {
  updateFeatureMetrics(projectRoot, featureId);
  updateAggregates(projectRoot);
}
```

### 5. Integration with Ledger (`src/core/state/ledger.ts`)

Modify `updateLedgerPhase()` to call metrics collector:

```typescript
import { onPhaseTransition, onFeatureComplete } from '../metrics/metrics-collector.js';

export function updateLedgerPhase(
  projectRoot: string,
  featureId: string,
  newPhase: Phase,
  options: { logBypass?: boolean } = {}
): PhaseUpdateResult {
  // ... existing code ...

  // Log transition
  appendHistory(projectRoot, {
    event: 'phase_transition',
    feature_id: featureId,
    from_phase: fromPhase,
    to_phase: newPhase,
  });

  // NEW: Update metrics
  if (newPhase === 'complete') {
    onFeatureComplete(projectRoot, featureId);
  } else {
    onPhaseTransition(projectRoot, featureId);
  }

  // ... rest of existing code ...
}
```

### 6. Testing Metrics

The testing phase requires special handling to track PASS/FAIL iterations. This will be implemented by:

1. Parsing the `testing.md` file to extract test session results
2. Matching session timestamps with phase transition events
3. Building the testing history array with attempts, results, and durations

Note: The current implementation in `src/cli/commands/testing.ts` logs test results to `testing.md` but doesn't create history events for individual test attempts. We'll extract this from the markdown file.

### 7. Initialization

Add a `initMetrics()` function to create the metrics directory structure during `nextai init`:

```typescript
export function initMetrics(projectRoot: string): void {
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
}
```

## API/Interface Changes

No new CLI commands are being added in this initial implementation. The metrics system operates transparently in the background.

Future enhancements could add:
- `nextai metrics` - Display metrics summary
- `nextai metrics rebuild` - Rebuild all metrics from history
- `nextai metrics export` - Export metrics to CSV/JSON

## Data Model

### Per-Feature Metrics File

Location: `.nextai/metrics/features/{feature_id}.json`

Example:
```json
{
  "feature_id": "20251212_add-readme-badges",
  "title": "Add README badges",
  "type": "feature",
  "created_at": "2025-12-12T07:12:17.523Z",
  "completed_at": "2025-12-12T07:57:41.824Z",
  "total_duration_ms": 2724301,
  "implementation_to_complete_ms": 2403820,
  "retry_count": 0,
  "phases": {
    "created": {
      "entered_at": "2025-12-12T07:12:17.523Z",
      "exited_at": "2025-12-12T07:15:23.100Z",
      "duration_ms": 185577
    },
    "product_refinement": {
      "entered_at": "2025-12-12T07:15:23.100Z",
      "exited_at": "2025-12-12T07:18:35.292Z",
      "duration_ms": 192192
    },
    "tech_spec": {
      "entered_at": "2025-12-12T07:18:35.292Z",
      "exited_at": "2025-12-12T07:19:46.521Z",
      "duration_ms": 71229
    },
    "implementation": {
      "entered_at": "2025-12-12T07:19:46.521Z",
      "exited_at": "2025-12-12T07:23:26.658Z",
      "duration_ms": 220137
    },
    "review": {
      "entered_at": "2025-12-12T07:23:26.658Z",
      "exited_at": "2025-12-12T07:42:04.629Z",
      "duration_ms": 1117971,
      "iterations": 1
    },
    "testing": {
      "entered_at": "2025-12-12T07:42:04.629Z",
      "exited_at": "2025-12-12T07:59:50.341Z",
      "duration_ms": 1065712,
      "iterations": 2,
      "fail_count": 1,
      "pass_count": 1,
      "history": [
        {
          "attempt": 1,
          "started_at": "2025-12-12T07:42:04.629Z",
          "ended_at": "2025-12-12T07:50:24.629Z",
          "result": "fail",
          "duration_ms": 500000
        },
        {
          "attempt": 2,
          "started_at": "2025-12-12T07:51:04.629Z",
          "ended_at": "2025-12-12T07:59:50.341Z",
          "result": "pass",
          "duration_ms": 526341
        }
      ]
    },
    "complete": {
      "entered_at": "2025-12-12T07:59:50.341Z"
    }
  },
  "validations": {
    "passed": 5,
    "failed": 0,
    "bypassed": 0
  }
}
```

### Aggregated Metrics File

Location: `.nextai/metrics/aggregated.json`

Example:
```json
{
  "updated_at": "2025-12-21T15:00:00.000Z",
  "totals": {
    "done": 15,
    "todo": 3,
    "by_type": {
      "feature": { "done": 10, "todo": 2 },
      "bug": { "done": 3, "todo": 1 },
      "task": { "done": 2, "todo": 0 }
    }
  },
  "averages": {
    "total_duration_ms": 2500000,
    "implementation_to_complete_ms": 2000000,
    "implementation_duration_ms": 300000,
    "testing_iterations": 1.5,
    "testing_fail_count": 0.8
  },
  "phase_averages": {
    "product_refinement_ms": 150000,
    "tech_spec_ms": 80000,
    "implementation_ms": 300000,
    "review_ms": 900000,
    "testing_ms": 800000
  }
}
```

### Metrics Index File

Location: `.nextai/metrics/index.json`

Example:
```json
{
  "version": "1.0.0",
  "last_updated": "2025-12-21T15:00:00.000Z",
  "feature_count": 18,
  "completed_count": 15
}
```

## Security Considerations

1. **File Permissions**: Metrics files will inherit the same permissions as other `.nextai/` files (user-only access)
2. **No Sensitive Data**: Metrics only contain IDs, titles, timestamps, and counts - no code or credentials
3. **Local Storage Only**: Metrics are stored locally, never transmitted
4. **Input Validation**: All metrics data is validated with Zod schemas before writing

## Error Handling

### Corrupted History Log

If the history log is corrupted or missing events:
- The metrics calculation will use whatever data is available
- Missing phase transitions will result in incomplete phase metrics
- The system will not crash, but metrics may be incomplete
- Consider adding a repair/rebuild command in the future

### Missing Feature in Ledger

If a feature is referenced in history but missing from ledger:
- `calculateFeatureMetrics()` returns `null`
- The metrics file for that feature won't be created
- Aggregated metrics will only include features present in ledger

### Write Failures

If writing metrics files fails (permissions, disk full):
- Log error but don't crash the phase transition
- Metrics are a cache, not critical path
- Operator can rebuild from history later

### Schema Validation Failures

If metrics data doesn't match schema:
- Log warning
- Skip writing the invalid file
- Continue with other metrics operations

## Testing Strategy

Based on `nextai/docs/technical-guide.md`, this project has a test framework (Vitest) configured with the following structure:

```
tests/
├── unit/
├── integration/
└── e2e/
```

### Unit Tests

Location: `tests/unit/core/metrics/`

Test cases:
1. **metrics-writer.test.ts**
   - `calculateFeatureMetrics()` with various history event sequences
   - Phase duration calculations
   - Testing iteration tracking
   - Review iteration tracking
   - Validation counts
   - Edge cases: missing events, incomplete features, removed features

2. **metrics-collector.test.ts**
   - `onPhaseTransition()` triggers metrics update
   - `onFeatureComplete()` triggers both feature and aggregate updates

3. **metrics schema validation**
   - Valid metrics pass schema validation
   - Invalid metrics are rejected

### Integration Tests

Location: `tests/integration/core/metrics/`

Test cases:
1. **Full lifecycle metrics generation**
   - Create feature → capture created event
   - Refine → capture phase transition
   - Complete → verify all metrics are correct
   - Verify aggregates update

2. **Metrics persistence**
   - Write metrics to disk
   - Read back and verify
   - Update existing metrics

### E2E Tests

Location: `tests/e2e/metrics/`

Test cases:
1. **End-to-end workflow**
   - Run through complete feature lifecycle
   - Verify metrics files are created
   - Verify aggregated metrics are correct
   - Verify index is updated

2. **Multiple features**
   - Create and complete multiple features
   - Verify aggregates calculate correctly
   - Verify type-based statistics

### Test Coverage Goals

- Lines: 70% (project standard)
- Branches: 60% (project standard)

## Alternatives Considered

### Option A: On-Demand Metrics (Rejected)

Generate metrics by parsing history log only when requested.

**Pros:**
- No storage duplication
- Always accurate (computed from source of truth)

**Cons:**
- Slower queries (must parse entire history log)
- Complex queries for aggregates
- Poor performance as history grows

**Reason for rejection:** Performance concerns, especially for aggregated metrics across many features.

### Option C: Replace History Log (Rejected)

Replace JSONL history log with SQLite database.

**Pros:**
- Faster queries
- Relational structure
- Native aggregation

**Cons:**
- Breaking change
- Adds dependency
- More complexity
- Migration required

**Reason for rejection:** Out of scope for this feature. The current JSON-based approach is designed to be compatible with future SQLite migration.

### Multi-Project Aggregation (Rejected)

Support aggregating metrics across multiple projects.

**Pros:**
- Portfolio-level insights
- Compare projects

**Cons:**
- Complex implementation
- Unclear project boundaries
- No current use case

**Reason for rejection:** Single project scope is sufficient for initial implementation. Can be added later if needed.

## Future Enhancements

1. **CLI Commands**
   - `nextai metrics` - Display metrics summary
   - `nextai metrics rebuild` - Rebuild metrics from history
   - `nextai metrics export` - Export to CSV/JSON

2. **SQLite Migration**
   - Migrate from JSON to SQLite
   - Schema already designed to be compatible
   - Better query performance

3. **Dashboard**
   - Web-based visualization
   - Charts and graphs
   - Trend analysis

4. **Historical Backfilling**
   - Generate metrics for features completed before metrics system was added
   - Parse archived features in `nextai/done/`

5. **Advanced Analytics**
   - Bottleneck detection
   - Velocity trends
   - Failure pattern analysis
