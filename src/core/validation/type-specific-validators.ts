import { readFileSync } from 'fs';
import { join } from 'path';
import type { Phase } from '../../schemas/ledger.js';
import type { PhaseValidator, ValidationResult, ValidationIssue } from '../../schemas/validation.js';
import { existsWithContent } from './phase-detection.js';

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
 * BugTestingValidator - regression focus
 * Validates testing phase for bug type features
 */
export class BugTestingValidator implements PhaseValidator {
  targetPhase: Phase = 'complete';

  async validate(featureDir: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const testingPath = join(featureDir, 'testing.md');

    if (!existsWithContent(testingPath)) {
      issues.push({ level: 'error', message: 'testing.md is missing or empty' });
    } else {
      const content = readFileSync(testingPath, 'utf-8').toLowerCase();

      // Check for regression test mention
      if (!content.includes('regression')) {
        issues.push({
          level: 'warning',
          message: 'Bug testing should include regression test validation',
        });
      }

      // Check for pass status
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
 * TaskTestingValidator - lighter requirements
 * Validates testing phase for task type features
 */
export class TaskTestingValidator implements PhaseValidator {
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
