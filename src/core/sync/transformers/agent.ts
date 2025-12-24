/**
 * Agent template transformers
 * Converts between base format and platform-specific formats
 */

import matter from 'gray-matter';
import yaml from 'js-yaml';
import type {
  BaseAgentFrontmatter,
  ClaudeAgentFrontmatter,
  OpenCodeAgentFrontmatter,
  ParsedAgent,
} from '../../../types/templates.js';

/**
 * Parse base agent format from resources/agents/*.md
 */
export function parseBaseAgent(content: string): ParsedAgent<BaseAgentFrontmatter> {
  const { data, content: bodyContent } = matter(content);
  const frontmatter = data as BaseAgentFrontmatter;

  // Validate required fields
  if (!frontmatter.id) {
    throw new Error('Agent template missing required field: id');
  }
  if (!frontmatter.description) {
    throw new Error('Agent template missing required field: description');
  }
  if (!frontmatter.role) {
    throw new Error('Agent template missing required field: role');
  }
  if (!frontmatter.tools) {
    throw new Error('Agent template missing required field: tools');
  }

  return {
    frontmatter,
    content: bodyContent.trim(),
  };
}

/**
 * Convert base agent to Claude Code format
 */
export function toClaudeAgent(parsed: ParsedAgent<BaseAgentFrontmatter>): string {
  const { frontmatter, content } = parsed;

  // Convert tools object to comma-separated string with capitalized names
  const enabledTools = Object.entries(frontmatter.tools)
    .filter(([, enabled]) => enabled)
    .map(([tool]) => tool.charAt(0).toUpperCase() + tool.slice(1))
    .join(', ');

  const claudeFrontmatter: ClaudeAgentFrontmatter = {
    name: frontmatter.id,
    description: frontmatter.description,
    tools: enabledTools,
  };

  // Add skills if present
  if (frontmatter.skillDependencies && frontmatter.skillDependencies.length > 0) {
    claudeFrontmatter.skills = frontmatter.skillDependencies.join(', ');
  }

  const frontmatterYaml = yaml.dump(claudeFrontmatter, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  }).trim();

  return `---\n${frontmatterYaml}\n---\n\n${content}\n`;
}

/**
 * Convert base agent to OpenCode format
 */
export function toOpenCodeAgent(parsed: ParsedAgent<BaseAgentFrontmatter>): string {
  const { frontmatter, content } = parsed;

  const opencodeFrontmatter: OpenCodeAgentFrontmatter = {
    description: frontmatter.description,
    mode: frontmatter.role,
    tools: frontmatter.tools,
  };

  const frontmatterYaml = yaml.dump(opencodeFrontmatter, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  }).trim();

  return `---\n${frontmatterYaml}\n---\n\n${content}\n`;
}
