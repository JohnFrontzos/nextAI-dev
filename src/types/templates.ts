/**
 * Template type definitions for agent transformations
 */

/**
 * Base agent frontmatter format (source of truth in resources/agents/*.md)
 */
export interface BaseAgentFrontmatter {
  id: string;
  description: string;
  role: 'subagent' | 'primary' | 'all';
  tools: Record<string, boolean>;
  skillDependencies?: string[];
}

/**
 * Claude Code agent frontmatter format (output to .claude/agents/*.md)
 */
export interface ClaudeAgentFrontmatter {
  name: string;
  description: string;
  tools: string; // comma-separated, capitalized
  skills?: string; // comma-separated
}

/**
 * OpenCode agent frontmatter format (output to .opencode/agent/*.md)
 */
export interface OpenCodeAgentFrontmatter {
  description: string;
  mode: 'subagent' | 'primary' | 'all';
  tools: Record<string, boolean>;
}

/**
 * Parsed agent template with frontmatter and content
 */
export interface ParsedAgent<T = BaseAgentFrontmatter> {
  frontmatter: T;
  content: string;
}

/**
 * Base skill frontmatter format
 */
export interface BaseSkillFrontmatter {
  name: string;
  description: string;
}
