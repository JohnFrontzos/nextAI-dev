import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  readHistory,
  getFeatureHistory,
  getValidationBypasses,
  logValidationBypass,
  logValidation,
  logSync,
  logRepair,
  logInit,
} from '../../../../src/core/state/history';
import {
  createTestProject,
  initNextAIStructure,
  type TestContext,
} from '../../../helpers/test-utils';

describe('History Operations', () => {
  let testContext: TestContext;
  let historyPath: string;

  beforeEach(() => {
    testContext = createTestProject();
    initNextAIStructure(testContext.projectRoot);
    historyPath = path.join(testContext.projectRoot, '.nextai', 'state', 'history.log');
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('logValidation()', () => {
    it('appends to history.log', () => {
      logValidation(testContext.projectRoot, 'test-feature', 'product_refinement', 'passed');

      const content = fs.readFileSync(historyPath, 'utf-8');
      expect(content.trim()).not.toBe('');
    });

    it('includes all fields', () => {
      logValidation(
        testContext.projectRoot,
        'test-feature',
        'product_refinement',
        'passed',
        [],
        ['Warning 1']
      );

      const events = readHistory(testContext.projectRoot);
      const validationEvent = events.find((e) => e.event === 'validation');

      expect(validationEvent).toBeDefined();
      expect(validationEvent?.feature_id).toBe('test-feature');
      expect(validationEvent?.event).toBe('validation');
      if (validationEvent?.event === 'validation') {
        expect(validationEvent.target_phase).toBe('product_refinement');
        expect(validationEvent.result).toBe('passed');
        expect(validationEvent.warnings).toEqual(['Warning 1']);
      }
    });

    it('creates history.log if missing', () => {
      fs.unlinkSync(historyPath);
      expect(fs.existsSync(historyPath)).toBe(false);

      logValidation(testContext.projectRoot, 'test-feature', 'product_refinement', 'passed');

      expect(fs.existsSync(historyPath)).toBe(true);
    });
  });

  describe('logValidationBypass()', () => {
    it('logs bypass event', () => {
      logValidationBypass(
        testContext.projectRoot,
        'test-feature',
        'feature',
        'product_refinement',
        ['Error 1', 'Error 2']
      );

      const events = readHistory(testContext.projectRoot);
      const bypassEvent = events.find((e) => e.event === 'validation_bypass');

      expect(bypassEvent).toBeDefined();
      expect(bypassEvent?.event).toBe('validation_bypass');
    });

    it('includes bypass_method', () => {
      logValidationBypass(testContext.projectRoot, 'test-feature', 'feature', 'product_refinement', []);

      const events = readHistory(testContext.projectRoot);
      const bypassEvent = events.find((e) => e.event === 'validation_bypass');

      if (bypassEvent?.event === 'validation_bypass') {
        expect(bypassEvent.bypass_method).toBe('--force');
      }
    });

    it('includes errors_ignored', () => {
      logValidationBypass(
        testContext.projectRoot,
        'test-feature',
        'feature',
        'product_refinement',
        ['Error 1', 'Error 2'],
        ['Warning 1']
      );

      const events = readHistory(testContext.projectRoot);
      const bypassEvent = events.find((e) => e.event === 'validation_bypass');

      if (bypassEvent?.event === 'validation_bypass') {
        expect(bypassEvent.errors_ignored).toEqual(['Error 1', 'Error 2']);
        expect(bypassEvent.warnings_ignored).toEqual(['Warning 1']);
        expect(bypassEvent.feature_type).toEqual('feature');
      }
    });
  });

  describe('logSync()', () => {
    it('logs sync event', () => {
      logSync(testContext.projectRoot, 'claude', 5, 3, 7);

      const events = readHistory(testContext.projectRoot);
      const syncEvent = events.find((e) => e.event === 'sync');

      expect(syncEvent).toBeDefined();
      if (syncEvent?.event === 'sync') {
        expect(syncEvent.client).toBe('claude');
        expect(syncEvent.commands_synced).toBe(5);
        expect(syncEvent.skills_synced).toBe(3);
        expect(syncEvent.agents_synced).toBe(7);
      }
    });
  });

  describe('logRepair()', () => {
    it('logs repair event', () => {
      logRepair(testContext.projectRoot, 'test-feature', 2, 1, ['Fixed ledger']);

      const events = readHistory(testContext.projectRoot);
      const repairEvent = events.find((e) => e.event === 'repair');

      expect(repairEvent).toBeDefined();
      if (repairEvent?.event === 'repair') {
        expect(repairEvent.feature_id).toBe('test-feature');
        expect(repairEvent.issues_found).toBe(2);
        expect(repairEvent.issues_fixed).toBe(1);
        expect(repairEvent.actions).toEqual(['Fixed ledger']);
      }
    });

    it('allows undefined feature_id', () => {
      logRepair(testContext.projectRoot, undefined, 0, 0, []);

      const events = readHistory(testContext.projectRoot);
      const repairEvent = events.find((e) => e.event === 'repair');

      expect(repairEvent).toBeDefined();
      if (repairEvent?.event === 'repair') {
        expect(repairEvent.feature_id).toBeUndefined();
      }
    });
  });

  describe('logInit()', () => {
    it('logs init event', () => {
      logInit(testContext.projectRoot, 'project-123', 'My Project', 'claude');

      const events = readHistory(testContext.projectRoot);
      const initEvent = events.find((e) => e.event === 'init');

      expect(initEvent).toBeDefined();
      if (initEvent?.event === 'init') {
        expect(initEvent.project_id).toBe('project-123');
        expect(initEvent.project_name).toBe('My Project');
        expect(initEvent.client).toBe('claude');
      }
    });

    it('allows optional client', () => {
      logInit(testContext.projectRoot, 'project-123', 'My Project');

      const events = readHistory(testContext.projectRoot);
      const initEvent = events.find((e) => e.event === 'init');

      if (initEvent?.event === 'init') {
        expect(initEvent.client).toBeUndefined();
      }
    });
  });

  describe('readHistory()', () => {
    it('returns all events', () => {
      logValidation(testContext.projectRoot, 'f1', 'created', 'passed');
      logValidation(testContext.projectRoot, 'f2', 'created', 'failed');
      logSync(testContext.projectRoot, 'claude', 1, 2, 3);

      const events = readHistory(testContext.projectRoot);
      expect(events.length).toBe(3);
    });

    it('returns empty array for missing file', () => {
      fs.unlinkSync(historyPath);
      const events = readHistory(testContext.projectRoot);
      expect(events).toEqual([]);
    });

    it('history file is JSONL format', () => {
      logValidation(testContext.projectRoot, 'f1', 'created', 'passed');
      logSync(testContext.projectRoot, 'claude', 1, 2, 3);

      const content = fs.readFileSync(historyPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);
      lines.forEach((line) => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });
  });

  describe('getFeatureHistory()', () => {
    it('returns events for specific feature', () => {
      logValidation(testContext.projectRoot, 'feature-1', 'created', 'passed');
      logValidation(testContext.projectRoot, 'feature-2', 'created', 'passed');
      logValidation(testContext.projectRoot, 'feature-1', 'product_refinement', 'passed');

      const history = getFeatureHistory(testContext.projectRoot, 'feature-1');

      expect(history.length).toBe(2);
      expect(history.every((e) => e.feature_id === 'feature-1')).toBe(true);
    });

    it('returns empty for unknown feature', () => {
      logValidation(testContext.projectRoot, 'feature-1', 'created', 'passed');

      const history = getFeatureHistory(testContext.projectRoot, 'nonexistent');
      expect(history).toEqual([]);
    });
  });

  describe('getValidationBypasses()', () => {
    it('returns all validation bypass events', () => {
      logValidation(testContext.projectRoot, 'f1', 'created', 'passed');
      logValidationBypass(testContext.projectRoot, 'f1', 'feature', 'product_refinement', ['Error']);
      logValidationBypass(testContext.projectRoot, 'f2', 'bug', 'tech_spec', ['Another error']);

      const bypasses = getValidationBypasses(testContext.projectRoot);

      expect(bypasses.length).toBe(2);
      expect(bypasses.every((e) => e.event === 'validation_bypass')).toBe(true);
    });
  });
});
