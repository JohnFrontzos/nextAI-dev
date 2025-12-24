import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ClientConfigurator, type ClientConfig, type SyncContext } from './base.js';
import { ensureDir, getNextAIDir } from '../../cli/utils/config.js';
import { parseBaseAgent, toClaudeAgent } from './transformers/agent.js';
import { embedSkillPlaceholders } from './transformers/skill-embedder.js';

export class ClaudeCodeConfigurator extends ClientConfigurator {
  config: ClientConfig = {
    name: 'claude',
    displayName: 'Claude Code',
    configDir: '.claude',
    commandsDir: 'commands',
    agentsDir: 'agents',
    skillsDir: 'skills',
    commandFilePattern: 'nextai-{name}.md',
  };

  async generateCommands(ctx: SyncContext): Promise<string[]> {
    const { projectRoot, options, skipped } = ctx;
    const commandsWritten: string[] = [];
    const targetDir = join(projectRoot, this.config.configDir, this.config.commandsDir);
    ensureDir(targetDir);

    // CLI wrapper commands
    const cliWrappers = [
      { name: 'init', description: 'Initialize NextAI project' },
      { name: 'create', description: 'Create a new feature, bug, or task' },
      { name: 'sync', description: 'Sync NextAI to AI client' },
      { name: 'repair', description: 'Repair project or feature state' },
      { name: 'list', description: 'List all features' },
      { name: 'show', description: 'Show feature details' },
      { name: 'resume', description: 'Smart continuation' },
      { name: 'testing', description: 'Log test results' },
      { name: 'status', description: 'Update feature status (block, retry count)' },
    ];

    for (const cmd of cliWrappers) {
      const filename = this.config.commandFilePattern.replace('{name}', cmd.name);
      const targetPath = join(targetDir, filename);

      // Check if file exists and force is not set
      if (existsSync(targetPath) && !options.force) {
        skipped.push(filename);
        continue;
      }

      const content = this.generateCliWrapper(cmd.name, cmd.description);
      writeFileSync(targetPath, content);
      commandsWritten.push(filename);
    }

    // AI workflow commands - read from templates
    const templatesDir = join(getNextAIDir(projectRoot), 'templates', 'commands');
    if (existsSync(templatesDir)) {
      const templates = readdirSync(templatesDir).filter((f) => f.endsWith('.md'));
      for (const template of templates) {
        const name = template.replace('.md', '');
        const filename = this.config.commandFilePattern.replace('{name}', name);
        const targetPath = join(targetDir, filename);

        // Check if file exists and force is not set
        if (existsSync(targetPath) && !options.force) {
          skipped.push(filename);
          continue;
        }

        const templateContent = readFileSync(join(templatesDir, template), 'utf-8');
        const content = this.transformCommandTemplate(templateContent);
        writeFileSync(targetPath, content);
        commandsWritten.push(filename);
      }
    }

    return commandsWritten;
  }

  async syncAgents(ctx: SyncContext): Promise<string[]> {
    const { projectRoot, options, skipped } = ctx;
    const agentsSynced: string[] = [];
    const sourceDir = join(getNextAIDir(projectRoot), 'agents');
    const targetDir = join(projectRoot, this.config.configDir, this.config.agentsDir!);

    if (!existsSync(sourceDir)) {
      return agentsSynced;
    }

    ensureDir(targetDir);

    const agents = readdirSync(sourceDir).filter((f) => f.endsWith('.md'));
    for (const agent of agents) {
      const sourcePath = join(sourceDir, agent);
      const targetPath = join(targetDir, agent);

      // Check if file exists and force is not set
      if (existsSync(targetPath) && !options.force) {
        skipped.push(`agents/${agent}`);
        continue;
      }

      // Transform agent from base format to Claude Code format
      const content = readFileSync(sourcePath, 'utf-8');
      try {
        const parsed = parseBaseAgent(content);
        const transformed = toClaudeAgent(parsed);
        writeFileSync(targetPath, transformed);
      } catch (error) {
        // Fallback for legacy format - just add tools if missing
        console.warn(`Failed to parse ${agent} as base format, using legacy fallback`);
        const transformed = this.transformAgentManifest(content);
        writeFileSync(targetPath, transformed);
      }
      agentsSynced.push(agent);
    }

    return agentsSynced;
  }

  async syncSkills(ctx: SyncContext): Promise<string[]> {
    const { projectRoot, options, skipped } = ctx;
    const skillsSynced: string[] = [];
    const sourceDir = join(getNextAIDir(projectRoot), 'skills');
    const targetDir = join(projectRoot, this.config.configDir, this.config.skillsDir!);

    if (!existsSync(sourceDir)) {
      return skillsSynced;
    }

    ensureDir(targetDir);

    const skills = readdirSync(sourceDir);
    for (const skill of skills) {
      const srcSkillDir = join(sourceDir, skill);
      const srcSkillFile = join(srcSkillDir, 'SKILL.md');

      if (existsSync(srcSkillFile)) {
        const dstSkillDir = join(targetDir, skill);
        const dstSkillFile = join(dstSkillDir, 'SKILL.md');

        // Check if file exists and force is not set
        if (existsSync(dstSkillFile) && !options.force) {
          skipped.push(`skills/${skill}`);
          continue;
        }

        ensureDir(dstSkillDir);

        // Transform skill to add Claude Code frontmatter
        const content = readFileSync(srcSkillFile, 'utf-8');
        const transformed = this.transformSkillForClaudeCode(content, skill);
        writeFileSync(dstSkillFile, transformed);

        skillsSynced.push(skill);
      }
    }

    return skillsSynced;
  }

  isConfigDirPresent(projectRoot: string): boolean {
    return existsSync(join(projectRoot, this.config.configDir));
  }

  private generateCliWrapper(name: string, description: string): string {
    return `---
description: ${description}
---

# NextAI ${capitalize(name)}

Run the NextAI CLI command: \`nextai ${name}\`

If arguments are provided via $ARGUMENTS, parse them and pass to the command.

## Instructions
1. Run: \`nextai ${name} $ARGUMENTS\`
2. Display the output to the user
3. Suggest next steps based on the result
`;
  }

  private transformCommandTemplate(template: string): string {
    let content = template;

    // Embed skill placeholders with actual skill content
    content = embedSkillPlaceholders(content, this.projectRoot!);

    // Add skill loading instructions if not present
    if (!content.includes('Skill tool')) {
      return content.replace(
        '---\n\n',
        '---\n\nUse the Skill tool to load NextAI skills when needed.\n\n'
      );
    }
    return content;
  }

  private transformAgentManifest(content: string): string {
    // Add default tools if not specified
    if (!content.includes('tools:')) {
      return content.replace(
        '---\n\n',
        '---\ntools:\n  - Read\n  - Write\n  - Edit\n  - Bash\n  - Glob\n  - Grep\n---\n\n'
      );
    }
    return content;
  }

  private transformSkillForClaudeCode(content: string, skillName: string): string {
    // If frontmatter already exists, return as-is
    if (content.trimStart().startsWith('---')) {
      return content;
    }

    // Extract description from first paragraph after title
    const descMatch = content.match(/^#[^\n]+\n+([^\n#]+)/m);
    const description = descMatch?.[1].trim() || `NextAI ${skillName.replace(/-/g, ' ')} skill`;

    return `---
name: ${skillName}
description: ${description}
---

${content}`;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
