import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { OpenCodeConfigurator } from '../../../../src/core/sync/opencode';
import { scaffoldProject } from '../../../../src/core/scaffolding/project';
import {
  createTestProject,
  type TestContext,
} from '../../../helpers/test-utils';

describe('OpenCode Sync', () => {
  let testContext: TestContext;
  let configurator: OpenCodeConfigurator;

  beforeEach(() => {
    testContext = createTestProject();
    scaffoldProject(testContext.projectRoot, 'Test Project');
    configurator = new OpenCodeConfigurator();
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('sync()', () => {
    it('creates .opencode/ directory', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const opencodeDir = path.join(testContext.projectRoot, '.opencode');
      expect(fs.existsSync(opencodeDir)).toBe(true);
    });

    it('creates .opencode/command/ directory', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const commandDir = path.join(testContext.projectRoot, '.opencode', 'command');
      expect(fs.existsSync(commandDir)).toBe(true);
    });

    it('creates .opencode/agent/ directory', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const agentDir = path.join(testContext.projectRoot, '.opencode', 'agent');
      expect(fs.existsSync(agentDir)).toBe(true);
    });

    it('uses nextai- prefix for commands', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const commandDir = path.join(testContext.projectRoot, '.opencode', 'command');
      const files = fs.readdirSync(commandDir);

      // All commands should have nextai- prefix
      expect(files.some((f) => f.startsWith('nextai-'))).toBe(true);
      expect(files).toContain('nextai-init.md');
      expect(files).toContain('nextai-create.md');
    });

    it('adds mode: subagent to agents', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const agentDir = path.join(testContext.projectRoot, '.opencode', 'agent');

      // Check a specific subagent file (developer.md)
      const developerPath = path.join(agentDir, 'developer.md');
      expect(fs.existsSync(developerPath)).toBe(true);

      const content = fs.readFileSync(developerPath, 'utf-8');
      expect(content).toContain('mode: subagent');
    });

    it('is idempotent', async () => {
      await configurator.sync(testContext.projectRoot, {});
      const secondResult = await configurator.sync(testContext.projectRoot, {});

      // Second sync should skip existing files
      expect(secondResult.skipped.length).toBeGreaterThan(0);
    });

    it('respects force option', async () => {
      await configurator.sync(testContext.projectRoot, {});
      const result = await configurator.sync(testContext.projectRoot, { force: true });

      // Force should overwrite existing files
      expect(result.commandsWritten.length).toBeGreaterThan(0);
    });

    it('returns sync result', async () => {
      const result = await configurator.sync(testContext.projectRoot, {});

      expect(result.commandsWritten).toBeDefined();
      expect(result.agentsSynced).toBeDefined();
      expect(result.skillsSynced).toBeDefined();
      expect(result.skipped).toBeDefined();
    });
  });

  describe('isConfigDirPresent()', () => {
    it('returns false when .opencode/ not present', () => {
      expect(configurator.isConfigDirPresent(testContext.projectRoot)).toBe(false);
    });

    it('returns true when .opencode/ present', async () => {
      await configurator.sync(testContext.projectRoot, {});
      expect(configurator.isConfigDirPresent(testContext.projectRoot)).toBe(true);
    });
  });

  describe('command file format', () => {
    it('includes description frontmatter', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const commandPath = path.join(
        testContext.projectRoot,
        '.opencode',
        'command',
        'nextai-init.md'
      );
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toContain('---');
      expect(content).toContain('description:');
    });
  });

  describe('syncSkills', () => {
    it('does not sync skills to OpenCode agents directory', async () => {
      // Setup: create a skill
      const skillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'test-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        '# Test Skill\n\nTest description.\n\n## Purpose\n...'
      );

      // Run sync
      const result = await configurator.sync(testContext.projectRoot, {});

      // Verify: skills are not synced to OpenCode
      expect(result.skillsSynced).toEqual([]);

      // Verify: no skill files in agent directory
      const agentDir = path.join(testContext.projectRoot, '.opencode', 'agent');
      if (fs.existsSync(agentDir)) {
        const files = fs.readdirSync(agentDir);
        expect(files.some(f => f.includes('test-skill'))).toBe(false);
      }
    });

    it('skills are kept in .nextai/skills directory', async () => {
      // Setup: create custom skill with frontmatter
      const customSkillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'codex');
      fs.mkdirSync(customSkillDir, { recursive: true });
      const skillContent = `---
description: Use Codex CLI for code analysis
mode: subagent
---

# Codex Skill Guide
...`;
      fs.writeFileSync(
        path.join(customSkillDir, 'SKILL.md'),
        skillContent
      );

      // Run sync
      const result = await configurator.sync(testContext.projectRoot, {});

      // Verify: skill file remains in .nextai/skills directory
      const sourceSkill = fs.readFileSync(
        path.join(customSkillDir, 'SKILL.md'),
        'utf-8'
      );
      expect(sourceSkill).toContain('description: Use Codex CLI for code analysis');

      // Verify: skill NOT copied to OpenCode agents
      expect(result.skillsSynced).toEqual([]);
      const agentDir = path.join(testContext.projectRoot, '.opencode', 'agent');
      if (fs.existsSync(agentDir)) {
        const files = fs.readdirSync(agentDir);
        expect(files.some(f => f.includes('codex'))).toBe(false);
      }
    });
  });

  describe('skill placeholder embedding', () => {
    it('embeds skills from actual files in command templates', async () => {
      // Setup: create a template with skill placeholder
      const templatesDir = path.join(testContext.projectRoot, '.nextai', 'templates', 'commands');
      fs.mkdirSync(templatesDir, { recursive: true });
      const templateContent = `---
description: Test command with skill
---

# Test Command

## Workflow

[Insert full content of .claude/skills/test-skill/SKILL.md here]

Now proceed.`;
      fs.writeFileSync(path.join(templatesDir, 'test.md'), templateContent);

      // Create the skill file
      const skillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'test-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      const skillContent = `# Test Skill

This is the test skill content for OpenCode.`;
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

      // Run sync
      await configurator.sync(testContext.projectRoot, {});

      // Verify: command should have embedded skill content
      const commandPath = path.join(testContext.projectRoot, '.opencode', 'command', 'nextai-test.md');
      const commandContent = fs.readFileSync(commandPath, 'utf-8');

      expect(commandContent).toContain('# Test Skill');
      expect(commandContent).toContain('This is the test skill content for OpenCode.');
      expect(commandContent).not.toContain('[Insert full content of');
    });

    it('embedded content matches source skill file exactly', async () => {
      // Setup: create template and skill
      const templatesDir = path.join(testContext.projectRoot, '.nextai', 'templates', 'commands');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(
        path.join(templatesDir, 'exact-match.md'),
        `---
description: Exact match test
---

[Insert full content of .claude/skills/exact-skill/SKILL.md here]`
      );

      const skillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'exact-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      const originalSkillContent = `# Exact Skill

**Important** formatting with *various* styles.

\`\`\`code
preserved
\`\`\``;
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), originalSkillContent);

      // Run sync
      await configurator.sync(testContext.projectRoot, {});

      // Verify: embedded content matches exactly
      const commandPath = path.join(testContext.projectRoot, '.opencode', 'command', 'nextai-exact-match.md');
      const commandContent = fs.readFileSync(commandPath, 'utf-8');

      // Extract just the skill portion (after frontmatter)
      const skillPortionMatch = commandContent.match(/# Exact Skill[\s\S]*/);
      expect(skillPortionMatch).toBeTruthy();
      expect(skillPortionMatch![0].trim()).toBe(originalSkillContent.trim());
    });

    it('transforms all command templates with placeholders during full sync', async () => {
      // Setup: create multiple templates with placeholders
      const templatesDir = path.join(testContext.projectRoot, '.nextai', 'templates', 'commands');
      fs.mkdirSync(templatesDir, { recursive: true });

      fs.writeFileSync(
        path.join(templatesDir, 'cmd1.md'),
        `---
description: Command 1
---

[Insert full content of .claude/skills/skill-a/SKILL.md here]`
      );

      fs.writeFileSync(
        path.join(templatesDir, 'cmd2.md'),
        `---
description: Command 2
---

[Insert full content of .claude/skills/skill-b/SKILL.md here]`
      );

      // Create skills
      const skillADir = path.join(testContext.projectRoot, '.nextai', 'skills', 'skill-a');
      fs.mkdirSync(skillADir, { recursive: true });
      fs.writeFileSync(path.join(skillADir, 'SKILL.md'), '# Skill A Content');

      const skillBDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'skill-b');
      fs.mkdirSync(skillBDir, { recursive: true });
      fs.writeFileSync(path.join(skillBDir, 'SKILL.md'), '# Skill B Content');

      // Run sync
      await configurator.sync(testContext.projectRoot, {});

      // Verify: both commands have embedded content
      const cmd1Content = fs.readFileSync(
        path.join(testContext.projectRoot, '.opencode', 'command', 'nextai-cmd1.md'),
        'utf-8'
      );
      const cmd2Content = fs.readFileSync(
        path.join(testContext.projectRoot, '.opencode', 'command', 'nextai-cmd2.md'),
        'utf-8'
      );

      expect(cmd1Content).toContain('# Skill A Content');
      expect(cmd2Content).toContain('# Skill B Content');
    });

    it('verifies OpenCode-specific transformations still work after embedding', async () => {
      // Setup: create template with both skill placeholder and "Skill tool" text
      const templatesDir = path.join(testContext.projectRoot, '.nextai', 'templates', 'commands');
      fs.mkdirSync(templatesDir, { recursive: true });
      const templateContent = `---
description: OpenCode transform test
---

Use the Skill tool to load NextAI skills when needed.

# Test Command

[Insert full content of .claude/skills/test-skill/SKILL.md here]`;
      fs.writeFileSync(path.join(templatesDir, 'opencode-test.md'), templateContent);

      // Create skill
      const skillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'test-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Test Skill Content');

      // Run sync
      await configurator.sync(testContext.projectRoot, {});

      // Verify: skill embedded AND "Skill tool" text removed
      const commandPath = path.join(testContext.projectRoot, '.opencode', 'command', 'nextai-opencode-test.md');
      const commandContent = fs.readFileSync(commandPath, 'utf-8');

      expect(commandContent).toContain('# Test Skill Content');
      expect(commandContent).not.toContain('Use the Skill tool');
      expect(commandContent).not.toContain('[Insert full content of');
    });
  });
});
