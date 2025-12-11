import { select } from '@inquirer/prompts';
import { getAvailableClients, getConfigurator } from './index.js';
import { SUPPORTED_CLIENTS, type SupportedClient } from '../../types/index.js';

/**
 * Select which client to sync to
 * Auto-selects if only one client, prompts if multiple
 */
export async function selectClient(
  projectRoot: string,
  explicitClient?: SupportedClient
): Promise<SupportedClient> {
  // If client explicitly specified, validate and return
  if (explicitClient) {
    const configurator = getConfigurator(explicitClient);
    if (!configurator.isConfigDirPresent(projectRoot)) {
      throw new Error(`Client ${explicitClient} is not configured`);
    }
    return explicitClient;
  }

  // Get available clients
  const available = getAvailableClients(projectRoot);

  if (available.length === 0) {
    throw new Error('No AI clients configured. Please run nextai init first.');
  }

  if (available.length === 1) {
    return available[0];
  }

  // Multiple clients - prompt user
  const clientInfo = SUPPORTED_CLIENTS.filter((c) => available.includes(c.id));

  const answer = await select({
    message: 'Multiple AI clients detected. Which one to sync?',
    choices: clientInfo.map((c) => ({
      name: c.name,
      value: c.id,
    })),
  });

  return answer;
}
