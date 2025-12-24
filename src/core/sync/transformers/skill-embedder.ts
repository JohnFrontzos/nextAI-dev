/**
 * Skill placeholder embedder transformer
 * Replaces placeholders like:
 * [Insert full content of .claude/skills/reviewer-checklist/SKILL.md here]
 * with actual skill content from resources/skills/
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getNextAIDir } from '../../../cli/utils/config.js';

/**
 * Regex pattern to match skill placeholders
 * Captures the skill name from: [Insert full content of .claude/skills/{skill-name}/SKILL.md here]
 */
const SKILL_PLACEHOLDER_REGEX = /\[Insert full content of \.claude\/skills\/([^\/]+)\/SKILL\.md here\]/g;

/**
 * Embed skill placeholders with actual skill content
 *
 * @param templateContent - Template content with placeholders
 * @param projectRoot - Project root directory for resolving skill paths
 * @returns Transformed template with embedded skill content
 */
export function embedSkillPlaceholders(
  templateContent: string,
  projectRoot: string
): string {
  return templateContent.replace(SKILL_PLACEHOLDER_REGEX, (match, skillName) => {
    try {
      // Resolve skill path from .nextai/skills/{skill-name}/SKILL.md
      const nextaiDir = getNextAIDir(projectRoot);
      const skillPath = join(nextaiDir, 'skills', skillName, 'SKILL.md');

      // Check if skill file exists
      if (!existsSync(skillPath)) {
        console.warn(`Skill not found: ${skillName} - keeping placeholder`);
        return match; // Keep original placeholder
      }

      // Read and return skill content
      const skillContent = readFileSync(skillPath, 'utf-8');
      return skillContent;
    } catch (error) {
      // Handle file read errors gracefully
      console.warn(`Failed to read skill: ${skillName} - keeping placeholder`, error);
      return match; // Keep original placeholder
    }
  });
}
