import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  CreatedValidator,
  BugInvestigationValidator,
  ProductRefinementValidator,
  TechSpecValidator,
  ImplementationValidator,
  ReviewValidator,
  TestingValidator,
  getValidatorForPhase,
} from '../../../../src/core/validation/phase-validators';
import {
  BugTestingValidator,
  TaskTestingValidator,
} from '../../../../src/core/validation/type-specific-validators';
import {
  createTestProject,
  createFeatureFixture,
  type TestContext,
} from '../../../helpers/test-utils';
import {
  validInitializationMd,
  noHeadingInitMd,
  validRequirementsMd,
  validSpecMd,
  validTasksMd,
  allTasksCompleteMd,
  tasksWithoutCheckboxes,
  passingReviewMd,
  failingReviewMd,
  reviewNoVerdictMd,
  passingTestingMd,
  testingNoStatus,
  testingWithStatusPrefix,
} from '../../../fixtures/artifacts';

describe('Phase Validators', () => {
  let testContext: TestContext;
  let featureDir: string;

  beforeEach(() => {
    testContext = createTestProject();
    featureDir = path.join(testContext.projectRoot, 'nextai', 'todo', 'test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('CreatedValidator', () => {
    const validator = new CreatedValidator();

    it('returns valid when init.md exists with content', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'planning/initialization.md': validInitializationMd,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns error when init.md missing', async () => {
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('initialization.md is missing or empty');
    });

    it('returns error when init.md empty', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'planning/initialization.md': '',
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('initialization.md is missing or empty');
    });

    it('returns warning when no heading', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'planning/initialization.md': noHeadingInitMd,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('title heading'))).toBe(true);
    });

    it('has correct targetPhase', () => {
      expect(validator.targetPhase).toBe('product_refinement');
    });
  });

  describe('BugInvestigationValidator', () => {
    const validator = new BugInvestigationValidator();

    it('returns valid when investigation.md exists with root cause', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'planning/investigation.md': '# Investigation\n\n## Root Cause\n\nThe bug was caused by...',
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns error when investigation.md missing', async () => {
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('investigation.md is missing or empty');
    });

    it('returns warning when no root cause section found', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'planning/investigation.md': '# Investigation\n\nSome analysis here but missing required keyword.',
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('root cause analysis');
    });

    it('has correct targetPhase', () => {
      expect(validator.targetPhase).toBe('product_refinement');
    });
  });

  describe('ProductRefinementValidator', () => {
    const validator = new ProductRefinementValidator();

    it('returns valid when requirements.md exists', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'planning/requirements.md': validRequirementsMd,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns error when requirements.md missing', async () => {
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('requirements.md is missing or empty');
    });

    it('has correct targetPhase', () => {
      expect(validator.targetPhase).toBe('tech_spec');
    });
  });

  describe('TechSpecValidator', () => {
    const validator = new TechSpecValidator();

    it('returns valid when both files exist', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'spec.md': validSpecMd,
        'tasks.md': validTasksMd,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns error when spec.md missing', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'tasks.md': validTasksMd,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('spec.md is missing or empty');
    });

    it('returns error when tasks.md missing', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'spec.md': validSpecMd,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('tasks.md is missing or empty');
    });

    it('returns error when both missing', async () => {
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('spec.md is missing or empty');
      expect(result.errors).toContain('tasks.md is missing or empty');
    });

    it('returns warning when no checkboxes in tasks', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'spec.md': validSpecMd,
        'tasks.md': tasksWithoutCheckboxes,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('task checkboxes'))).toBe(true);
    });

    it('has correct targetPhase', () => {
      expect(validator.targetPhase).toBe('implementation');
    });
  });

  describe('ImplementationValidator', () => {
    const validator = new ImplementationValidator();

    it('returns valid when all tasks complete', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'tasks.md': allTasksCompleteMd,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns error when tasks incomplete', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'tasks.md': validTasksMd, // Has some incomplete tasks
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Not all tasks complete'))).toBe(true);
    });

    it('returns error when no tasks', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'tasks.md': 'No tasks here',
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No tasks found in tasks.md');
    });

    it('has correct targetPhase', () => {
      expect(validator.targetPhase).toBe('review');
    });
  });

  describe('ReviewValidator', () => {
    const validator = new ReviewValidator();

    it('returns valid when PASS', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'review.md': passingReviewMd,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns error when FAIL', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'review.md': failingReviewMd,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Review failed'))).toBe(true);
    });

    it('returns error when no verdict', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'review.md': reviewNoVerdictMd,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('no verdict found'))).toBe(true);
    });

    it('returns error when missing', async () => {
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('review.md is missing or empty');
    });

    it('has correct targetPhase', () => {
      expect(validator.targetPhase).toBe('testing');
    });
  });

  describe('TestingValidator', () => {
    const validator = new TestingValidator();

    it('returns valid when pass status', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'testing.md': passingTestingMd,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid with **status:** format', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'testing.md': '# Testing\n\n**status:** pass\n',
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(true);
    });

    it('returns error when no pass', async () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        'testing.md': testingNoStatus,
      });
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('No passing test found'))).toBe(true);
    });

    it('returns error when missing', async () => {
      const result = await validator.validate(featureDir);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('testing.md is missing or empty');
    });

    it('has correct targetPhase', () => {
      expect(validator.targetPhase).toBe('complete');
    });
  });

  describe('Type-Specific Validator Tests', () => {
    describe('BugTestingValidator', () => {
      const validator = new BugTestingValidator();

      it('returns valid when testing.md has pass status and regression', async () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', {
          'testing.md': '# Testing\n\nRegression test passed.\n\nStatus: pass',
        });
        const result = await validator.validate(featureDir);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('returns error when no pass status', async () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', {
          'testing.md': '# Testing\n\nRegression test info.\n',
        });
        const result = await validator.validate(featureDir);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('No passing test found'))).toBe(true);
      });

      it('returns warning when no regression mention', async () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', {
          'testing.md': '# Testing\n\nStatus: pass',
        });
        const result = await validator.validate(featureDir);
        expect(result.valid).toBe(true);
        expect(result.warnings.some(w => w.includes('regression test'))).toBe(true);
      });
    });

    describe('TaskTestingValidator', () => {
      const validator = new TaskTestingValidator();

      it('returns valid when testing.md has pass status', async () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', {
          'testing.md': '# Testing\n\nStatus: pass',
        });
        const result = await validator.validate(featureDir);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('does not require regression mention', async () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', {
          'testing.md': '# Testing\n\nStatus: pass',
        });
        const result = await validator.validate(featureDir);
        expect(result.valid).toBe(true);
        expect(result.warnings).toEqual([]);
      });

      it('returns error when no pass status', async () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', {
          'testing.md': '# Testing\n\nTest info.',
        });
        const result = await validator.validate(featureDir);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('No passing test found'))).toBe(true);
      });
    });
  });

  describe('getValidatorForPhase() - Type-Aware Routing', () => {
    describe('Bug type', () => {
      it('returns BugInvestigationValidator for bug_investigation phase', () => {
        const validator = getValidatorForPhase('bug_investigation', 'bug');
        expect(validator).toBeInstanceOf(BugInvestigationValidator);
      });

      it('returns null for bug_investigation phase on non-bug types', () => {
        expect(getValidatorForPhase('bug_investigation', 'feature')).toBeNull();
        expect(getValidatorForPhase('bug_investigation', 'task')).toBeNull();
      });

      it('returns BugTestingValidator for testing phase', () => {
        const validator = getValidatorForPhase('testing', 'bug');
        expect(validator).toBeInstanceOf(BugTestingValidator);
      });
    });

    describe('Task type', () => {
      it('returns null for product_refinement phase (tasks skip it)', () => {
        const validator = getValidatorForPhase('product_refinement', 'task');
        expect(validator).toBeNull();
      });

      it('returns standard TechSpecValidator for tech_spec phase', () => {
        const validator = getValidatorForPhase('tech_spec', 'task');
        expect(validator).toBeInstanceOf(TechSpecValidator);
      });

      it('returns standard ImplementationValidator for implementation phase', () => {
        const validator = getValidatorForPhase('implementation', 'task');
        expect(validator).toBeInstanceOf(ImplementationValidator);
      });

      it('returns TaskTestingValidator for testing phase', () => {
        const validator = getValidatorForPhase('testing', 'task');
        expect(validator).toBeInstanceOf(TaskTestingValidator);
      });
    });

    describe('Feature type', () => {
      it('returns ProductRefinementValidator for product_refinement phase', () => {
        const validator = getValidatorForPhase('product_refinement', 'feature');
        expect(validator).toBeInstanceOf(ProductRefinementValidator);
      });

      it('returns standard TechSpecValidator for tech_spec phase', () => {
        const validator = getValidatorForPhase('tech_spec', 'feature');
        expect(validator).toBeInstanceOf(TechSpecValidator);
      });

      it('returns standard ImplementationValidator for implementation phase', () => {
        const validator = getValidatorForPhase('implementation', 'feature');
        expect(validator).toBeInstanceOf(ImplementationValidator);
      });

      it('returns standard TestingValidator for testing phase', () => {
        const validator = getValidatorForPhase('testing', 'feature');
        expect(validator).toBeInstanceOf(TestingValidator);
      });
    });

    describe('All types', () => {
      it('returns null for complete phase', () => {
        expect(getValidatorForPhase('complete', 'feature')).toBeNull();
        expect(getValidatorForPhase('complete', 'bug')).toBeNull();
        expect(getValidatorForPhase('complete', 'task')).toBeNull();
      });
    });
  });
});
