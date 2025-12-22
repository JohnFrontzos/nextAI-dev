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
      const files = fs.readdirSync(agentDir).filter((f) => f.endsWith('.md'));

      if (files.length > 0) {
        const content = fs.readFileSync(path.join(agentDir, files[0]), 'utf-8');
        expect(content).toContain('mode: subagent');
      }
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
});
