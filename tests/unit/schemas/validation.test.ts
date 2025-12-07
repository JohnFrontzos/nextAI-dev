import { describe, it, expect } from 'vitest';
import { ValidationLevelSchema, emptyValidationResult } from '../../../src/schemas/validation';

describe('Validation Schema', () => {
  describe('ValidationLevelSchema', () => {
    it("accepts 'error'", () => {
      expect(() => ValidationLevelSchema.parse('error')).not.toThrow();
      expect(ValidationLevelSchema.parse('error')).toBe('error');
    });

    it("accepts 'warning'", () => {
      expect(() => ValidationLevelSchema.parse('warning')).not.toThrow();
      expect(ValidationLevelSchema.parse('warning')).toBe('warning');
    });

    it("rejects 'info'", () => {
      expect(() => ValidationLevelSchema.parse('info')).toThrow();
    });

    it('rejects other invalid values', () => {
      expect(() => ValidationLevelSchema.parse('debug')).toThrow();
      expect(() => ValidationLevelSchema.parse('')).toThrow();
      expect(() => ValidationLevelSchema.parse('ERROR')).toThrow();
    });
  });

  describe('emptyValidationResult', () => {
    it('returns valid=true', () => {
      const result = emptyValidationResult();
      expect(result.valid).toBe(true);
    });

    it('returns empty errors array', () => {
      const result = emptyValidationResult();
      expect(result.errors).toEqual([]);
    });

    it('returns empty warnings array', () => {
      const result = emptyValidationResult();
      expect(result.warnings).toEqual([]);
    });

    it('returns empty issues array', () => {
      const result = emptyValidationResult();
      expect(result.issues).toEqual([]);
    });

    it('returns complete structure', () => {
      const result = emptyValidationResult();
      expect(result).toEqual({
        valid: true,
        errors: [],
        warnings: [],
        issues: [],
      });
    });

    it('returns new object each time', () => {
      const result1 = emptyValidationResult();
      const result2 = emptyValidationResult();
      expect(result1).not.toBe(result2);
      expect(result1.errors).not.toBe(result2.errors);
    });
  });
});
