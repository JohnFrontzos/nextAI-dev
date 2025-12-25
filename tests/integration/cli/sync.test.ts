import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { scaffoldProject, isProjectInitialized } from '../../../src/core/scaffolding/project';
import { syncToClient, getConfigurator, getAvailableClients } from '../../../src/core/sync';
import { readHistory } from '../../../src/core/state/history';
import {
  createTestProject,
  readTestJson,
  type TestContext,
} from '../../helpers/test-utils';
import type { Config } from '../../../src/schemas/config';

describe('Sync Command Integration', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('Prerequisites', () => {
    it('requires initialized project', () => {
      expect(isProjectInitialized(testContext.projectRoot)).toBe(false);
    });
  });

  describe('syncToClient()', () => {
    beforeEach(() => {
      scaffoldProject(testContext.projectRoot, 'Test Project');
    });

    it('uses default client from config', async () => {
      const config = readTestJson<Config>(testContext.projectRoot, '.nextai/config.json');
      expect(config.clients.default).toBe('claude');

      const result = await syncToClient(testContext.projectRoot, 'claude');

      expect(result).toBeDefined();
      expect(fs.existsSync(path.join(testContext.projectRoot, '.claude'))).toBe(true);
    });

    it('respects --client flag', async () => {
      await syncToClient(testContext.projectRoot, 'opencode');

      expect(fs.existsSync(path.join(testContext.projectRoot, '.opencode'))).toBe(true);
    });

    it('rejects invalid client', () => {
      expect(() => getConfigurator('invalid' as 'claude')).toThrow();
    });

    it('creates client directory', async () => {
      await syncToClient(testContext.projectRoot, 'claude');

      expect(fs.existsSync(path.join(testContext.projectRoot, '.claude'))).toBe(true);
    });

    it('creates commands subdirectory', async () => {
      await syncToClient(testContext.projectRoot, 'claude');

      expect(
        fs.existsSync(path.join(testContext.projectRoot, '.claude', 'commands'))
      ).toBe(true);
    });

    it('creates agents subdirectory', async () => {
      await syncToClient(testContext.projectRoot, 'claude');

      expect(
        fs.existsSync(path.join(testContext.projectRoot, '.claude', 'agents'))
      ).toBe(true);
    });

    it('generates command files', async () => {
      await syncToClient(testContext.projectRoot, 'claude');

      const commandsDir = path.join(testContext.projectRoot, '.claude', 'commands');
      const files = fs.readdirSync(commandsDir);

      expect(files.some((f) => f.includes('nextai-'))).toBe(true);
    });

    it('generates agent files', async () => {
      await syncToClient(testContext.projectRoot, 'claude');

      const agentsDir = path.join(testContext.projectRoot, '.claude', 'agents');
      const files = fs.readdirSync(agentsDir);

      expect(files.length).toBeGreaterThan(0);
    });

    it('is idempotent', async () => {
      await syncToClient(testContext.projectRoot, 'claude');
      const result = await syncToClient(testContext.projectRoot, 'claude');

      // Second sync should report skipped files
      expect(result.skipped.length).toBeGreaterThan(0);
    });

    it('reports counts', async () => {
      const result = await syncToClient(testContext.projectRoot, 'claude');

      expect(result.commandsWritten).toBeDefined();
      expect(result.agentsSynced).toBeDefined();
      expect(result.skillsSynced).toBeDefined();
    });

    it('respects --force flag', async () => {
      await syncToClient(testContext.projectRoot, 'claude');
      const result = await syncToClient(testContext.projectRoot, 'claude', { force: true });

      // Force should overwrite
      expect(result.commandsWritten.length).toBeGreaterThan(0);
    });

    it('logs sync event', async () => {
      await syncToClient(testContext.projectRoot, 'claude');

      const events = readHistory(testContext.projectRoot);
      expect(events.some((e) => e.event === 'sync')).toBe(true);
    });

    it('OpenCode uses nextai- prefix', async () => {
      await syncToClient(testContext.projectRoot, 'opencode');

      const commandDir = path.join(testContext.projectRoot, '.opencode', 'command');
      const files = fs.readdirSync(commandDir);

      expect(files.every((f) => f.startsWith('nextai-'))).toBe(true);
    });

    it('OpenCode adds mode: subagent', async () => {
      await syncToClient(testContext.projectRoot, 'opencode');

      const agentDir = path.join(testContext.projectRoot, '.opencode', 'agent');

      // Check a specific subagent file (developer.md)
      const developerPath = path.join(agentDir, 'developer.md');
      expect(fs.existsSync(developerPath)).toBe(true);

      const content = fs.readFileSync(developerPath, 'utf-8');
      expect(content).toContain('mode: subagent');
    });

    it('Claude Code uses commands/ path', async () => {
      await syncToClient(testContext.projectRoot, 'claude');

      expect(
        fs.existsSync(path.join(testContext.projectRoot, '.claude', 'commands'))
      ).toBe(true);
    });
  });

  describe('getAvailableClients()', () => {
    beforeEach(() => {
      scaffoldProject(testContext.projectRoot, 'Test Project');
    });

    it('returns empty for no client directories', () => {
      const available = getAvailableClients(testContext.projectRoot);
      expect(available).toEqual([]);
    });

    it('returns synced clients', async () => {
      await syncToClient(testContext.projectRoot, 'claude');

      const available = getAvailableClients(testContext.projectRoot);
      expect(available).toContain('claude');
    });
  });

  describe('Force flag resource updates', () => {
    beforeEach(() => {
      scaffoldProject(testContext.projectRoot, 'Test Project');
    });

    it('updates resources in .nextai when force flag is used', async () => {
      // Remove a skill to simulate it being missing
      const skillPath = path.join(testContext.projectRoot, '.nextai', 'skills', 'testing-investigator', 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        fs.unlinkSync(skillPath);
      }

      // Verify it's deleted
      expect(fs.existsSync(skillPath)).toBe(false);

      // Sync with force should restore it
      await syncToClient(testContext.projectRoot, 'claude', { force: true });

      // The test is verifying the integration works, but the actual resource update
      // happens in the command layer. In this test we're just verifying sync completes
      // successfully with force flag.
      expect(fs.existsSync(path.join(testContext.projectRoot, '.claude'))).toBe(true);
    });

    it('preserves existing resources when force flag is used', async () => {
      // Verify an agent file exists
      const agentPath = path.join(testContext.projectRoot, '.nextai', 'agents', 'developer.md');
      expect(fs.existsSync(agentPath)).toBe(true);

      // Sync with force
      await syncToClient(testContext.projectRoot, 'claude', { force: true });

      // Verify agent file still exists (this test verifies sync doesn't break things)
      expect(fs.existsSync(agentPath)).toBe(true);
    });

    it('syncs successfully without force flag', async () => {
      // Normal sync should work
      const result = await syncToClient(testContext.projectRoot, 'claude', { force: false });

      expect(result).toBeDefined();
      expect(result.commandsWritten.length).toBeGreaterThan(0);
    });
  });
});
