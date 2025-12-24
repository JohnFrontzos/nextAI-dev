/**
 * Skill template transformers and validators
 * Handles skill parsing and OpenCode naming validation
 */

import matter from 'gray-matter';
import type { BaseSkillFrontmatter } from '../../../types/templates.js';

/**
 * Parsed skill with frontmatter and content
 */
export interface ParsedSkill {
  frontmatter: BaseSkillFrontmatter;
  content: string;
}

/**
 * Parse base skill format from resources/skills/*/SKILL.md
 */
export function parseBaseSkill(fileContent: string): ParsedSkill {
  const { data, content: bodyContent } = matter(fileContent);
  const frontmatter = data as BaseSkillFrontmatter;

  // Validate required fields
  if (!frontmatter.name) {
    throw new Error('Skill template missing required field: name');
  }
  if (!frontmatter.description) {
    throw new Error('Skill template missing required field: description');
  }

  return {
    frontmatter,
    content: bodyContent.trim(),
  };
}

/**
 * Validate skill name against OpenCode naming rules
 * Returns array of warning messages (empty if valid)
 *
 * OpenCode skill naming rules:
 * - Length: 1-64 characters
 * - Characters: lowercase alphanumeric and hyphens only
 * - No leading/trailing hyphens
 * - No consecutive hyphens
 */
export function validateSkillName(name: string): string[] {
  const warnings: string[] = [];

  // Check length (1-64 chars)
  if (name.length === 0) {
    warnings.push('Skill name cannot be empty');
  } else if (name.length > 64) {
    warnings.push(`Skill name exceeds 64 characters (${name.length} chars)`);
  }

  // Check for uppercase letters
  if (/[A-Z]/.test(name)) {
    warnings.push('Skill name contains uppercase letters (OpenCode requires lowercase)');
  }

  // Check for invalid characters (only allow lowercase alphanumeric and hyphens)
  if (!/^[a-z0-9-]*$/.test(name)) {
    warnings.push('Skill name contains invalid characters (only lowercase a-z, 0-9, and hyphens allowed)');
  }

  // Check for leading hyphen
  if (name.startsWith('-')) {
    warnings.push('Skill name cannot start with a hyphen');
  }

  // Check for trailing hyphen
  if (name.endsWith('-')) {
    warnings.push('Skill name cannot end with a hyphen');
  }

  // Check for consecutive hyphens
  if (/--/.test(name)) {
    warnings.push('Skill name cannot contain consecutive hyphens');
  }

  return warnings;
}
