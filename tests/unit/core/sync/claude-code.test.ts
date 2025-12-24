import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ClaudeCodeConfigurator } from '../../../../src/core/sync/claude-code';
import { scaffoldProject } from '../../../../src/core/scaffolding/project';
import {
  createTestProject,
  readTestJson,
  type TestContext,
} from '../../../helpers/test-utils';

describe('Claude Code Sync', () => {
  let testContext: TestContext;
  let configurator: ClaudeCodeConfigurator;

  beforeEach(() => {
    testContext = createTestProject();
    scaffoldProject(testContext.projectRoot, 'Test Project');
    configurator = new ClaudeCodeConfigurator();
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('sync()', () => {
    it('creates .claude/ directory', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const claudeDir = path.join(testContext.projectRoot, '.claude');
      expect(fs.existsSync(claudeDir)).toBe(true);
    });

    it('creates .claude/commands/ directory', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const commandsDir = path.join(testContext.projectRoot, '.claude', 'commands');
      expect(fs.existsSync(commandsDir)).toBe(true);
    });

    it('creates .claude/agents/ directory', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const agentsDir = path.join(testContext.projectRoot, '.claude', 'agents');
      expect(fs.existsSync(agentsDir)).toBe(true);
    });

    it('generates command files', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const commandsDir = path.join(testContext.projectRoot, '.claude', 'commands');
      const files = fs.readdirSync(commandsDir);

      // Should have CLI wrapper commands
      expect(files).toContain('nextai-init.md');
      expect(files).toContain('nextai-create.md');
      expect(files).toContain('nextai-resume.md');
    });

    it('generates agent files', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const agentsDir = path.join(testContext.projectRoot, '.claude', 'agents');
      const files = fs.readdirSync(agentsDir);

      // Should have agent files
      expect(files.length).toBeGreaterThan(0);
      expect(files.some((f) => f.endsWith('.md'))).toBe(true);
    });

    it('is idempotent', async () => {
      await configurator.sync(testContext.projectRoot, {});
      const firstResult = await configurator.sync(testContext.projectRoot, {});
      const secondResult = await configurator.sync(testContext.projectRoot, {});

      // Second sync should skip existing files
      expect(secondResult.skipped.length).toBeGreaterThan(0);
    });

    it('uses force to overwrite', async () => {
      await configurator.sync(testContext.projectRoot, {});

      // First sync creates files
      const commandPath = path.join(
        testContext.projectRoot,
        '.claude',
        'commands',
        'nextai-init.md'
      );
      expect(fs.existsSync(commandPath)).toBe(true);

      // Force sync should overwrite
      const result = await configurator.sync(testContext.projectRoot, { force: true });
      expect(result.commandsWritten.length).toBeGreaterThan(0);
    });

    it('returns sync result with counts', async () => {
      const result = await configurator.sync(testContext.projectRoot, {});

      expect(result.commandsWritten).toBeDefined();
      expect(result.agentsSynced).toBeDefined();
      expect(result.skillsSynced).toBeDefined();
      expect(result.skipped).toBeDefined();
    });
  });

  describe('isConfigDirPresent()', () => {
    it('returns false when .claude/ not present', () => {
      expect(configurator.isConfigDirPresent(testContext.projectRoot)).toBe(false);
    });

    it('returns true when .claude/ present', async () => {
      await configurator.sync(testContext.projectRoot, {});
      expect(configurator.isConfigDirPresent(testContext.projectRoot)).toBe(true);
    });
  });

  describe('command file format', () => {
    it('includes description frontmatter', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const commandPath = path.join(
        testContext.projectRoot,
        '.claude',
        'commands',
        'nextai-init.md'
      );
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toContain('---');
      expect(content).toContain('description:');
    });

    it('includes CLI command reference', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const commandPath = path.join(
        testContext.projectRoot,
        '.claude',
        'commands',
        'nextai-create.md'
      );
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toContain('nextai create');
    });
  });

  describe('transformSkillForClaudeCode', () => {
    // Access private method for unit testing
    const transform = (content: string, skillName: string) =>
      (configurator as any).transformSkillForClaudeCode(content, skillName);

    it('adds frontmatter to skill without frontmatter', () => {
      const content = `# My Skill\n\nThis is the description.\n\n## Purpose\n...`;
      const result = transform(content, 'my-skill');

      expect(result).toContain('---\nname: my-skill');
      expect(result).toContain('description: This is the description.');
      expect(result).toContain('# My Skill');
    });

    it('preserves existing frontmatter', () => {
      const content = `---\nname: custom\ndescription: Custom desc\n---\n\n# My Skill`;
      const result = transform(content, 'my-skill');

      expect(result).toBe(content);
    });

    it('handles skill with only title', () => {
      const content = `# Minimal Skill`;
      const result = transform(content, 'minimal');

      expect(result).toContain('name: minimal');
      expect(result).toContain('description: NextAI minimal skill');
    });

    it('extracts description from first paragraph after title', () => {
      const content = `# Code Review\n\nValidates code against specifications.\n\n## Details`;
      const result = transform(content, 'code-review');

      expect(result).toContain('description: Validates code against specifications.');
    });
  });

  describe('syncSkills', () => {
    it('transforms skills when syncing to Claude Code', async () => {
      // Setup: create a skill without frontmatter
      const skillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'test-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, 'SKILL.md'),
        '# Test Skill\n\nTest description.\n\n## Purpose\n...'
      );

      // Run sync
      await configurator.sync(testContext.projectRoot, {});

      // Verify: skill should have frontmatter
      const syncedSkill = fs.readFileSync(
        path.join(testContext.projectRoot, '.claude', 'skills', 'test-skill', 'SKILL.md'),
        'utf-8'
      );

      expect(syncedSkill).toMatch(/^---\nname: test-skill/);
      expect(syncedSkill).toContain('description: Test description.');
    });

    it('preserves existing frontmatter in custom skills', async () => {
      // Setup: create custom skill with frontmatter
      const customSkillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'codex');
      fs.mkdirSync(customSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(customSkillDir, 'SKILL.md'),
        `---
name: codex
description: Use Codex CLI for code analysis
---

# Codex Skill Guide
...`
      );

      // Run sync
      await configurator.sync(testContext.projectRoot, {});

      // Verify: frontmatter preserved exactly
      const syncedContent = fs.readFileSync(
        path.join(testContext.projectRoot, '.claude', 'skills', 'codex', 'SKILL.md'),
        'utf-8'
      );

      expect(syncedContent).toContain('name: codex');
      expect(syncedContent).toContain('description: Use Codex CLI for code analysis');
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
      const skillContent = `---
name: test-skill
description: A test skill
---

# Test Skill

This is the test skill content with detailed instructions.`;
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

      // Run sync
      await configurator.sync(testContext.projectRoot, {});

      // Verify: command should have embedded skill content
      const commandPath = path.join(testContext.projectRoot, '.claude', 'commands', 'nextai-test.md');
      const commandContent = fs.readFileSync(commandPath, 'utf-8');

      expect(commandContent).toContain('# Test Skill');
      expect(commandContent).toContain('This is the test skill content with detailed instructions.');
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
      const commandPath = path.join(testContext.projectRoot, '.claude', 'commands', 'nextai-exact-match.md');
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
        path.join(testContext.projectRoot, '.claude', 'commands', 'nextai-cmd1.md'),
        'utf-8'
      );
      const cmd2Content = fs.readFileSync(
        path.join(testContext.projectRoot, '.claude', 'commands', 'nextai-cmd2.md'),
        'utf-8'
      );

      expect(cmd1Content).toContain('# Skill A Content');
      expect(cmd2Content).toContain('# Skill B Content');
    });

    it('re-embeds skills on force sync (idempotent)', async () => {
      // Setup
      const templatesDir = path.join(testContext.projectRoot, '.nextai', 'templates', 'commands');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(
        path.join(templatesDir, 'idempotent.md'),
        `---
description: Idempotent test
---

[Insert full content of .claude/skills/changing-skill/SKILL.md here]`
      );

      const skillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'changing-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Original Content');

      // First sync
      await configurator.sync(testContext.projectRoot, {});
      const commandPath = path.join(testContext.projectRoot, '.claude', 'commands', 'nextai-idempotent.md');
      const firstContent = fs.readFileSync(commandPath, 'utf-8');
      expect(firstContent).toContain('# Original Content');

      // Update skill
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Updated Content');

      // Force sync
      await configurator.sync(testContext.projectRoot, { force: true });
      const secondContent = fs.readFileSync(commandPath, 'utf-8');

      // Verify: content updated
      expect(secondContent).toContain('# Updated Content');
      expect(secondContent).not.toContain('# Original Content');
    });
  });
});
