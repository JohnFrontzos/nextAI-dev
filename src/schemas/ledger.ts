import { z } from 'zod';

export const PhaseSchema = z.enum([
  'created',
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
  'product_refinement',
  'tech_spec',
  'implementation',
  'review',
  'testing',
  'complete',
];

export const VALID_TRANSITIONS: Record<Phase, Phase[]> = {
  created: ['product_refinement'],
  product_refinement: ['tech_spec'],
  tech_spec: ['implementation'],
  implementation: ['review'],
  review: ['testing', 'implementation'], // testing on PASS, implementation on FAIL
  testing: ['complete', 'implementation'], // complete on PASS, implementation on FAIL
  complete: [], // Terminal state
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
 * Generate a feature ID in the format: YYYYMMDD_slug-from-title
 */
export function generateFeatureId(title: string, date: Date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50); // Max 50 chars for slug
  return `${dateStr}_${slug}`;
}
