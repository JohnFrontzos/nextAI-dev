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
      const files = fs.readdirSync(agentDir).filter((f) => f.endsWith('.md'));

      if (files.length > 0) {
        const agentPath = path.join(agentDir, files[0]);
        const content = fs.readFileSync(agentPath, 'utf-8');
        expect(content).toContain('mode: subagent');
      }
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

  describe('transformSkillToAgent', () => {
    // Access private method for unit testing
    const transform = (content: string, skillName: string) =>
      (configurator as any).transformSkillToAgent(content, skillName);

    it('adds frontmatter to skill without frontmatter', () => {
      const content = `# My Skill\n\nThis is the description.\n\n## Purpose\n...`;
      const result = transform(content, 'my-skill');

      expect(result).toContain('description: This is the description.');
      expect(result).toContain('mode: subagent');
      expect(result).toContain('# My Skill');
    });

    it('preserves existing frontmatter and adds mode if missing', () => {
      const content = `---\ndescription: Custom desc\n---\n\n# My Skill`;
      const result = transform(content, 'my-skill');

      expect(result).toContain('mode: subagent');
      expect(result).toContain('description: Custom desc');
    });

    it('preserves existing frontmatter with mode already present', () => {
      const content = `---\ndescription: Custom desc\nmode: subagent\n---\n\n# My Skill`;
      const result = transform(content, 'my-skill');

      expect(result).toBe(content);
    });

    it('does not match mode: in body content', () => {
      // Body contains "mode:" but frontmatter does not
      const content = `---\ndescription: Custom desc\n---\n\n# My Skill\n\nSet debug mode: on`;
      const result = transform(content, 'my-skill');

      // Should add mode: to frontmatter despite "mode:" appearing in body
      expect(result).toMatch(/^---\nmode: subagent\ndescription:/);
    });

    it('extracts description from first paragraph after title', () => {
      const content = `# Code Review\n\nValidates code against specifications.\n\n## Details`;
      const result = transform(content, 'code-review');

      expect(result).toContain('description: Validates code against specifications.');
    });

    it('uses fallback description when no paragraph after title', () => {
      const content = `# Minimal Skill`;
      const result = transform(content, 'minimal-skill');

      expect(result).toContain('description: NextAI minimal skill skill');
      expect(result).toContain('mode: subagent');
    });
  });

  describe('syncSkills', () => {
    it('transforms skills when syncing to OpenCode', async () => {
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
        path.join(testContext.projectRoot, '.opencode', 'agent', 'nextai-test-skill.md'),
        'utf-8'
      );

      expect(syncedSkill).toMatch(/^---\n/);
      expect(syncedSkill).toContain('description: Test description.');
      expect(syncedSkill).toContain('mode: subagent');
    });

    it('preserves existing frontmatter in custom skills', async () => {
      // Setup: create custom skill with frontmatter
      const customSkillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'codex');
      fs.mkdirSync(customSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(customSkillDir, 'SKILL.md'),
        `---
description: Use Codex CLI for code analysis
mode: subagent
---

# Codex Skill Guide
...`
      );

      // Run sync
      await configurator.sync(testContext.projectRoot, {});

      // Verify: frontmatter preserved exactly
      const syncedContent = fs.readFileSync(
        path.join(testContext.projectRoot, '.opencode', 'agent', 'nextai-codex.md'),
        'utf-8'
      );

      expect(syncedContent).toContain('description: Use Codex CLI for code analysis');
      expect(syncedContent).toContain('mode: subagent');
    });
  });
});
