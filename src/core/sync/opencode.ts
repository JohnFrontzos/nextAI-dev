import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ClientConfigurator, type ClientConfig, type SyncContext } from './base.js';
import { ensureDir, getNextAIDir } from '../../cli/utils/config.js';
import { parseBaseAgent, toOpenCodeAgent } from './transformers/agent.js';
import { embedSkillPlaceholders } from './transformers/skill-embedder.js';

export class OpenCodeConfigurator extends ClientConfigurator {
  config: ClientConfig = {
    name: 'opencode',
    displayName: 'OpenCode',
    configDir: '.opencode',
    commandsDir: 'command', // Note: singular in OpenCode
    agentsDir: 'agent',
    skillsDir: null, // OpenCode uses agents, not skills
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
      // Use agent filename directly (no nextai- prefix per spec)
      const targetPath = join(targetDir, agent);

      // Check if file exists and force is not set
      if (existsSync(targetPath) && !options.force) {
        skipped.push(`agents/${agent}`);
        continue;
      }

      const content = readFileSync(sourcePath, 'utf-8');
      // Transform from base format to OpenCode format
      try {
        const parsed = parseBaseAgent(content);
        const transformed = toOpenCodeAgent(parsed);
        writeFileSync(targetPath, transformed);
      } catch (error) {
        // Fallback for legacy format - just add mode if missing
        console.warn(`Failed to parse ${agent} as base format, using legacy fallback`);
        const transformed = this.transformAgentManifest(content);
        writeFileSync(targetPath, transformed);
      }
      agentsSynced.push(agent);
    }

    return agentsSynced;
  }

  async syncSkills(_ctx: SyncContext): Promise<string[]> {
    // OpenCode reads skills from .claude/skills/ path, no separate generation needed
    // Per spec: "Skills: OpenCode reads from `.claude/skills/` path, so no separate generation needed"
    return [];
  }

  isConfigDirPresent(projectRoot: string): boolean {
    return existsSync(join(projectRoot, this.config.configDir));
  }

  private generateCliWrapper(name: string, description: string): string {
    return `---
description: ${description}
---

Run the NextAI CLI command: \`nextai ${name}\`

If arguments are provided via $ARGUMENTS, parse them and pass to the command.

Instructions:
1. Run: \`nextai ${name} $ARGUMENTS\`
2. Display the output to the user
3. Suggest next steps based on the result
`;
  }

  private transformCommandTemplate(template: string): string {
    // OpenCode format is simpler - remove Claude-specific references
    let content = template;

    // Embed skill placeholders with actual skill content
    content = embedSkillPlaceholders(content, this.projectRoot!);

    // Remove Skill tool references (OpenCode uses agents)
    content = content.replace(/Use the Skill tool to load.*?\r?\n/g, '');

    return content;
  }

  private transformAgentManifest(content: string): string {
    // Add mode: subagent for OpenCode
    if (!content.includes('mode:')) {
      // Handle both Unix (\n) and Windows (\r\n) line endings
      return content.replace(/---\r?\n/, '---\nmode: subagent\n');
    }
    return content;
  }
}
