import { Command } from 'commander';
import { existsSync } from 'fs';
import { basename, resolve } from 'path';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { confirmAction, selectClient } from '../utils/prompts.js';
import { scaffoldProject, scaffoldGlobalDirs, isProjectInitialized } from '../../core/scaffolding/project.js';
import { SUPPORTED_CLIENTS, type SupportedClient } from '../../types/index.js';
import { syncToClient } from '../../core/sync/index.js';

export const initCommand = new Command('init')
  .description('Initialize NextAI in the current project')
  .option('-c, --client <name>', 'Target client: claude, opencode')
  .option('-y, --yes', 'Skip prompts, use defaults', false)
  .option('-f, --force', 'Reinitialize even if already exists', false)
  .action(async (options) => {
    const cwd = process.cwd();
    const projectRoot = resolve(cwd);
    const projectName = basename(projectRoot);

    // Check if already initialized
    if (isProjectInitialized(projectRoot) && !options.force) {
      logger.warn(`Project already initialized at ${projectRoot}`);
      logger.dim('Use --force to reinitialize');

      if (!options.yes) {
        const shouldContinue = await confirmAction(
          'Would you like to continue and update existing configuration?',
          false
        );
        if (!shouldContinue) {
          logger.dim('Aborted');
          return;
        }
      }
    }

    const spinner = ora('Initializing NextAI...').start();

    try {
      // Scaffold project structure
      spinner.text = 'Scaffolding project structure...';
      scaffoldProject(projectRoot, projectName, undefined, { force: options.force });

      // Create global directories
      spinner.text = 'Creating global directories...';
      scaffoldGlobalDirs(projectRoot);

      spinner.succeed('Project structure created');

      // Detect or select client
      let client: SupportedClient | undefined = options.client;

      if (!client && !options.yes) {
        // Auto-detect installed clients
        const detectedClients = SUPPORTED_CLIENTS.filter((c) =>
          existsSync(resolve(projectRoot, c.configDir))
        );

        if (detectedClients.length === 0) {
          // No clients detected, ask user
          client = await selectClient(
            SUPPORTED_CLIENTS.filter((c) => c.id !== 'codex'), // Codex is Phase 2
            'Which AI client would you like to use?'
          );
        } else if (detectedClients.length === 1) {
          // One client detected, confirm
          logger.info(`Detected ${detectedClients[0].name}`);
          const useDetected = await confirmAction(
            `Use ${detectedClients[0].name}?`,
            true
          );
          client = useDetected ? detectedClients[0].id : undefined;
        } else {
          // Multiple clients detected
          logger.info('Multiple AI clients detected');
          client = await selectClient(
            detectedClients,
            'Select primary client:'
          );
        }
      }

      // Default to claude if no selection
      if (!client) {
        client = 'claude';
      }

      // Sync to client (force on init to ensure fresh files)
      if (client) {
        spinner.start(`Syncing to ${client}...`);
        const result = await syncToClient(projectRoot, client, { force: true });
        spinner.succeed(`Synced to ${SUPPORTED_CLIENTS.find((c) => c.id === client)?.name || client}`);

        logger.subItem(`Commands: ${result.commandsWritten.length}`);
        logger.subItem(`Agents: ${result.agentsSynced.length}`);
        if (result.skillsSynced.length > 0) {
          logger.subItem(`Skills: ${result.skillsSynced.length}`);
        }
      }

      // Success message
      logger.blank();
      logger.success(`Initialized NextAI in ${projectRoot}`);
      logger.keyValue('Config', '.nextai/config.json');
      logger.keyValue('Profile', '.nextai/profile.json');
      logger.keyValue('Agents', '.nextai/agents/ (7 agents)');
      logger.keyValue('Skills', '.nextai/skills/ (7 skills)');
      if (client) {
        const clientInfo = SUPPORTED_CLIENTS.find((c) => c.id === client);
        logger.keyValue('Client', `${clientInfo?.name} (${clientInfo?.configDir}/)`);
      }

      logger.blank();
      logger.box("Next steps:", [
        "1. Run '/nextai-analyze' in your AI client to generate project documentation",
        "2. Use '/nextai-create' to create a feature/bug/task",
        "3. Use '/nextai-refine' to start the refinement process",
      ]);
    } catch (error) {
      spinner.fail('Failed to initialize project');
      logger.error(String(error));
      process.exit(1);
    }
  });
