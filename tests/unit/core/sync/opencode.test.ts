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
});
