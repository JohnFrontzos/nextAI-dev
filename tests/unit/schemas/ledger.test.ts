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
  getValidTransitionsForFeature,
  getPhaseFlow,
  getNextPhaseForFeature,
  type Phase,
  type Feature,
} from '../../../src/schemas/ledger';

describe('Ledger Schema', () => {
  describe('PhaseSchema', () => {
    it('accepts valid phases', () => {
      const validPhases = [
        'created',
        'bug_investigation',
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
    it('PHASE_ORDER has 8 phases (includes bug_investigation)', () => {
      expect(PHASE_ORDER.length).toBe(8);
    });

    it("PHASE_ORDER starts with 'created'", () => {
      expect(PHASE_ORDER[0]).toBe('created');
    });

    it("PHASE_ORDER ends with 'complete'", () => {
      expect(PHASE_ORDER[PHASE_ORDER.length - 1]).toBe('complete');
    });

    it('PHASE_ORDER includes bug_investigation', () => {
      expect(PHASE_ORDER).toContain('bug_investigation');
    });

    it('VALID_TRANSITIONS is type-specific (Record<FeatureType, Record<Phase, Phase[]>>)', () => {
      expect(VALID_TRANSITIONS.feature).toBeDefined();
      expect(VALID_TRANSITIONS.bug).toBeDefined();
      expect(VALID_TRANSITIONS.task).toBeDefined();
    });

    it('VALID_TRANSITIONS.feature has correct transitions for created', () => {
      expect(VALID_TRANSITIONS.feature.created).toEqual(['product_refinement']);
    });

    it('VALID_TRANSITIONS.bug has correct transitions for created', () => {
      expect(VALID_TRANSITIONS.bug.created).toEqual(['bug_investigation']);
    });

    it('VALID_TRANSITIONS.task has correct transitions for created', () => {
      expect(VALID_TRANSITIONS.task.created).toEqual(['tech_spec']);
    });

    it('VALID_TRANSITIONS for all types allow review -> testing or implementation', () => {
      expect(VALID_TRANSITIONS.feature.review).toContain('testing');
      expect(VALID_TRANSITIONS.feature.review).toContain('implementation');
      expect(VALID_TRANSITIONS.bug.review).toContain('testing');
      expect(VALID_TRANSITIONS.bug.review).toContain('implementation');
      expect(VALID_TRANSITIONS.task.review).toContain('testing');
      expect(VALID_TRANSITIONS.task.review).toContain('implementation');
    });

    it('VALID_TRANSITIONS complete is empty for all types', () => {
      expect(VALID_TRANSITIONS.feature.complete).toEqual([]);
      expect(VALID_TRANSITIONS.bug.complete).toEqual([]);
      expect(VALID_TRANSITIONS.task.complete).toEqual([]);
    });
  });

  describe('Type-Specific Workflow Helpers', () => {
    describe('getValidTransitionsForFeature', () => {
      it('returns type-specific transitions for feature type', () => {
        const feature: Feature = createFeature('feature-id', 'Feature', 'feature');
        feature.phase = 'created';

        const transitions = getValidTransitionsForFeature(feature);
        expect(transitions).toEqual(['product_refinement']);
      });

      it('returns type-specific transitions for bug type', () => {
        const bug: Feature = createFeature('bug-id', 'Bug', 'bug');
        bug.phase = 'created';

        const transitions = getValidTransitionsForFeature(bug);
        expect(transitions).toEqual(['bug_investigation']);
      });

      it('returns correct transitions for bug type at bug_investigation phase', () => {
        const bug: Feature = createFeature('bug-id', 'Bug', 'bug');
        bug.phase = 'bug_investigation';

        const transitions = getValidTransitionsForFeature(bug);
        expect(transitions).toEqual(['product_refinement']);
      });

      it('returns correct transitions for task type (skips product_refinement)', () => {
        const task: Feature = createFeature('task-id', 'Task', 'task');
        task.phase = 'created';

        const transitions = getValidTransitionsForFeature(task);
        expect(transitions).toEqual(['tech_spec']);
      });
    });

    describe('getPhaseFlow', () => {
      it('returns correct 7-phase sequence for feature type', () => {
        const flow = getPhaseFlow('feature');
        expect(flow).toEqual([
          'created',
          'product_refinement',
          'tech_spec',
          'implementation',
          'review',
          'testing',
          'complete',
        ]);
        expect(flow.length).toBe(7);
      });

      it('returns correct 8-phase sequence for bug type (includes bug_investigation)', () => {
        const flow = getPhaseFlow('bug');
        expect(flow).toEqual([
          'created',
          'bug_investigation',
          'product_refinement',
          'tech_spec',
          'implementation',
          'review',
          'testing',
          'complete',
        ]);
        expect(flow.length).toBe(8);
      });

      it('returns correct 6-phase sequence for task type (skips product_refinement)', () => {
        const flow = getPhaseFlow('task');
        expect(flow).toEqual([
          'created',
          'tech_spec',
          'implementation',
          'review',
          'testing',
          'complete',
        ]);
        expect(flow.length).toBe(6);
      });
    });

    describe('getNextPhaseForFeature', () => {
      it('returns correct next phase for feature types', () => {
        const feature: Feature = createFeature('feature-id', 'Feature', 'feature');
        feature.phase = 'created';

        expect(getNextPhaseForFeature(feature)).toBe('product_refinement');
      });

      it('returns correct next phase for bug types', () => {
        const bug: Feature = createFeature('bug-id', 'Bug', 'bug');
        bug.phase = 'created';

        expect(getNextPhaseForFeature(bug)).toBe('bug_investigation');
      });

      it('returns correct next phase for task types', () => {
        const task: Feature = createFeature('task-id', 'Task', 'task');
        task.phase = 'created';

        expect(getNextPhaseForFeature(task)).toBe('tech_spec');
      });

      it('returns null for phases with multiple transitions', () => {
        const feature: Feature = createFeature('feature-id', 'Feature', 'feature');
        feature.phase = 'review'; // review has two options: testing or implementation

        expect(getNextPhaseForFeature(feature)).toBeNull();
      });

      it('returns null for complete phase', () => {
        const feature: Feature = createFeature('feature-id', 'Feature', 'feature');
        feature.phase = 'complete';

        expect(getNextPhaseForFeature(feature)).toBeNull();
      });
    });
  });
});
