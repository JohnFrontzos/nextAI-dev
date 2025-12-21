import { z } from 'zod';

// Phase metrics entry
export const PhaseMetricsSchema = z.object({
  entered_at: z.string().datetime(),
  exited_at: z.string().datetime().optional(),
  duration_ms: z.number().optional(),
});

export type PhaseMetrics = z.infer<typeof PhaseMetricsSchema>;

// Review phase metrics (with iteration tracking)
export const ReviewPhaseMetricsSchema = PhaseMetricsSchema.extend({
  iterations: z.number().default(1),
});

export type ReviewPhaseMetrics = z.infer<typeof ReviewPhaseMetricsSchema>;

// Testing attempt schema
export const TestingAttemptSchema = z.object({
  attempt: z.number(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().optional(),
  result: z.enum(['pass', 'fail']).optional(),
  duration_ms: z.number().optional(),
});

export type TestingAttempt = z.infer<typeof TestingAttemptSchema>;

// Testing phase metrics (with PASS/FAIL history)
export const TestingPhaseMetricsSchema = PhaseMetricsSchema.extend({
  iterations: z.number().default(0),
  fail_count: z.number().default(0),
  pass_count: z.number().default(0),
  history: z.array(TestingAttemptSchema).default([]),
});

export type TestingPhaseMetrics = z.infer<typeof TestingPhaseMetricsSchema>;

// Complete phase metrics
export const CompletePhaseMetricsSchema = z.object({
  entered_at: z.string().datetime(),
});

export type CompletePhaseMetrics = z.infer<typeof CompletePhaseMetricsSchema>;

// Validation counts
export const ValidationCountsSchema = z.object({
  passed: z.number().default(0),
  failed: z.number().default(0),
  bypassed: z.number().default(0),
});

export type ValidationCounts = z.infer<typeof ValidationCountsSchema>;

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
  validations: ValidationCountsSchema,
});

export type FeatureMetrics = z.infer<typeof FeatureMetricsSchema>;

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

export type AggregatedMetrics = z.infer<typeof AggregatedMetricsSchema>;

// Index catalog
export const MetricsIndexSchema = z.object({
  version: z.string(),
  last_updated: z.string().datetime(),
  feature_count: z.number(),
  completed_count: z.number(),
});

export type MetricsIndex = z.infer<typeof MetricsIndexSchema>;
