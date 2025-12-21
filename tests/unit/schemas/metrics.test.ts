import { describe, it, expect } from 'vitest';
import {
  FeatureMetricsSchema,
  AggregatedMetricsSchema,
  MetricsIndexSchema,
  PhaseMetricsSchema,
  ReviewPhaseMetricsSchema,
  TestingPhaseMetricsSchema,
  CompletePhaseMetricsSchema,
  ValidationCountsSchema,
  TestingAttemptSchema,
} from '../../../src/schemas/metrics';

describe('Metrics Schemas', () => {
  describe('PhaseMetricsSchema', () => {
    it('validates valid phase metrics', () => {
      const valid = {
        entered_at: '2025-01-01T00:00:00.000Z',
        exited_at: '2025-01-01T01:00:00.000Z',
        duration_ms: 3600000,
      };

      expect(() => PhaseMetricsSchema.parse(valid)).not.toThrow();
    });

    it('allows optional exited_at and duration_ms', () => {
      const valid = {
        entered_at: '2025-01-01T00:00:00.000Z',
      };

      expect(() => PhaseMetricsSchema.parse(valid)).not.toThrow();
    });

    it('rejects invalid datetime', () => {
      const invalid = {
        entered_at: 'not a datetime',
      };

      expect(() => PhaseMetricsSchema.parse(invalid)).toThrow();
    });
  });

  describe('ReviewPhaseMetricsSchema', () => {
    it('validates review phase with iterations', () => {
      const valid = {
        entered_at: '2025-01-01T00:00:00.000Z',
        exited_at: '2025-01-01T01:00:00.000Z',
        duration_ms: 3600000,
        iterations: 2,
      };

      const parsed = ReviewPhaseMetricsSchema.parse(valid);
      expect(parsed.iterations).toBe(2);
    });

    it('defaults iterations to 1', () => {
      const valid = {
        entered_at: '2025-01-01T00:00:00.000Z',
      };

      const parsed = ReviewPhaseMetricsSchema.parse(valid);
      expect(parsed.iterations).toBe(1);
    });
  });

  describe('TestingPhaseMetricsSchema', () => {
    it('validates testing phase with history', () => {
      const valid = {
        entered_at: '2025-01-01T00:00:00.000Z',
        exited_at: '2025-01-01T03:00:00.000Z',
        duration_ms: 10800000,
        iterations: 2,
        fail_count: 1,
        pass_count: 1,
        history: [
          {
            attempt: 1,
            started_at: '2025-01-01T00:00:00.000Z',
            ended_at: '2025-01-01T01:00:00.000Z',
            result: 'fail',
            duration_ms: 3600000,
          },
          {
            attempt: 2,
            started_at: '2025-01-01T02:00:00.000Z',
            ended_at: '2025-01-01T03:00:00.000Z',
            result: 'pass',
            duration_ms: 3600000,
          },
        ],
      };

      const parsed = TestingPhaseMetricsSchema.parse(valid);
      expect(parsed.history).toHaveLength(2);
      expect(parsed.fail_count).toBe(1);
      expect(parsed.pass_count).toBe(1);
    });

    it('defaults counts and history', () => {
      const valid = {
        entered_at: '2025-01-01T00:00:00.000Z',
      };

      const parsed = TestingPhaseMetricsSchema.parse(valid);
      expect(parsed.iterations).toBe(0);
      expect(parsed.fail_count).toBe(0);
      expect(parsed.pass_count).toBe(0);
      expect(parsed.history).toEqual([]);
    });
  });

  describe('TestingAttemptSchema', () => {
    it('validates testing attempt', () => {
      const valid = {
        attempt: 1,
        started_at: '2025-01-01T00:00:00.000Z',
        ended_at: '2025-01-01T01:00:00.000Z',
        result: 'pass',
        duration_ms: 3600000,
      };

      expect(() => TestingAttemptSchema.parse(valid)).not.toThrow();
    });

    it('allows optional fields', () => {
      const valid = {
        attempt: 1,
        started_at: '2025-01-01T00:00:00.000Z',
      };

      expect(() => TestingAttemptSchema.parse(valid)).not.toThrow();
    });

    it('rejects invalid result', () => {
      const invalid = {
        attempt: 1,
        started_at: '2025-01-01T00:00:00.000Z',
        result: 'invalid',
      };

      expect(() => TestingAttemptSchema.parse(invalid)).toThrow();
    });
  });

  describe('CompletePhaseMetricsSchema', () => {
    it('validates complete phase', () => {
      const valid = {
        entered_at: '2025-01-01T00:00:00.000Z',
      };

      expect(() => CompletePhaseMetricsSchema.parse(valid)).not.toThrow();
    });
  });

  describe('ValidationCountsSchema', () => {
    it('validates validation counts', () => {
      const valid = {
        passed: 5,
        failed: 2,
        bypassed: 1,
      };

      expect(() => ValidationCountsSchema.parse(valid)).not.toThrow();
    });

    it('defaults all counts to 0', () => {
      const valid = {};

      const parsed = ValidationCountsSchema.parse(valid);
      expect(parsed.passed).toBe(0);
      expect(parsed.failed).toBe(0);
      expect(parsed.bypassed).toBe(0);
    });
  });

  describe('FeatureMetricsSchema', () => {
    it('validates valid feature metrics', () => {
      const valid = {
        feature_id: '20250101_test-feature',
        title: 'Test Feature',
        type: 'feature',
        created_at: '2025-01-01T00:00:00.000Z',
        completed_at: '2025-01-01T05:00:00.000Z',
        total_duration_ms: 18000000,
        implementation_to_complete_ms: 10800000,
        retry_count: 0,
        phases: {
          created: {
            entered_at: '2025-01-01T00:00:00.000Z',
            exited_at: '2025-01-01T01:00:00.000Z',
            duration_ms: 3600000,
          },
          implementation: {
            entered_at: '2025-01-01T03:00:00.000Z',
            exited_at: '2025-01-01T04:00:00.000Z',
            duration_ms: 3600000,
          },
        },
        validations: {
          passed: 5,
          failed: 0,
          bypassed: 0,
        },
      };

      expect(() => FeatureMetricsSchema.parse(valid)).not.toThrow();
    });

    it('allows optional completed fields', () => {
      const valid = {
        feature_id: '20250101_test-feature',
        title: 'Test Feature',
        type: 'feature',
        created_at: '2025-01-01T00:00:00.000Z',
        retry_count: 0,
        phases: {},
        validations: {
          passed: 0,
          failed: 0,
          bypassed: 0,
        },
      };

      expect(() => FeatureMetricsSchema.parse(valid)).not.toThrow();
    });

    it('rejects invalid type', () => {
      const invalid = {
        feature_id: '20250101_test-feature',
        title: 'Test Feature',
        type: 'invalid',
        created_at: '2025-01-01T00:00:00.000Z',
        retry_count: 0,
        phases: {},
        validations: {
          passed: 0,
          failed: 0,
          bypassed: 0,
        },
      };

      expect(() => FeatureMetricsSchema.parse(invalid)).toThrow();
    });
  });

  describe('AggregatedMetricsSchema', () => {
    it('validates valid aggregated metrics', () => {
      const valid = {
        updated_at: '2025-01-01T00:00:00.000Z',
        totals: {
          done: 10,
          todo: 5,
          by_type: {
            feature: { done: 7, todo: 3 },
            bug: { done: 2, todo: 1 },
            task: { done: 1, todo: 1 },
          },
        },
        averages: {
          total_duration_ms: 18000000,
          implementation_to_complete_ms: 10800000,
          implementation_duration_ms: 3600000,
          testing_iterations: 1.5,
          testing_fail_count: 0.8,
        },
        phase_averages: {
          product_refinement_ms: 1800000,
          tech_spec_ms: 1200000,
          implementation_ms: 3600000,
          review_ms: 5400000,
          testing_ms: 3600000,
        },
      };

      expect(() => AggregatedMetricsSchema.parse(valid)).not.toThrow();
    });

    it('allows optional average fields', () => {
      const valid = {
        updated_at: '2025-01-01T00:00:00.000Z',
        totals: {
          done: 0,
          todo: 5,
          by_type: {
            feature: { done: 0, todo: 3 },
            bug: { done: 0, todo: 1 },
            task: { done: 0, todo: 1 },
          },
        },
        averages: {},
        phase_averages: {},
      };

      expect(() => AggregatedMetricsSchema.parse(valid)).not.toThrow();
    });
  });

  describe('MetricsIndexSchema', () => {
    it('validates valid metrics index', () => {
      const valid = {
        version: '1.0.0',
        last_updated: '2025-01-01T00:00:00.000Z',
        feature_count: 15,
        completed_count: 10,
      };

      expect(() => MetricsIndexSchema.parse(valid)).not.toThrow();
    });

    it('requires all fields', () => {
      const invalid = {
        version: '1.0.0',
        last_updated: '2025-01-01T00:00:00.000Z',
      };

      expect(() => MetricsIndexSchema.parse(invalid)).toThrow();
    });
  });
});
