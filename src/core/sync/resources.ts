import { existsSync, copyFileSync, readdirSync, readFileSync, unlinkSync, statSync } from 'fs';
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

export interface ResourceStats {
  total: number;
  new: number;
  updated: number;
  unchanged: number;
  removed: number;
}

export interface CopyResult {
  agents: ResourceStats;
  skills: ResourceStats;
  commands: ResourceStats;
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
 * Scan and auto-discover resources from the package directory
 * Replaces hardcoded manifest to eliminate maintenance burden and prevent missing files
 */
export function scanResourcesFromPackage(): ResourceManifest {
  try {
    const resourcesDir = getResourcesDir();

    // Scan agents: all .md files in resources/agents/
    const agentsDir = join(resourcesDir, 'agents');
    const agents = existsSync(agentsDir)
      ? readdirSync(agentsDir)
          .filter(f => f.endsWith('.md'))
          .sort()
      : [];

    // Scan skills: all directories containing SKILL.md
    const skillsDir = join(resourcesDir, 'skills');
    const skills = existsSync(skillsDir)
      ? readdirSync(skillsDir)
          .filter(skill => {
            try {
              const skillFile = join(skillsDir, skill, 'SKILL.md');
              const stats = statSync(join(skillsDir, skill));
              return stats.isDirectory() && existsSync(skillFile);
            } catch {
              return false;
            }
          })
          .sort()
      : [];

    // Scan commands: all .md files in resources/templates/commands/
    const commandsDir = join(resourcesDir, 'templates', 'commands');
    const commands = existsSync(commandsDir)
      ? readdirSync(commandsDir)
          .filter(f => f.endsWith('.md'))
          .sort()
      : [];

    return { agents, skills, commands };
  } catch (error) {
    // Fallback to empty manifest if scanning fails
    return { agents: [], skills: [], commands: [] };
  }
}

/**
 * Get manifest of NextAI-provided files
 * @deprecated Use scanResourcesFromPackage() instead for auto-discovery
 */
export function getResourceManifest(): ResourceManifest {
  return scanResourcesFromPackage();
}

/**
 * Compare file contents to detect if file has changed
 */
function filesAreIdentical(src: string, dst: string): boolean {
  try {
    if (!existsSync(dst)) {
      return false;
    }
    const srcContent = readFileSync(src, 'utf8');
    const dstContent = readFileSync(dst, 'utf8');
    return srcContent === dstContent;
  } catch {
    return false;
  }
}

/**
 * Copy file with change detection
 * Returns true if file was new, false if it was updated or unchanged
 */
function copyWithChangeDetection(src: string, dst: string): { isNew: boolean; wasUpdated: boolean } {
  const isNew = !existsSync(dst);
  const wasUpdated = !isNew && !filesAreIdentical(src, dst);

  if (isNew || wasUpdated) {
    ensureDir(dirname(dst));
    copyFileSync(src, dst);
  }

  return { isNew, wasUpdated };
}

/**
 * Remove deprecated resources from .nextai/ that no longer exist in package
 * Only operates on .nextai/ directory (framework-controlled space)
 */
function removeDeprecatedResources(projectRoot: string, manifest: ResourceManifest): { agents: number; skills: number; commands: number } {
  const nextaiDir = getNextAIDir(projectRoot);
  const removed = { agents: 0, skills: 0, commands: 0 };

  // Remove deprecated agents
  try {
    const agentsDir = join(nextaiDir, 'agents');
    if (existsSync(agentsDir)) {
      const existingAgents = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
      for (const agent of existingAgents) {
        if (!manifest.agents.includes(agent)) {
          try {
            unlinkSync(join(agentsDir, agent));
            removed.agents++;
          } catch (error) {
            // Ignore errors on individual file removal
          }
        }
      }
    }
  } catch {
    // Ignore errors reading directory
  }

  // Remove deprecated skills
  try {
    const skillsDir = join(nextaiDir, 'skills');
    if (existsSync(skillsDir)) {
      const existingSkills = readdirSync(skillsDir);
      for (const skill of existingSkills) {
        const skillPath = join(skillsDir, skill);
        try {
          const stats = statSync(skillPath);
          if (stats.isDirectory() && !manifest.skills.includes(skill)) {
            // Remove the SKILL.md file (keep directory structure simple)
            const skillFile = join(skillPath, 'SKILL.md');
            if (existsSync(skillFile)) {
              unlinkSync(skillFile);
              removed.skills++;
            }
          }
        } catch {
          // Ignore errors on individual skill
        }
      }
    }
  } catch {
    // Ignore errors reading directory
  }

  // Remove deprecated commands
  try {
    const commandsDir = join(nextaiDir, 'templates', 'commands');
    if (existsSync(commandsDir)) {
      const existingCommands = readdirSync(commandsDir).filter(f => f.endsWith('.md'));
      for (const command of existingCommands) {
        if (!manifest.commands.includes(command)) {
          try {
            unlinkSync(join(commandsDir, command));
            removed.commands++;
          } catch (error) {
            // Ignore errors on individual file removal
          }
        }
      }
    }
  } catch {
    // Ignore errors reading directory
  }

  return removed;
}

/**
 * Copy resources from package to .nextai/ directory
 * Implements change tracking (new/updated/unchanged) and removes deprecated files
 * .nextai/ is framework-controlled space - always updated without force checks
 */
export function copyResourcesToNextAI(projectRoot: string): CopyResult {
  const result: CopyResult = {
    agents: { total: 0, new: 0, updated: 0, unchanged: 0, removed: 0 },
    skills: { total: 0, new: 0, updated: 0, unchanged: 0, removed: 0 },
    commands: { total: 0, new: 0, updated: 0, unchanged: 0, removed: 0 },
    errors: [],
  };

  const manifest = scanResourcesFromPackage();
  const resourcesDir = getResourcesDir();
  const nextaiDir = getNextAIDir(projectRoot);

  // Remove deprecated resources first
  const removed = removeDeprecatedResources(projectRoot, manifest);
  result.agents.removed = removed.agents;
  result.skills.removed = removed.skills;
  result.commands.removed = removed.commands;

  // Copy agents
  result.agents.total = manifest.agents.length;
  for (const agent of manifest.agents) {
    try {
      const src = join(resourcesDir, 'agents', agent);
      const dst = join(nextaiDir, 'agents', agent);
      if (existsSync(src)) {
        const { isNew, wasUpdated } = copyWithChangeDetection(src, dst);
        if (isNew) {
          result.agents.new++;
        } else if (wasUpdated) {
          result.agents.updated++;
        } else {
          result.agents.unchanged++;
        }
      }
    } catch (error) {
      result.errors.push(`Failed to copy agent ${agent}: ${error}`);
    }
  }

  // Copy skills
  result.skills.total = manifest.skills.length;
  for (const skill of manifest.skills) {
    try {
      const src = join(resourcesDir, 'skills', skill, 'SKILL.md');
      const dst = join(nextaiDir, 'skills', skill, 'SKILL.md');
      if (existsSync(src)) {
        const { isNew, wasUpdated } = copyWithChangeDetection(src, dst);
        if (isNew) {
          result.skills.new++;
        } else if (wasUpdated) {
          result.skills.updated++;
        } else {
          result.skills.unchanged++;
        }
      }
    } catch (error) {
      result.errors.push(`Failed to copy skill ${skill}: ${error}`);
    }
  }

  // Copy commands
  result.commands.total = manifest.commands.length;
  for (const command of manifest.commands) {
    try {
      const src = join(resourcesDir, 'templates', 'commands', command);
      const dst = join(nextaiDir, 'templates', 'commands', command);
      if (existsSync(src)) {
        const { isNew, wasUpdated } = copyWithChangeDetection(src, dst);
        if (isNew) {
          result.commands.new++;
        } else if (wasUpdated) {
          result.commands.updated++;
        } else {
          result.commands.unchanged++;
        }
      }
    } catch (error) {
      result.errors.push(`Failed to copy command ${command}: ${error}`);
    }
  }

  return result;
}
