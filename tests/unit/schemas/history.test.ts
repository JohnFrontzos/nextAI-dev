import { describe, it, expect } from 'vitest';
import {
  HistoryEventSchema,
  PhaseTransitionEventSchema,
  ValidationEventSchema,
  ValidationBypassEventSchema,
  FeatureCreatedEventSchema,
  FeatureCompletedEventSchema,
  SyncEventSchema,
  RepairEventSchema,
  InitEventSchema,
  FeatureBlockedEventSchema,
  RetryIncrementedEventSchema,
} from '../../../src/schemas/history';

describe('History Schema', () => {
  const timestamp = '2025-12-06T10:00:00.000Z';

  describe('PhaseTransitionEventSchema', () => {
    it('accepts valid phase_transition event', () => {
      const event = {
        ts: timestamp,
        event: 'phase_transition',
        feature_id: 'test-feature',
        from_phase: 'created',
        to_phase: 'product_refinement',
      };
      expect(() => PhaseTransitionEventSchema.parse(event)).not.toThrow();
    });

    it('requires from_phase and to_phase', () => {
      const missingFromPhase = {
        ts: timestamp,
        event: 'phase_transition',
        feature_id: 'test-feature',
        to_phase: 'product_refinement',
      };
      expect(() => PhaseTransitionEventSchema.parse(missingFromPhase)).toThrow();

      const missingToPhase = {
        ts: timestamp,
        event: 'phase_transition',
        feature_id: 'test-feature',
        from_phase: 'created',
      };
      expect(() => PhaseTransitionEventSchema.parse(missingToPhase)).toThrow();
    });
  });

  describe('ValidationEventSchema', () => {
    it('accepts valid validation event', () => {
      const event = {
        ts: timestamp,
        event: 'validation',
        feature_id: 'test-feature',
        target_phase: 'product_refinement',
        result: 'passed',
        errors: [],
        warnings: [],
      };
      expect(() => ValidationEventSchema.parse(event)).not.toThrow();
    });

    it('validates result enum', () => {
      const invalidResult = {
        ts: timestamp,
        event: 'validation',
        feature_id: 'test-feature',
        target_phase: 'product_refinement',
        result: 'unknown',
      };
      expect(() => ValidationEventSchema.parse(invalidResult)).toThrow();
    });

    it('accepts passed and failed results', () => {
      const passed = {
        ts: timestamp,
        event: 'validation',
        feature_id: 'test-feature',
        target_phase: 'product_refinement',
        result: 'passed',
      };
      expect(() => ValidationEventSchema.parse(passed)).not.toThrow();

      const failed = {
        ts: timestamp,
        event: 'validation',
        feature_id: 'test-feature',
        target_phase: 'product_refinement',
        result: 'failed',
        errors: ['Error 1'],
      };
      expect(() => ValidationEventSchema.parse(failed)).not.toThrow();
    });
  });

  describe('ValidationBypassEventSchema', () => {
    it('accepts valid validation_bypass event', () => {
      const event = {
        ts: timestamp,
        event: 'validation_bypass',
        feature_id: 'test-feature',
        feature_type: 'feature',
        target_phase: 'product_refinement',
        errors_ignored: ['Error 1'],
        warnings_ignored: [],
        bypass_method: '--force',
      };
      expect(() => ValidationBypassEventSchema.parse(event)).not.toThrow();
    });

    it('requires bypass_method to be --force', () => {
      const invalidMethod = {
        ts: timestamp,
        event: 'validation_bypass',
        feature_id: 'test-feature',
        feature_type: 'feature',
        target_phase: 'product_refinement',
        errors_ignored: [],
        bypass_method: '--skip',
      };
      expect(() => ValidationBypassEventSchema.parse(invalidMethod)).toThrow();
    });
  });

  describe('FeatureCreatedEventSchema', () => {
    it('accepts valid feature_created event', () => {
      const event = {
        ts: timestamp,
        event: 'feature_created',
        feature_id: 'test-feature',
        title: 'Test Feature',
        type: 'feature',
      };
      expect(() => FeatureCreatedEventSchema.parse(event)).not.toThrow();
    });

    it('validates type enum', () => {
      for (const type of ['feature', 'bug', 'task']) {
        const event = {
          ts: timestamp,
          event: 'feature_created',
          feature_id: 'test-feature',
          title: 'Test',
          type,
        };
        expect(() => FeatureCreatedEventSchema.parse(event)).not.toThrow();
      }

      const invalidType = {
        ts: timestamp,
        event: 'feature_created',
        feature_id: 'test-feature',
        title: 'Test',
        type: 'epic',
      };
      expect(() => FeatureCreatedEventSchema.parse(invalidType)).toThrow();
    });
  });

  describe('FeatureCompletedEventSchema', () => {
    it('accepts valid feature_completed event', () => {
      const event = {
        ts: timestamp,
        event: 'feature_completed',
        feature_id: 'test-feature',
        total_phases: 7,
        retry_count: 2,
      };
      expect(() => FeatureCompletedEventSchema.parse(event)).not.toThrow();
    });
  });

  describe('SyncEventSchema', () => {
    it('accepts valid sync event', () => {
      const event = {
        ts: timestamp,
        event: 'sync',
        client: 'claude',
        commands_synced: 5,
        skills_synced: 3,
        agents_synced: 7,
      };
      expect(() => SyncEventSchema.parse(event)).not.toThrow();
    });
  });

  describe('RepairEventSchema', () => {
    it('accepts valid repair event', () => {
      const event = {
        ts: timestamp,
        event: 'repair',
        feature_id: 'test-feature',
        issues_found: 2,
        issues_fixed: 1,
        actions: ['Fixed ledger entry', 'Regenerated config'],
      };
      expect(() => RepairEventSchema.parse(event)).not.toThrow();
    });

    it('allows optional feature_id', () => {
      const event = {
        ts: timestamp,
        event: 'repair',
        issues_found: 0,
        issues_fixed: 0,
        actions: [],
      };
      expect(() => RepairEventSchema.parse(event)).not.toThrow();
    });
  });

  describe('InitEventSchema', () => {
    it('accepts valid init event', () => {
      const event = {
        ts: timestamp,
        event: 'init',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'Test Project',
        client: 'claude',
      };
      expect(() => InitEventSchema.parse(event)).not.toThrow();
    });

    it('allows optional client', () => {
      const event = {
        ts: timestamp,
        event: 'init',
        project_id: '550e8400-e29b-41d4-a716-446655440000',
        project_name: 'Test Project',
      };
      expect(() => InitEventSchema.parse(event)).not.toThrow();
    });
  });

  describe('FeatureBlockedEventSchema', () => {
    it('accepts valid feature_blocked event', () => {
      const event = {
        ts: timestamp,
        event: 'feature_blocked',
        feature_id: 'test-feature',
        reason: 'Waiting for design approval',
      };
      expect(() => FeatureBlockedEventSchema.parse(event)).not.toThrow();
    });
  });

  describe('RetryIncrementedEventSchema', () => {
    it('accepts valid retry_incremented event', () => {
      const event = {
        ts: timestamp,
        event: 'retry_incremented',
        feature_id: 'test-feature',
        new_count: 3,
      };
      expect(() => RetryIncrementedEventSchema.parse(event)).not.toThrow();
    });
  });

  describe('HistoryEventSchema (discriminated union)', () => {
    it('accepts all valid event types', () => {
      const events = [
        {
          ts: timestamp,
          event: 'phase_transition',
          feature_id: 'test',
          from_phase: 'created',
          to_phase: 'product_refinement',
        },
        {
          ts: timestamp,
          event: 'validation',
          feature_id: 'test',
          target_phase: 'product_refinement',
          result: 'passed',
        },
        {
          ts: timestamp,
          event: 'validation_bypass',
          feature_id: 'test',
          feature_type: 'feature',
          target_phase: 'product_refinement',
          errors_ignored: [],
          bypass_method: '--force',
        },
        {
          ts: timestamp,
          event: 'feature_created',
          feature_id: 'test',
          title: 'Test',
          type: 'feature',
        },
        {
          ts: timestamp,
          event: 'feature_completed',
          feature_id: 'test',
          total_phases: 7,
          retry_count: 0,
        },
        {
          ts: timestamp,
          event: 'sync',
          client: 'claude',
          commands_synced: 0,
          skills_synced: 0,
          agents_synced: 0,
        },
        {
          ts: timestamp,
          event: 'repair',
          issues_found: 0,
          issues_fixed: 0,
          actions: [],
        },
        {
          ts: timestamp,
          event: 'init',
          project_id: 'test-id',
          project_name: 'Test',
        },
        {
          ts: timestamp,
          event: 'feature_blocked',
          feature_id: 'test',
          reason: 'Blocked',
        },
        {
          ts: timestamp,
          event: 'feature_unblocked',
          feature_id: 'test',
        },
        {
          ts: timestamp,
          event: 'retry_incremented',
          feature_id: 'test',
          new_count: 1,
        },
        {
          ts: timestamp,
          event: 'retry_reset',
          feature_id: 'test',
        },
      ];

      for (const event of events) {
        expect(() => HistoryEventSchema.parse(event)).not.toThrow();
      }
    });

    it('rejects unknown event type', () => {
      const unknownEvent = {
        ts: timestamp,
        event: 'unknown',
        feature_id: 'test',
      };
      expect(() => HistoryEventSchema.parse(unknownEvent)).toThrow();
    });
  });
});
