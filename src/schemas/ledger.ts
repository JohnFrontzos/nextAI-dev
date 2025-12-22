import { z } from 'zod';

export const PhaseSchema = z.enum([
  'created',
  'bug_investigation',
  'product_refinement',
  'tech_spec',
  'implementation',
  'review',
  'testing',
  'complete',
]);

export type Phase = z.infer<typeof PhaseSchema>;

export const PHASE_ORDER: Phase[] = [
  'created',
  'bug_investigation',
  'product_refinement',
  'tech_spec',
  'implementation',
  'review',
  'testing',
  'complete',
];

// Type-specific phase transitions (SINGLE SOURCE OF TRUTH)
export const VALID_TRANSITIONS: Record<FeatureType, Record<Phase, Phase[]>> = {
  feature: {
    created: ['product_refinement'],
    bug_investigation: [], // Not used by features
    product_refinement: ['tech_spec'],
    tech_spec: ['implementation'],
    implementation: ['review'],
    review: ['testing', 'implementation'],
    testing: ['complete', 'implementation'],
    complete: [],
  },
  bug: {
    created: ['bug_investigation'],
    bug_investigation: ['product_refinement'],
    product_refinement: ['tech_spec'],
    tech_spec: ['implementation'],
    implementation: ['review'],
    review: ['testing', 'implementation'],
    testing: ['complete', 'implementation'],
    complete: [],
  },
  task: {
    created: ['tech_spec'],
    bug_investigation: [], // Not used by tasks
    product_refinement: [], // Not used by tasks
    tech_spec: ['implementation'],
    implementation: ['review'],
    review: ['testing', 'implementation'],
    testing: ['complete', 'implementation'],
    complete: [],
  },
};

export const FeatureTypeSchema = z.enum(['feature', 'bug', 'task']);

export type FeatureType = z.infer<typeof FeatureTypeSchema>;

export const FeatureSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: FeatureTypeSchema,
  external_id: z.string().optional(),

  // State
  phase: PhaseSchema,
  blocked_reason: z.string().nullable(),
  retry_count: z.number().default(0),

  // Timestamps
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Feature = z.infer<typeof FeatureSchema>;

export const LedgerSchema = z.object({
  features: z.array(FeatureSchema),
});

export type Ledger = z.infer<typeof LedgerSchema>;

export const createFeature = (
  id: string,
  title: string,
  type: FeatureType = 'feature',
  externalId?: string
): Feature => {
  const now = new Date().toISOString();
  return {
    id,
    title,
    type,
    external_id: externalId,
    phase: 'created',
    blocked_reason: null,
    retry_count: 0,
    created_at: now,
    updated_at: now,
  };
};

export const emptyLedger = (): Ledger => ({
  features: [],
});

/**
 * Generate a feature ID in the format: YYYYMMDD_short-slug
 * Simple approach: slugify title and cap at 30 chars
 */
export function generateFeatureId(title: string, date: Date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30)
    .replace(/-+$/, ''); // Remove trailing dashes

  return `${dateStr}_${slug}`;
}

/**
 * Type-aware helper: get phase sequence for a type
 */
export function getPhaseFlow(type: FeatureType): Phase[] {
  switch (type) {
    case 'feature':
      return [
        'created',
        'product_refinement',
        'tech_spec',
        'implementation',
        'review',
        'testing',
        'complete',
      ];
    case 'bug':
      return [
        'created',
        'bug_investigation',
        'product_refinement',
        'tech_spec',
        'implementation',
        'review',
        'testing',
        'complete',
      ];
    case 'task':
      return [
        'created',
        'tech_spec',
        'implementation',
        'review',
        'testing',
        'complete',
      ];
  }
}

/**
 * Type-aware helper: get next phase for a feature
 * Returns null if multiple transitions exist or phase is complete
 */
export function getNextPhaseForFeature(feature: Feature): Phase | null {
  const validTransitions = VALID_TRANSITIONS[feature.type][feature.phase];
  if (validTransitions.length === 0) return null;
  if (validTransitions.length === 1) return validTransitions[0];
  // Multiple transitions (e.g., review can go to testing or back to implementation)
  // Caller must decide based on context (review pass/fail)
  return null;
}

/**
 * Helper to get valid transitions for a feature (type-specific)
 */
export function getValidTransitionsForFeature(feature: Feature): Phase[] {
  // Type-specific workflow
  return VALID_TRANSITIONS[feature.type][feature.phase] || [];
}
