import { ClaudeCodeConfigurator } from './claude-code.js';
import { OpenCodeConfigurator } from './opencode.js';
import type { ClientConfigurator } from './base.js';
import type { SupportedClient, SyncResult, SyncOptions } from '../../types/index.js';
import { logSync } from '../state/history.js';
import { loadConfig, saveConfig } from '../../cli/utils/config.js';

export * from './base.js';
export * from './claude-code.js';
export * from './opencode.js';
export * from './version.js';
export * from './resources.js';
export * from './client-selection.js';

const configurators: Record<SupportedClient, () => ClientConfigurator> = {
  claude: () => new ClaudeCodeConfigurator(),
  opencode: () => new OpenCodeConfigurator(),
  codex: () => {
    throw new Error('Codex support is planned for Phase 2');
  },
};

/**
 * Get configurator for a client
 */
export function getConfigurator(client: SupportedClient): ClientConfigurator {
  const factory = configurators[client];
  if (!factory) {
    throw new Error(`Unsupported client: ${client}`);
  }
  return factory();
}

/**
 * Sync NextAI to a specific client
 */
export async function syncToClient(
  projectRoot: string,
  client: SupportedClient,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const configurator = getConfigurator(client);
  const result = await configurator.sync(projectRoot, options);

  // Log sync event
  logSync(
    projectRoot,
    client,
    result.commandsWritten.length,
    result.skillsSynced.length,
    result.agentsSynced.length
  );

  // Update config with synced client
  try {
    const config = loadConfig(projectRoot);
    if (!config.clients.synced.includes(client)) {
      config.clients.synced.push(client);
    }
    config.clients.default = client;
    saveConfig(projectRoot, config);
  } catch {
    // Ignore config update errors during sync
  }

  return result;
}

/**
 * Get available clients (those with config directories)
 */
export function getAvailableClients(projectRoot: string): SupportedClient[] {
  const available: SupportedClient[] = [];
  for (const client of ['claude', 'opencode'] as SupportedClient[]) {
    const configurator = getConfigurator(client);
    if (configurator.isConfigDirPresent(projectRoot)) {
      available.push(client);
    }
  }
  return available;
}
