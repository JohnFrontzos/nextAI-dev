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

    it('creates .claude/agents/nextai/ directory', async () => {
      await configurator.sync(testContext.projectRoot, {});

      const agentsDir = path.join(testContext.projectRoot, '.claude', 'agents', 'nextai');
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

      const agentsDir = path.join(testContext.projectRoot, '.claude', 'agents', 'nextai');
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
});
