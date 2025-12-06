import { Command } from 'commander';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { findProjectRoot, loadConfig } from '../utils/config.js';
import { syncToClient, getConfigurator } from '../../core/sync/index.js';
import { SUPPORTED_CLIENTS, type SupportedClient } from '../../types/index.js';

export const syncCommand = new Command('sync')
  .description('Sync NextAI configuration to AI client')
  .option('-c, --client <name>', 'Target client: claude, opencode')
  .option('-f, --force', 'Force overwrite', false)
  .option('-n, --dry-run', 'Show what would be synced', false)
  .action(async (options) => {
    // Find project root
    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      logger.error('Project not initialized');
      logger.dim('Run `nextai init` to initialize this project');
      process.exit(1);
    }

    try {
      // Determine client
      let client: SupportedClient = options.client;

      if (!client) {
        // Use default from config
        const config = loadConfig(projectRoot);
        client = config.clients.default;
      }

      // Validate client
      const validClients = SUPPORTED_CLIENTS.map((c) => c.id);
      if (!validClients.includes(client)) {
        logger.error(`Unsupported client: ${client}`);
        logger.dim(`Valid clients: ${validClients.join(', ')}`);
        process.exit(1);
      }

      const clientInfo = SUPPORTED_CLIENTS.find((c) => c.id === client);

      if (options.dryRun) {
        logger.info(`Dry run: would sync to ${clientInfo?.name}`);
        const configurator = getConfigurator(client);
        logger.keyValue('Commands dir', `${configurator.config.configDir}/${configurator.config.commandsDir}/`);
        if (configurator.config.agentsDir) {
          logger.keyValue('Agents dir', `${configurator.config.configDir}/${configurator.config.agentsDir}/`);
        }
        if (configurator.config.skillsDir) {
          logger.keyValue('Skills dir', `${configurator.config.configDir}/${configurator.config.skillsDir}/`);
        }
        return;
      }

      const spinner = ora(`Syncing to ${clientInfo?.name}...`).start();

      const result = await syncToClient(projectRoot, client, { force: options.force });

      spinner.succeed(`Synced to ${clientInfo?.name}`);

      logger.subItem(`Commands: ${result.commandsWritten.length}`);
      logger.subItem(`Agents: ${result.agentsSynced.length}`);
      if (result.skillsSynced.length > 0) {
        logger.subItem(`Skills: ${result.skillsSynced.length}`);
      }

      if (result.skipped.length > 0) {
        logger.blank();
        logger.info(`Skipped ${result.skipped.length} existing file(s)`);
        logger.dim('Use --force to overwrite existing files');
      }

      if (result.warnings.length > 0) {
        logger.blank();
        logger.warn('Warnings:');
        for (const warning of result.warnings) {
          logger.dim(`  ${warning}`);
        }
      }
    } catch (error) {
      logger.error('Failed to sync');
      logger.dim(String(error));
      process.exit(1);
    }
  });
