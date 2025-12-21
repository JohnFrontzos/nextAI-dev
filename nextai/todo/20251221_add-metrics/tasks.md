# Implementation Tasks

## Pre-implementation

- [ ] Review existing history log structure in `src/core/state/history.ts`
- [ ] Review existing ledger phase transition logic in `src/core/state/ledger.ts`
- [ ] Review testing command implementation in `src/cli/commands/testing.ts`
- [ ] Understand how phase transitions are logged to history

## Core Implementation

### 1. Metrics Schema

- [ ] Create `src/schemas/metrics.ts` with Zod schemas
- [ ] Define `PhaseMetricsSchema` for basic phase metrics
- [ ] Define `ReviewPhaseMetricsSchema` with iteration tracking
- [ ] Define `TestingAttemptSchema` for individual test attempts
- [ ] Define `TestingPhaseMetricsSchema` with PASS/FAIL history
- [ ] Define `CompletePhaseMetricsSchema` for completion phase
- [ ] Define `FeatureMetricsSchema` for complete feature metrics
- [ ] Define `AggregatedMetricsSchema` for aggregate statistics
- [ ] Define `MetricsIndexSchema` for metrics catalog
- [ ] Export TypeScript types from Zod schemas

### 2. Metrics Paths Utilities

- [ ] Add `getMetricsDir()` to `src/cli/utils/config.ts`
- [ ] Add `getMetricsFeaturesDir()` to `src/cli/utils/config.ts`
- [ ] Add `getFeatureMetricsPath()` to `src/cli/utils/config.ts`
- [ ] Add `getAggregatedMetricsPath()` to `src/cli/utils/config.ts`
- [ ] Add `getMetricsIndexPath()` to `src/cli/utils/config.ts`

### 3. Metrics Writer Module

- [ ] Create `src/core/metrics/` directory
- [ ] Create `src/core/metrics/metrics-writer.ts`
- [ ] Implement `calculateFeatureMetrics()` function
  - [ ] Parse history events for feature
  - [ ] Track phase entry and exit times
  - [ ] Calculate phase durations
  - [ ] Track review iterations (transitions back to implementation)
  - [ ] Track validation counts (passed, failed, bypassed)
  - [ ] Calculate total duration for completed features
  - [ ] Calculate implementation-to-complete duration
- [ ] Implement `updateFeatureMetrics()` function
  - [ ] Calculate metrics from history
  - [ ] Ensure metrics directory exists
  - [ ] Write metrics to JSON file
  - [ ] Update metrics index
- [ ] Implement `calculateAggregatedMetrics()` function
  - [ ] Get all features from ledger
  - [ ] Count done vs todo
  - [ ] Count by type (feature, bug, task)
  - [ ] Calculate averages for completed features only
  - [ ] Calculate phase duration averages
- [ ] Implement `updateAggregates()` function
  - [ ] Calculate aggregated metrics
  - [ ] Write to aggregated.json
- [ ] Implement helper `average()` function
  - [ ] Filter out undefined values
  - [ ] Calculate mean
- [ ] Implement `updateMetricsIndex()` function
  - [ ] Count total and completed features
  - [ ] Update index.json with metadata

### 4. Testing Metrics Extraction

- [ ] Add testing metrics extraction to `calculateFeatureMetrics()`
  - [ ] Parse `testing.md` file for test session results
  - [ ] Extract session numbers, timestamps, and PASS/FAIL results
  - [ ] Match with phase transition timestamps
  - [ ] Build testing history array
  - [ ] Count fail and pass attempts
  - [ ] Calculate testing iterations

### 5. Metrics Collector Module

- [ ] Create `src/core/metrics/metrics-collector.ts`
- [ ] Implement `onPhaseTransition()` function
  - [ ] Call `updateFeatureMetrics()` after any phase transition
- [ ] Implement `onFeatureComplete()` function
  - [ ] Call `updateFeatureMetrics()` for the completed feature
  - [ ] Call `updateAggregates()` to update aggregate statistics

### 6. Integration with Ledger

- [ ] Modify `src/core/state/ledger.ts`
- [ ] Import metrics collector functions
- [ ] Update `updateLedgerPhase()` to call metrics collector
  - [ ] After logging phase transition event
  - [ ] Call `onFeatureComplete()` if transitioning to 'complete' phase
  - [ ] Call `onPhaseTransition()` for all other transitions

### 7. Metrics Initialization

- [ ] Create `src/core/metrics/init.ts`
- [ ] Implement `initMetrics()` function
  - [ ] Create `.nextai/metrics/` directory
  - [ ] Create `.nextai/metrics/features/` directory
  - [ ] Initialize empty `aggregated.json`
  - [ ] Initialize `index.json` with version and zero counts
- [ ] Integrate `initMetrics()` into `src/cli/commands/init.ts`
  - [ ] Call `initMetrics()` during project initialization

### 8. Error Handling

- [ ] Add try-catch blocks in metrics writer
- [ ] Log errors without crashing phase transitions
- [ ] Handle missing features gracefully (return null)
- [ ] Handle corrupted history log gracefully (use available data)
- [ ] Validate metrics with Zod schemas before writing
- [ ] Handle write failures (permissions, disk full)

### 9. Export from Index

- [ ] Create `src/core/metrics/index.ts`
- [ ] Export all public functions
  - [ ] `updateFeatureMetrics`
  - [ ] `updateAggregates`
  - [ ] `calculateFeatureMetrics`
  - [ ] `calculateAggregatedMetrics`
  - [ ] `onPhaseTransition`
  - [ ] `onFeatureComplete`
  - [ ] `initMetrics`

## Unit Tests

- [ ] Create `tests/unit/core/metrics/` directory
- [ ] Create `tests/unit/core/metrics/metrics-writer.test.ts`
  - [ ] Test `calculateFeatureMetrics()` with simple feature lifecycle
  - [ ] Test phase duration calculations
  - [ ] Test review iteration tracking (transitions back from review to implementation)
  - [ ] Test validation counts (passed, failed, bypassed)
  - [ ] Test completed feature total duration calculation
  - [ ] Test implementation-to-complete duration calculation
  - [ ] Test with missing phase transitions (incomplete data)
  - [ ] Test with removed features
- [ ] Create `tests/unit/core/metrics/metrics-collector.test.ts`
  - [ ] Test `onPhaseTransition()` calls `updateFeatureMetrics()`
  - [ ] Test `onFeatureComplete()` calls both feature and aggregate updates
- [ ] Create `tests/unit/schemas/metrics.test.ts`
  - [ ] Test valid feature metrics pass schema validation
  - [ ] Test valid aggregated metrics pass schema validation
  - [ ] Test invalid metrics are rejected
  - [ ] Test optional fields are handled correctly
- [ ] Create `tests/integration/core/metrics/` directory
- [ ] Create `tests/integration/core/metrics/full-lifecycle.test.ts`
  - [ ] Test creating a feature and capturing metrics at each phase
  - [ ] Test completing a feature updates aggregates
  - [ ] Test metrics files are persisted correctly
  - [ ] Test reading metrics back from disk
- [ ] Create `tests/integration/core/metrics/multiple-features.test.ts`
  - [ ] Test creating and completing multiple features
  - [ ] Test aggregated metrics calculate correctly
  - [ ] Test type-based statistics (feature, bug, task)
  - [ ] Test averages across multiple features
