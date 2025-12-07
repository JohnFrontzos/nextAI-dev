import type { Feature } from '../../src/schemas/ledger';

export const validFeature: Feature = {
  id: '20251206_test-feature',
  title: 'Test Feature',
  type: 'feature',
  phase: 'created',
  blocked_reason: null,
  retry_count: 0,
  created_at: '2025-12-06T10:00:00.000Z',
  updated_at: '2025-12-06T10:00:00.000Z'
};

export const blockedFeature: Feature = {
  ...validFeature,
  id: '20251206_blocked-feature',
  title: 'Blocked Feature',
  blocked_reason: 'Waiting for design approval'
};

export const inReviewFeature: Feature = {
  ...validFeature,
  id: '20251206_in-review-feature',
  title: 'In Review Feature',
  phase: 'review',
  retry_count: 2
};

export const inImplementationFeature: Feature = {
  ...validFeature,
  id: '20251206_implementation-feature',
  title: 'Implementation Feature',
  phase: 'implementation'
};

export const inTestingFeature: Feature = {
  ...validFeature,
  id: '20251206_testing-feature',
  title: 'Testing Feature',
  phase: 'testing'
};

export const completedFeature: Feature = {
  ...validFeature,
  id: '20251206_completed-feature',
  title: 'Completed Feature',
  phase: 'complete'
};

export const bugFeature: Feature = {
  ...validFeature,
  id: '20251206_bug-fix',
  title: 'Bug Fix',
  type: 'bug'
};

export const taskFeature: Feature = {
  ...validFeature,
  id: '20251206_task',
  title: 'Task Item',
  type: 'task'
};

export const featureWithExternalId: Feature = {
  ...validFeature,
  id: '20251206_jira-feature',
  title: 'JIRA Feature',
  external_id: 'JIRA-123'
};

export const featureWithRetries: Feature = {
  ...validFeature,
  id: '20251206_retry-feature',
  title: 'Retry Feature',
  phase: 'implementation',
  retry_count: 3
};

// Create a feature in each phase for comprehensive testing
export const featuresByPhase = {
  created: validFeature,
  product_refinement: {
    ...validFeature,
    id: '20251206_product-refinement',
    title: 'Product Refinement Feature',
    phase: 'product_refinement' as const
  },
  tech_spec: {
    ...validFeature,
    id: '20251206_tech-spec',
    title: 'Tech Spec Feature',
    phase: 'tech_spec' as const
  },
  implementation: inImplementationFeature,
  review: inReviewFeature,
  testing: inTestingFeature,
  complete: completedFeature
};
