import { z } from 'zod';

const BaseEventSchema = z.object({
  ts: z.string().datetime(),
  event: z.string(),
  feature_id: z.string().optional(),
});

export const PhaseTransitionEventSchema = BaseEventSchema.extend({
  event: z.literal('phase_transition'),
  feature_id: z.string(),
  from_phase: z.string(),
  to_phase: z.string(),
});

export const ValidationEventSchema = BaseEventSchema.extend({
  event: z.literal('validation'),
  feature_id: z.string(),
  target_phase: z.string(),
  result: z.enum(['passed', 'failed']),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

export const ValidationBypassEventSchema = BaseEventSchema.extend({
  event: z.literal('validation_bypass'),
  feature_id: z.string(),
  target_phase: z.string(),
  errors_ignored: z.array(z.string()),
  warnings_ignored: z.array(z.string()).optional(),
  bypass_method: z.literal('--force'),
});

export const FeatureCreatedEventSchema = BaseEventSchema.extend({
  event: z.literal('feature_created'),
  feature_id: z.string(),
  title: z.string(),
  type: z.enum(['feature', 'bug', 'task']),
});

export const FeatureCompletedEventSchema = BaseEventSchema.extend({
  event: z.literal('feature_completed'),
  feature_id: z.string(),
  total_phases: z.number(),
  retry_count: z.number(),
});

export const SyncEventSchema = BaseEventSchema.extend({
  event: z.literal('sync'),
  client: z.string(),
  commands_synced: z.number(),
  skills_synced: z.number(),
  agents_synced: z.number(),
});

export const RepairEventSchema = BaseEventSchema.extend({
  event: z.literal('repair'),
  feature_id: z.string().optional(),
  issues_found: z.number(),
  issues_fixed: z.number(),
  actions: z.array(z.string()),
});

export const LedgerRecoveryEventSchema = BaseEventSchema.extend({
  event: z.literal('ledger_recovery'),
  recovery_source: z.enum(['backup', 'empty']),
  features_recovered: z.number(),
});

export const InitEventSchema = BaseEventSchema.extend({
  event: z.literal('init'),
  project_id: z.string(),
  project_name: z.string(),
  client: z.string().optional(),
});

export const FeatureBlockedEventSchema = BaseEventSchema.extend({
  event: z.literal('feature_blocked'),
  feature_id: z.string(),
  reason: z.string(),
});

export const FeatureUnblockedEventSchema = BaseEventSchema.extend({
  event: z.literal('feature_unblocked'),
  feature_id: z.string(),
});

export const RetryIncrementedEventSchema = BaseEventSchema.extend({
  event: z.literal('retry_incremented'),
  feature_id: z.string(),
  new_count: z.number(),
});

export const RetryResetEventSchema = BaseEventSchema.extend({
  event: z.literal('retry_reset'),
  feature_id: z.string(),
});

export const HistoryEventSchema = z.discriminatedUnion('event', [
  PhaseTransitionEventSchema,
  ValidationEventSchema,
  ValidationBypassEventSchema,
  FeatureCreatedEventSchema,
  FeatureCompletedEventSchema,
  SyncEventSchema,
  RepairEventSchema,
  LedgerRecoveryEventSchema,
  InitEventSchema,
  FeatureBlockedEventSchema,
  FeatureUnblockedEventSchema,
  RetryIncrementedEventSchema,
  RetryResetEventSchema,
]);

export type HistoryEvent = z.infer<typeof HistoryEventSchema>;
export type PhaseTransitionEvent = z.infer<typeof PhaseTransitionEventSchema>;
export type ValidationEvent = z.infer<typeof ValidationEventSchema>;
export type ValidationBypassEvent = z.infer<typeof ValidationBypassEventSchema>;
export type FeatureCreatedEvent = z.infer<typeof FeatureCreatedEventSchema>;
export type FeatureCompletedEvent = z.infer<typeof FeatureCompletedEventSchema>;
export type SyncEvent = z.infer<typeof SyncEventSchema>;
export type RepairEvent = z.infer<typeof RepairEventSchema>;
export type LedgerRecoveryEvent = z.infer<typeof LedgerRecoveryEventSchema>;
export type InitEvent = z.infer<typeof InitEventSchema>;
export type FeatureBlockedEvent = z.infer<typeof FeatureBlockedEventSchema>;
export type FeatureUnblockedEvent = z.infer<typeof FeatureUnblockedEventSchema>;
export type RetryIncrementedEvent = z.infer<typeof RetryIncrementedEventSchema>;
export type RetryResetEvent = z.infer<typeof RetryResetEventSchema>;
