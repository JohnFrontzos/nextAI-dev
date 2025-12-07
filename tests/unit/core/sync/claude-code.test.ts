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
});
