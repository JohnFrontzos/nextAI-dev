import { existsSync, writeFileSync, copyFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  getNextAIDir,
  getNextAIContentDir,
  ensureDir,
  initConfig,
  initProfile,
  initLedger,
  getPackageVersion,
  updateSession,
} from '../../cli/utils/config.js';
import { logInit } from '../state/history.js';
import type { SupportedClient } from '../../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths to resource templates (bundled with package)
function getResourcesDir(): string {
  // When bundled with tsup, __dirname points to dist/cli/
  // We need to find the resources folder relative to the package root
  // Look for the resources folder that contains our specific templates structure
  const candidates = [
    join(__dirname, '..', 'resources'),        // dist/cli -> dist/resources (if copied)
    join(__dirname, '..', '..', 'resources'),  // dist/cli -> resources (package root)
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

export interface ScaffoldOptions {
  /** Overwrite existing template files when true */
  force?: boolean;
}

/**
 * Scaffold the .nextai directory structure
 */
export function scaffoldProject(
  projectRoot: string,
  projectName: string,
  client?: SupportedClient,
  options: ScaffoldOptions = {}
): { projectId: string } {
  const nextaiDir = getNextAIDir(projectRoot);
  const { force = false } = options;

  // Create directory structure
  const dirs = [
    'agents',
    'skills',
    'templates/commands',
    'state',
  ];

  for (const dir of dirs) {
    ensureDir(join(nextaiDir, dir));
  }

  // Initialize config and profile
  const config = initConfig(projectRoot, projectName);
  initProfile(projectRoot, config.project.id, projectName);
  initLedger(projectRoot);
  updateSession(projectRoot, getPackageVersion());

  // Copy agent templates
  copyAgentTemplates(projectRoot, force);

  // Copy skill templates
  copySkillTemplates(projectRoot, force);

  // Copy command templates
  copyCommandTemplates(projectRoot, force);

  // Log init event
  logInit(projectRoot, config.project.id, projectName, client);

  return { projectId: config.project.id };
}

/**
 * Copy agent template files from resources
 */
function copyAgentTemplates(projectRoot: string, force: boolean = false): void {
  const resourcesDir = getResourcesDir();
  const agentsSourceDir = join(resourcesDir, 'agents');
  const agentsTargetDir = join(getNextAIDir(projectRoot), 'agents');

  if (!existsSync(agentsSourceDir)) {
    // If resources don't exist yet, create placeholder agents
    createDefaultAgents(agentsTargetDir);
    return;
  }

  const agents = readdirSync(agentsSourceDir).filter((f) => f.endsWith('.md'));
  for (const agent of agents) {
    const source = join(agentsSourceDir, agent);
    const target = join(agentsTargetDir, agent);
    if (force || !existsSync(target)) {
      copyFileSync(source, target);
    }
  }
}

/**
 * Copy skill template files from resources
 */
function copySkillTemplates(projectRoot: string, force: boolean = false): void {
  const resourcesDir = getResourcesDir();
  const skillsSourceDir = join(resourcesDir, 'skills');
  const skillsTargetDir = join(getNextAIDir(projectRoot), 'skills');

  if (!existsSync(skillsSourceDir)) {
    // If resources don't exist yet, create placeholder skills
    createDefaultSkills(skillsTargetDir);
    return;
  }

  const skills = readdirSync(skillsSourceDir);
  for (const skill of skills) {
    const source = join(skillsSourceDir, skill);
    const target = join(skillsTargetDir, skill);
    const skillFile = join(source, 'SKILL.md');
    const targetSkillFile = join(target, 'SKILL.md');

    if (existsSync(skillFile)) {
      if (force || !existsSync(targetSkillFile)) {
        ensureDir(target);
        copyFileSync(skillFile, targetSkillFile);
      }
    }
  }
}

/**
 * Copy command template files from resources
 */
function copyCommandTemplates(projectRoot: string, force: boolean = false): void {
  const resourcesDir = getResourcesDir();
  const commandsSourceDir = join(resourcesDir, 'templates', 'commands');
  const commandsTargetDir = join(getNextAIDir(projectRoot), 'templates', 'commands');

  if (!existsSync(commandsSourceDir)) {
    // If resources don't exist yet, create placeholder commands
    createDefaultCommandTemplates(commandsTargetDir);
    return;
  }

  const commands = readdirSync(commandsSourceDir).filter((f) => f.endsWith('.md'));
  for (const command of commands) {
    const source = join(commandsSourceDir, command);
    const target = join(commandsTargetDir, command);
    if (force || !existsSync(target)) {
      copyFileSync(source, target);
    }
  }
}

/**
 * Create default agent placeholder files
 */
function createDefaultAgents(agentsDir: string): void {
  ensureDir(agentsDir);

  const agents = [
    {
      name: 'ai-team-lead',
      role: 'orchestrator',
      description: 'Main orchestrator that routes work to specialized agents',
    },
    {
      name: 'product-owner',
      role: 'product_research',
      description: 'Gathers requirements via confidence-based Q&A loop',
    },
    {
      name: 'technical-architect',
      role: 'tech_spec',
      description: 'Creates technical specifications and implementation plans',
    },
    {
      name: 'developer',
      role: 'developer',
      description: 'Implements tasks from the task list',
    },
    {
      name: 'reviewer',
      role: 'reviewer',
      description: 'Reviews implementation against specification',
    },
    {
      name: 'document-writer',
      role: 'documentation',
      description: 'Updates documentation and changelog',
    },
    {
      name: 'investigator',
      role: 'investigator',
      description: 'Root-cause analysis for bugs',
    },
  ];

  for (const agent of agents) {
    const content = `---
name: ${agent.name}
description: ${agent.description}
role: ${agent.role}
---

You are the ${agent.name.replace(/-/g, ' ')} agent.

## Your Role
${agent.description}

## Workflow
Follow the NextAI workflow for your assigned phase.
`;
    writeFileSync(join(agentsDir, `${agent.name}.md`), content);
  }
}

/**
 * Create default skill placeholder files
 */
function createDefaultSkills(skillsDir: string): void {
  ensureDir(skillsDir);

  const skills = [
    { name: 'refinement-questions', description: 'Product research Q&A loop' },
    { name: 'refinement-spec-writer', description: 'Tech spec & tasks authoring' },
    { name: 'executing-plans', description: 'Step-by-step task execution' },
    { name: 'reviewer-checklist', description: 'AI review validation checklist' },
    { name: 'documentation-recaps', description: 'Docs & changelog updates' },
    { name: 'root-cause-tracing', description: 'Backward bug tracing technique' },
    { name: 'systematic-debugging', description: '4-phase debugging framework' },
  ];

  for (const skill of skills) {
    const skillDir = join(skillsDir, skill.name);
    ensureDir(skillDir);
    const content = `# ${skill.name}

${skill.description}

## Instructions

Follow the structured approach for ${skill.name.replace(/-/g, ' ')}.
`;
    writeFileSync(join(skillDir, 'SKILL.md'), content);
  }
}

/**
 * Create default command template files
 */
function createDefaultCommandTemplates(commandsDir: string): void {
  ensureDir(commandsDir);

  const commands = ['refine', 'implement', 'review', 'complete'];
  for (const cmd of commands) {
    const content = `---
description: Run NextAI ${cmd} pipeline for a feature
---

# NextAI ${cmd.charAt(0).toUpperCase() + cmd.slice(1)}: $ARGUMENTS

You are the NextAI ${cmd.charAt(0).toUpperCase() + cmd.slice(1)} Agent.

## Context
- Feature folder: \`nextai/todo/$ARGUMENTS/\`

## Instructions
Follow the ${cmd} workflow as documented.
`;
    writeFileSync(join(commandsDir, `${cmd}.md`), content);
  }
}

/**
 * Create global directories inside nextai/ (todo/, done/, docs/, metrics/)
 */
export function scaffoldGlobalDirs(projectRoot: string): void {
  const contentDir = getNextAIContentDir(projectRoot);
  const dirs = ['todo', 'done', 'docs', 'metrics'];
  for (const dir of dirs) {
    ensureDir(join(contentDir, dir));
  }
}

/**
 * Check if project is already initialized
 */
export function isProjectInitialized(projectRoot: string): boolean {
  return existsSync(getNextAIDir(projectRoot));
}
