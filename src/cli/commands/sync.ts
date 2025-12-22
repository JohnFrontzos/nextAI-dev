import { Command } from 'commander';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { findProjectRoot, loadConfig, updateSession } from '../utils/config.js';
import { syncToClient, getConfigurator } from '../../core/sync/index.js';
import { getVersionComparison } from '../../core/sync/version.js';
import { copyResourcesToNextAI, getResourceManifest } from '../../core/sync/resources.js';
import { selectClient } from '../../core/sync/client-selection.js';
import { SUPPORTED_CLIENTS, type SupportedClient } from '../../types/index.js';

export const syncCommand = new Command('sync')
  .description('Sync NextAI configuration to AI client')
  .option('-c, --client <name>', 'Target client: claude, opencode')
  .option('-f, --force', 'Force overwrite', false)
  .option('-n, --dry-run', 'Show what would be synced', false)
  .option('--no-auto-update', 'Skip version-based template updates')
  .action(async (options) => {
    // Find project root
    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      logger.error('Project not initialized');
      logger.dim('Run `nextai init` to initialize this project');
      process.exit(1);
    }

    try {
      // Check for first-time sync and version comparison
      const versionComparison = getVersionComparison(projectRoot);
      const isFirstTime = versionComparison === null;

      // Determine if auto-update is needed
      const needsAutoUpdate =
        !isFirstTime &&
        versionComparison.needsUpdate &&
        !options.noAutoUpdate;

      // Dry-run mode
      if (options.dryRun) {
        if (needsAutoUpdate) {
          const direction = versionComparison.isUpgrade ? 'outdated' : 'downgrade detected';
          logger.warn(
            `[DRY RUN] NextAI templates ${direction} (${versionComparison.stored} → ${versionComparison.current})`
          );
          logger.blank();
          const manifest = getResourceManifest();
          logger.info('Files to update:');
          logger.subItem(`Commands: ${manifest.commands.length} files`);
          logger.subItem(`Agents: ${manifest.agents.length} files`);
          logger.subItem(`Skills: ${manifest.skills.length} files`);

          const client = await selectClient(projectRoot, options.client);
          const clientInfo = SUPPORTED_CLIENTS.find((c) => c.id === client);
          logger.blank();
          logger.keyValue('Target client', clientInfo?.name || client);
          logger.blank();
          logger.dim('Run without --dry-run to apply changes.');
        } else {
          // Normal dry-run behavior
          let client: SupportedClient = options.client;

          if (!client) {
            const config = loadConfig(projectRoot);
            client = config.clients.default;
          }

          const validClients = SUPPORTED_CLIENTS.map((c) => c.id);
          if (!validClients.includes(client)) {
            logger.error(`Unsupported client: ${client}`);
            logger.dim(`Valid clients: ${validClients.join(', ')}`);
            process.exit(1);
          }

          const clientInfo = SUPPORTED_CLIENTS.find((c) => c.id === client);

          logger.info(`[DRY RUN] Would sync to ${clientInfo?.name}`);
          const configurator = getConfigurator(client);
          logger.keyValue('Commands dir', `${configurator.config.configDir}/${configurator.config.commandsDir}/`);
          if (configurator.config.agentsDir) {
            logger.keyValue('Agents dir', `${configurator.config.configDir}/${configurator.config.agentsDir}/`);
          }
          if (configurator.config.skillsDir) {
            logger.keyValue('Skills dir', `${configurator.config.configDir}/${configurator.config.skillsDir}/`);
          }
        }
        return;
      }

      // Auto-update mode
      if (needsAutoUpdate) {
        const direction = versionComparison.isUpgrade ? 'outdated' : 'downgrade detected';
        logger.warn(
          `NextAI templates ${direction} (${versionComparison.stored} → ${versionComparison.current})`
        );
        logger.blank();

        const updateMessage = versionComparison.isUpgrade
          ? 'Updating templates from package...'
          : 'Rolling back templates to match package version...';

        const spinner = ora(updateMessage).start();

        try {
          // Copy resources
          const copyResult = copyResourcesToNextAI(projectRoot);

          if (copyResult.errors.length > 0) {
            spinner.warn('Some files failed to copy');
            for (const error of copyResult.errors) {
              logger.dim(`  ${error}`);
            }
          } else {
            spinner.succeed('Templates updated');
          }

          // Select client
          const client = await selectClient(projectRoot, options.client);
          const clientInfo = SUPPORTED_CLIENTS.find((c) => c.id === client);

          // Sync with force=true
          const syncSpinner = ora(`Syncing to ${clientInfo?.name}...`).start();
          const result = await syncToClient(projectRoot, client, { force: true });

          // Update session (only on success)
          updateSession(projectRoot, versionComparison.current);

          syncSpinner.succeed(`Synced to ${clientInfo?.name}`);

          const label = versionComparison.isUpgrade ? 'updated' : 'rolled back';
          logger.subItem(`Commands: ${copyResult.commands} (${label})`);
          logger.subItem(`Agents: ${copyResult.agents} (${label})`);
          logger.subItem(`Skills: ${copyResult.skills} (${label})`);

          if (result.warnings.length > 0) {
            logger.blank();
            logger.warn('Warnings:');
            for (const warning of result.warnings) {
              logger.dim(`  ${warning}`);
            }
          }
        } catch (error) {
          spinner.fail('Auto-update failed');
          logger.error(String(error));
          logger.dim('Sync aborted - session version not updated');
          logger.dim('Run `nextai sync --force` to retry');
          process.exit(1);
        }
      } else {
        // Normal sync (existing code path)

        // If force flag is set, update resources first
        if (options.force) {
          const spinner = ora('Updating NextAI resources...').start();
          try {
            const copyResult = copyResourcesToNextAI(projectRoot);
            if (copyResult.errors.length > 0) {
              spinner.warn('Some resources failed to copy');
              for (const error of copyResult.errors) {
                logger.dim(`  ${error}`);
              }
            } else {
              spinner.succeed('Resources updated');
              logger.subItem(`Agents: ${copyResult.agents}`);
              logger.subItem(`Skills: ${copyResult.skills}`);
              logger.subItem(`Commands: ${copyResult.commands}`);
            }
          } catch (error) {
            spinner.fail('Resource update failed');
            logger.dim(String(error));
            logger.dim('Continuing with client sync...');
          }
          logger.blank();
        }

        let client: SupportedClient = options.client;

        if (!client) {
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
      }
    } catch (error) {
      logger.error('Failed to sync');
      logger.dim(String(error));
      process.exit(1);
    }
  });
