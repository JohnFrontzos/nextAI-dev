import { readFileSync } from 'fs';
import { join } from 'path';
import type { Phase, FeatureType } from '../../schemas/ledger.js';
import type { PhaseValidator, ValidationResult, ValidationIssue } from '../../schemas/validation.js';
import { existsWithContent, getTaskProgress, getReviewOutcome } from './phase-detection.js';
import { BugTestingValidator, TaskTestingValidator } from './type-specific-validators.js';

/**
 * Helper to create ValidationResult from issues array
 */
function createResult(issues: ValidationIssue[]): ValidationResult {
  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');
  return {
    valid: errors.length === 0,
    errors: errors.map(e => e.message),
    warnings: warnings.map(w => w.message),
    issues,
  };
}

/**
 * Validates the 'created' phase before transitioning to 'product_refinement'
 * Checks: initialization.md exists and has content
 */
export class CreatedValidator implements PhaseValidator {
  targetPhase: Phase = 'product_refinement';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const initPath = join(featureDir, 'planning', 'initialization.md');

    if (!existsWithContent(initPath)) {
      issues.push({ level: 'error', message: 'initialization.md is missing or empty' });
    } else {
      const content = readFileSync(initPath, 'utf-8');
      if (!content.includes('# ')) {
        issues.push({ level: 'warning', message: 'initialization.md should have a title heading' });
      }
    }

    return createResult(issues);
  }
}

/**
 * Validates the 'bug_investigation' phase before transitioning to 'product_refinement'
 * Checks: investigation.md exists and has root cause analysis
 */
export class BugInvestigationValidator implements PhaseValidator {
  targetPhase: Phase = 'product_refinement';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const investigationPath = join(featureDir, 'planning', 'investigation.md');

    if (!existsWithContent(investigationPath)) {
      issues.push({
        level: 'error',
        message: 'investigation.md is missing or empty',
      });
    } else {
      const content = readFileSync(investigationPath, 'utf-8');

      // Check for root cause section
      if (!content.toLowerCase().includes('root cause')) {
        issues.push({
          level: 'warning',
          message: 'investigation.md should contain root cause analysis',
        });
      }
    }

    return createResult(issues);
  }
}

/**
 * Validates the 'product_refinement' phase before transitioning to 'tech_spec'
 * Checks: requirements.md exists and has content
 */
export class ProductRefinementValidator implements PhaseValidator {
  targetPhase: Phase = 'tech_spec';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const reqPath = join(featureDir, 'planning', 'requirements.md');

    if (!existsWithContent(reqPath)) {
      issues.push({ level: 'error', message: 'requirements.md is missing or empty' });
    }

    return createResult(issues);
  }
}

/**
 * Validates the 'tech_spec' phase before transitioning to 'implementation'
 * Checks: spec.md and tasks.md exist with proper content
 */
export class TechSpecValidator implements PhaseValidator {
  targetPhase: Phase = 'implementation';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    const specPath = join(featureDir, 'spec.md');
    const tasksPath = join(featureDir, 'tasks.md');

    if (!existsWithContent(specPath)) {
      issues.push({ level: 'error', message: 'spec.md is missing or empty' });
    }

    if (!existsWithContent(tasksPath)) {
      issues.push({ level: 'error', message: 'tasks.md is missing or empty' });
    } else {
      const content = readFileSync(tasksPath, 'utf-8');
      // Check for at least one task checkbox
      if (!content.match(/^[-*]\s+\[[\sx]\]/m)) {
        issues.push({ level: 'warning', message: 'tasks.md should contain task checkboxes (- [ ] format)' });
      }
    }

    return createResult(issues);
  }
}

/**
 * Validates the 'implementation' phase before transitioning to 'review'
 * Checks: all tasks in tasks.md are complete
 */
export class ImplementationValidator implements PhaseValidator {
  targetPhase: Phase = 'review';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const tasksPath = join(featureDir, 'tasks.md');

    const progress = getTaskProgress(tasksPath);

    if (progress.total === 0) {
      issues.push({ level: 'error', message: 'No tasks found in tasks.md' });
    } else if (!progress.isComplete) {
      issues.push({
        level: 'error',
        message: `Not all tasks complete: ${progress.completed}/${progress.total} done`,
        expected: `${progress.total} tasks complete`,
        actual: `${progress.completed} tasks complete`,
      });
    }

    return createResult(issues);
  }
}

/**
 * Validates the 'review' phase before transitioning to 'testing'
 * Checks: review.md exists with PASS verdict
 */
export class ReviewValidator implements PhaseValidator {
  targetPhase: Phase = 'testing';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const reviewPath = join(featureDir, 'review.md');

    if (!existsWithContent(reviewPath)) {
      issues.push({ level: 'error', message: 'review.md is missing or empty' });
    } else {
      const outcome = getReviewOutcome(reviewPath);

      if (!outcome.isComplete) {
        issues.push({ level: 'error', message: 'Review not complete: no verdict found' });
      } else if (outcome.verdict === 'fail') {
        issues.push({
          level: 'error',
          message: 'Review failed: fix issues before proceeding to testing',
          expected: 'PASS',
          actual: 'FAIL',
        });
      }
    }

    return createResult(issues);
  }
}

/**
 * Validates the 'testing' phase before transitioning to 'complete'
 * Checks: testing.md exists with passing test status
 */
export class TestingValidator implements PhaseValidator {
  targetPhase: Phase = 'complete';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const testingPath = join(featureDir, 'testing.md');

    if (!existsWithContent(testingPath)) {
      issues.push({ level: 'error', message: 'testing.md is missing or empty' });
    } else {
      const content = readFileSync(testingPath, 'utf-8').toLowerCase();

      if (!content.includes('status: pass') && !content.includes('**status:** pass')) {
        issues.push({
          level: 'error',
          message: 'No passing test found in testing.md',
          expected: 'Status: pass',
          actual: 'No passing status found',
        });
      }
    }

    return createResult(issues);
  }
}

/**
 * Get the appropriate validator for a phase (type-aware)
 * Returns null for 'complete' phase or invalid phase/type combinations
 *
 * @param phase - Current phase to validate
 * @param type - Feature type (feature, bug, task)
 */
export function getValidatorForPhase(
  phase: Phase,
  type: FeatureType
): PhaseValidator | null {
  // Type-specific validators
  switch (phase) {
    case 'created':
      return new CreatedValidator();

    case 'bug_investigation':
      if (type === 'bug') {
        return new BugInvestigationValidator();
      }
      return null; // Invalid phase for this type

    case 'product_refinement':
      if (type === 'task') {
        return null; // Tasks skip this phase
      }
      return new ProductRefinementValidator();

    case 'tech_spec':
      // ALL types use standard TechSpecValidator
      return new TechSpecValidator();

    case 'implementation':
      // ALL types use standard ImplementationValidator (100% completion)
      return new ImplementationValidator();

    case 'review':
      return new ReviewValidator();

    case 'testing':
      if (type === 'bug') {
        return new BugTestingValidator();
      }
      if (type === 'task') {
        return new TaskTestingValidator();
      }
      return new TestingValidator();

    case 'complete':
      return null;

    default:
      return null;
  }
}
