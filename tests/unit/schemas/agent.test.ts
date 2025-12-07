import { describe, it, expect } from 'vitest';
import {
  AgentRoleSchema,
  AgentManifestFrontmatterSchema,
  AgentManifestSchema,
} from '../../../src/schemas/agent';

describe('Agent Schema', () => {
  describe('AgentRoleSchema', () => {
    it('accepts all valid roles', () => {
      const validRoles = [
        'orchestrator',
        'product_research',
        'tech_spec',
        'developer',
        'reviewer',
        'documentation',
        'investigator',
      ];

      for (const role of validRoles) {
        expect(() => AgentRoleSchema.parse(role)).not.toThrow();
      }
    });

    it('rejects invalid roles', () => {
      expect(() => AgentRoleSchema.parse('invalid')).toThrow();
      expect(() => AgentRoleSchema.parse('')).toThrow();
      expect(() => AgentRoleSchema.parse('DEVELOPER')).toThrow();
    });
  });

  describe('AgentManifestFrontmatterSchema', () => {
    const validFrontmatter = {
      name: 'Test Agent',
      description: 'A test agent for unit testing',
      role: 'developer',
    };

    it('accepts valid agent frontmatter', () => {
      expect(() => AgentManifestFrontmatterSchema.parse(validFrontmatter)).not.toThrow();
    });

    it('requires name', () => {
      const missingName = { ...validFrontmatter };
      delete (missingName as Record<string, unknown>).name;
      expect(() => AgentManifestFrontmatterSchema.parse(missingName)).toThrow();
    });

    it('requires description', () => {
      const missingDescription = { ...validFrontmatter };
      delete (missingDescription as Record<string, unknown>).description;
      expect(() => AgentManifestFrontmatterSchema.parse(missingDescription)).toThrow();
    });

    it('validates role enum', () => {
      const invalidRole = { ...validFrontmatter, role: 'invalid' };
      expect(() => AgentManifestFrontmatterSchema.parse(invalidRole)).toThrow();
    });

    it('allows optional model', () => {
      const withoutModel = { ...validFrontmatter };
      expect(() => AgentManifestFrontmatterSchema.parse(withoutModel)).not.toThrow();

      const withModel = { ...validFrontmatter, model: 'claude-3-opus' };
      expect(() => AgentManifestFrontmatterSchema.parse(withModel)).not.toThrow();
    });

    it('allows optional temperature', () => {
      const withoutTemp = { ...validFrontmatter };
      expect(() => AgentManifestFrontmatterSchema.parse(withoutTemp)).not.toThrow();

      const withTemp = { ...validFrontmatter, temperature: 0.7 };
      expect(() => AgentManifestFrontmatterSchema.parse(withTemp)).not.toThrow();
    });

    it('validates temperature range', () => {
      // Temperature must be 0-2
      const tooHigh = { ...validFrontmatter, temperature: 3 };
      expect(() => AgentManifestFrontmatterSchema.parse(tooHigh)).toThrow();

      const tooLow = { ...validFrontmatter, temperature: -1 };
      expect(() => AgentManifestFrontmatterSchema.parse(tooLow)).toThrow();

      // Valid range
      const minTemp = { ...validFrontmatter, temperature: 0 };
      expect(() => AgentManifestFrontmatterSchema.parse(minTemp)).not.toThrow();

      const maxTemp = { ...validFrontmatter, temperature: 2 };
      expect(() => AgentManifestFrontmatterSchema.parse(maxTemp)).not.toThrow();
    });

    it('allows optional top_p', () => {
      const withTopP = { ...validFrontmatter, top_p: 0.9 };
      expect(() => AgentManifestFrontmatterSchema.parse(withTopP)).not.toThrow();
    });

    it('validates top_p range', () => {
      // top_p must be 0-1
      const tooHigh = { ...validFrontmatter, top_p: 1.5 };
      expect(() => AgentManifestFrontmatterSchema.parse(tooHigh)).toThrow();

      const tooLow = { ...validFrontmatter, top_p: -0.1 };
      expect(() => AgentManifestFrontmatterSchema.parse(tooLow)).toThrow();
    });

    it('allows optional tools array', () => {
      const withoutTools = { ...validFrontmatter };
      expect(() => AgentManifestFrontmatterSchema.parse(withoutTools)).not.toThrow();

      const withTools = { ...validFrontmatter, tools: ['read', 'write', 'search'] };
      expect(() => AgentManifestFrontmatterSchema.parse(withTools)).not.toThrow();
    });

    it('allows optional skills array', () => {
      const withoutSkills = { ...validFrontmatter };
      expect(() => AgentManifestFrontmatterSchema.parse(withoutSkills)).not.toThrow();

      const withSkills = { ...validFrontmatter, skills: ['code-review', 'testing'] };
      expect(() => AgentManifestFrontmatterSchema.parse(withSkills)).not.toThrow();
    });

    it('validates color format', () => {
      const validColor = { ...validFrontmatter, color: '#FF5733' };
      expect(() => AgentManifestFrontmatterSchema.parse(validColor)).not.toThrow();

      const invalidColor = { ...validFrontmatter, color: 'red' };
      expect(() => AgentManifestFrontmatterSchema.parse(invalidColor)).toThrow();

      const invalidHex = { ...validFrontmatter, color: '#FFF' };
      expect(() => AgentManifestFrontmatterSchema.parse(invalidHex)).toThrow();
    });
  });

  describe('AgentManifestSchema', () => {
    const validManifest = {
      name: 'Test Agent',
      description: 'A test agent',
      role: 'developer',
      prompt: '# System Prompt\n\nYou are a helpful developer agent.',
    };

    it('accepts valid agent manifest', () => {
      expect(() => AgentManifestSchema.parse(validManifest)).not.toThrow();
    });

    it('requires prompt field', () => {
      const missingPrompt = { ...validManifest };
      delete (missingPrompt as Record<string, unknown>).prompt;
      expect(() => AgentManifestSchema.parse(missingPrompt)).toThrow();
    });

    it('includes all frontmatter fields', () => {
      const fullManifest = {
        name: 'Full Agent',
        description: 'A fully configured agent',
        role: 'reviewer',
        model: 'claude-3-sonnet',
        temperature: 0.5,
        top_p: 0.95,
        tools: ['read', 'analyze'],
        skills: ['code-review'],
        color: '#00FF00',
        prompt: '# Reviewer Agent\n\nReview code carefully.',
      };
      expect(() => AgentManifestSchema.parse(fullManifest)).not.toThrow();
    });
  });
});
