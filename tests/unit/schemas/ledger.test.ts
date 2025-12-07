import { describe, it, expect } from 'vitest';
import {
  PhaseSchema,
  FeatureTypeSchema,
  FeatureSchema,
  LedgerSchema,
  PHASE_ORDER,
  VALID_TRANSITIONS,
  createFeature,
  emptyLedger,
  generateFeatureId,
  type Phase,
} from '../../../src/schemas/ledger';

describe('Ledger Schema', () => {
  describe('PhaseSchema', () => {
    it('accepts valid phases', () => {
      const validPhases = [
        'created',
        'product_refinement',
        'tech_spec',
        'implementation',
        'review',
        'testing',
        'complete',
      ];

      for (const phase of validPhases) {
        expect(() => PhaseSchema.parse(phase)).not.toThrow();
      }
    });

    it('rejects invalid phases', () => {
      const invalidPhases = ['invalid', 'draft', '', 'CREATED', 'done'];

      for (const phase of invalidPhases) {
        expect(() => PhaseSchema.parse(phase)).toThrow();
      }
    });
  });

  describe('FeatureTypeSchema', () => {
    it('accepts valid types', () => {
      expect(() => FeatureTypeSchema.parse('feature')).not.toThrow();
      expect(() => FeatureTypeSchema.parse('bug')).not.toThrow();
      expect(() => FeatureTypeSchema.parse('task')).not.toThrow();
    });

    it('rejects invalid types', () => {
      expect(() => FeatureTypeSchema.parse('epic')).toThrow();
      expect(() => FeatureTypeSchema.parse('story')).toThrow();
      expect(() => FeatureTypeSchema.parse('')).toThrow();
    });
  });

  describe('FeatureSchema', () => {
    const validFeature = {
      id: '20251206_test-feature',
      title: 'Test Feature',
      type: 'feature',
      phase: 'created',
      blocked_reason: null,
      retry_count: 0,
      created_at: '2025-12-06T10:00:00.000Z',
      updated_at: '2025-12-06T10:00:00.000Z',
    };

    it('accepts complete feature', () => {
      expect(() => FeatureSchema.parse(validFeature)).not.toThrow();
    });

    it('requires all mandatory fields', () => {
      const missingId = { ...validFeature };
      delete (missingId as Record<string, unknown>).id;
      expect(() => FeatureSchema.parse(missingId)).toThrow();

      const missingTitle = { ...validFeature };
      delete (missingTitle as Record<string, unknown>).title;
      expect(() => FeatureSchema.parse(missingTitle)).toThrow();

      const missingPhase = { ...validFeature };
      delete (missingPhase as Record<string, unknown>).phase;
      expect(() => FeatureSchema.parse(missingPhase)).toThrow();
    });

    it('allows optional external_id', () => {
      const withoutExternalId = { ...validFeature };
      delete (withoutExternalId as Record<string, unknown>).external_id;
      expect(() => FeatureSchema.parse(withoutExternalId)).not.toThrow();

      const withExternalId = { ...validFeature, external_id: 'JIRA-123' };
      expect(() => FeatureSchema.parse(withExternalId)).not.toThrow();
    });

    it('validates blocked_reason nullable', () => {
      expect(() => FeatureSchema.parse({ ...validFeature, blocked_reason: null })).not.toThrow();
      expect(() => FeatureSchema.parse({ ...validFeature, blocked_reason: 'some reason' })).not.toThrow();
    });
  });

  describe('LedgerSchema', () => {
    it('accepts valid ledger', () => {
      const ledger = {
        features: [
          {
            id: '20251206_test',
            title: 'Test',
            type: 'feature',
            phase: 'created',
            blocked_reason: null,
            retry_count: 0,
            created_at: '2025-12-06T10:00:00.000Z',
            updated_at: '2025-12-06T10:00:00.000Z',
          },
        ],
      };
      expect(() => LedgerSchema.parse(ledger)).not.toThrow();
    });

    it('accepts empty features array', () => {
      expect(() => LedgerSchema.parse({ features: [] })).not.toThrow();
    });
  });

  describe('Helper Functions', () => {
    describe('createFeature', () => {
      it('returns valid Feature', () => {
        const feature = createFeature('test-id', 'Test Title');
        expect(feature.id).toBe('test-id');
        expect(feature.title).toBe('Test Title');
        expect(feature.phase).toBe('created');
        expect(feature.retry_count).toBe(0);
        expect(feature.blocked_reason).toBeNull();
      });

      it('sets timestamps', () => {
        const before = new Date().toISOString();
        const feature = createFeature('id', 'title');
        const after = new Date().toISOString();

        expect(feature.created_at).toBeDefined();
        expect(feature.updated_at).toBeDefined();
        expect(feature.created_at >= before).toBe(true);
        expect(feature.created_at <= after).toBe(true);
      });

      it('accepts optional type', () => {
        const bug = createFeature('id', 'title', 'bug');
        expect(bug.type).toBe('bug');

        const task = createFeature('id', 'title', 'task');
        expect(task.type).toBe('task');
      });

      it('accepts optional external_id', () => {
        const feature = createFeature('id', 'title', 'feature', 'JIRA-123');
        expect(feature.external_id).toBe('JIRA-123');
      });
    });

    describe('emptyLedger', () => {
      it('returns correct structure', () => {
        const ledger = emptyLedger();
        expect(ledger).toEqual({ features: [] });
      });
    });

    describe('generateFeatureId', () => {
      it('formats correctly', () => {
        const date = new Date('2025-01-15');
        const id = generateFeatureId('Add User Auth', date);
        expect(id).toBe('20250115_add-user-auth');
      });

      it('handles special chars', () => {
        const date = new Date('2025-01-15');
        const id = generateFeatureId('Fix @#$% Bug!', date);
        // Special chars removed, spaces become hyphens, consecutive spaces collapse
        expect(id).toBe('20250115_fix-bug');
      });

      it('truncates long titles', () => {
        const longTitle = 'a'.repeat(100);
        const date = new Date('2025-01-15');
        const id = generateFeatureId(longTitle, date);
        // YYYYMMDD_ = 9 chars, slug = max 50 chars
        expect(id.length).toBeLessThanOrEqual(9 + 50);
      });

      it('uses custom date', () => {
        const customDate = new Date('2025-01-15');
        const id = generateFeatureId('title', customDate);
        expect(id).toBe('20250115_title');
      });

      it('uses current date by default', () => {
        const id = generateFeatureId('test');
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        expect(id.startsWith(today)).toBe(true);
      });
    });
  });

  describe('Constants Validation', () => {
    it('PHASE_ORDER has 7 phases', () => {
      expect(PHASE_ORDER.length).toBe(7);
    });

    it("PHASE_ORDER starts with 'created'", () => {
      expect(PHASE_ORDER[0]).toBe('created');
    });

    it("PHASE_ORDER ends with 'complete'", () => {
      expect(PHASE_ORDER[PHASE_ORDER.length - 1]).toBe('complete');
    });

    it("VALID_TRANSITIONS['created'] allows only 'product_refinement'", () => {
      expect(VALID_TRANSITIONS['created']).toEqual(['product_refinement']);
    });

    it("VALID_TRANSITIONS['review'] allows 'testing' and 'implementation'", () => {
      expect(VALID_TRANSITIONS['review']).toContain('testing');
      expect(VALID_TRANSITIONS['review']).toContain('implementation');
    });

    it("VALID_TRANSITIONS['complete'] is empty", () => {
      expect(VALID_TRANSITIONS['complete']).toEqual([]);
    });

    it('all phases have transition entries', () => {
      for (const phase of PHASE_ORDER) {
        expect(VALID_TRANSITIONS[phase as Phase]).toBeDefined();
      }
    });
  });
});
