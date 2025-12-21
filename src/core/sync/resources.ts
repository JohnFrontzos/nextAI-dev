import { existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getNextAIDir, ensureDir } from '../../cli/utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ResourceManifest {
  agents: string[];
  skills: string[];
  commands: string[];
}

export interface CopyResult {
  agents: number;
  skills: number;
  commands: number;
  errors: string[];
}

/**
 * Get the resources directory from the package
 */
export function getResourcesDir(): string {
  // When bundled with tsup, __dirname points to dist/
  // We need to find the resources folder relative to the package root
  const candidates = [
    join(__dirname, '..', 'resources'),              // dist -> resources (package root)
    join(__dirname, '..', '..', 'resources'),        // dist/cli -> resources (package root)
    join(__dirname, '..', '..', '..', 'resources'),  // fallback for nested structure
  ];

  for (const candidate of candidates) {
    // Verify this is OUR resources folder by checking for templates/commands
    const templatesDir = join(candidate, 'templates', 'commands');
    if (existsSync(templatesDir)) {
      return candidate;
    }
  }

  // Fallback: return first existing candidate
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

/**
 * Get manifest of NextAI-provided files
 */
export function getResourceManifest(): ResourceManifest {
  return {
    agents: [
      'ai-team-lead.md',
      'product-owner.md',
      'technical-architect.md',
      'developer.md',
      'reviewer.md',
      'document-writer.md',
      'investigator.md',
    ],
    skills: [
      'refinement-questions',
      'refinement-spec-writer',
      'executing-plans',
      'reviewer-checklist',
      'documentation-recaps',
      'root-cause-tracing',
      'systematic-debugging',
      'testing-investigator',
    ],
    commands: [
      'create.md',
      'resume.md',
      'refine.md',
      'implement.md',
      'review.md',
      'testing.md',
      'complete.md',
      'analyze.md',
      'show.md',
      'list.md',
      'sync.md',
      'repair.md',
      'remove.md',
    ],
  };
}

/**
 * Copy resources from package to .nextai/ directory
 * Only copies files in the manifest (NextAI-provided files)
 */
export function copyResourcesToNextAI(projectRoot: string): CopyResult {
  const result: CopyResult = {
    agents: 0,
    skills: 0,
    commands: 0,
    errors: [],
  };

  const manifest = getResourceManifest();
  const resourcesDir = getResourcesDir();
  const nextaiDir = getNextAIDir(projectRoot);

  // Copy agents
  for (const agent of manifest.agents) {
    try {
      const src = join(resourcesDir, 'agents', agent);
      const dst = join(nextaiDir, 'agents', agent);
      if (existsSync(src)) {
        ensureDir(dirname(dst));
        copyFileSync(src, dst);
        result.agents++;
      }
    } catch (error) {
      result.errors.push(`Failed to copy agent ${agent}: ${error}`);
    }
  }

  // Copy skills
  for (const skill of manifest.skills) {
    try {
      const src = join(resourcesDir, 'skills', skill, 'SKILL.md');
      const dst = join(nextaiDir, 'skills', skill, 'SKILL.md');
      if (existsSync(src)) {
        ensureDir(dirname(dst));
        copyFileSync(src, dst);
        result.skills++;
      }
    } catch (error) {
      result.errors.push(`Failed to copy skill ${skill}: ${error}`);
    }
  }

  // Copy commands
  for (const command of manifest.commands) {
    try {
      const src = join(resourcesDir, 'templates', 'commands', command);
      const dst = join(nextaiDir, 'templates', 'commands', command);
      if (existsSync(src)) {
        ensureDir(dirname(dst));
        copyFileSync(src, dst);
        result.commands++;
      }
    } catch (error) {
      result.errors.push(`Failed to copy command ${command}: ${error}`);
    }
  }

  return result;
}
