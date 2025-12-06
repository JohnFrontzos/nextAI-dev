import { z } from 'zod';
import type { Phase } from './ledger.js';

export const ValidationLevelSchema = z.enum(['error', 'warning']);
export type ValidationLevel = z.infer<typeof ValidationLevelSchema>;

export interface ValidationIssue {
  level: ValidationLevel;
  message: string;
  file?: string;
  expected?: string;
  actual?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: ValidationIssue[];
}

export interface PhaseValidator {
  targetPhase: Phase;
  validate(featureDir: string): Promise<ValidationResult>;
}

export const emptyValidationResult = (): ValidationResult => ({
  valid: true,
  errors: [],
  warnings: [],
  issues: [],
});
