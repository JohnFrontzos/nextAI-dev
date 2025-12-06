import { Command } from 'commander';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { inputText, selectOption } from '../utils/prompts.js';
import { findProjectRoot } from '../utils/config.js';
import { addFeature } from '../../core/state/ledger.js';
import { scaffoldFeature } from '../../core/scaffolding/feature.js';
import { NextAIError } from '../../types/index.js';
import type { FeatureType } from '../../schemas/ledger.js';

export const createCommand = new Command('create')
  .description('Create a new feature, bug, or task')
  .argument('[title]', 'Feature title')
  .option('-t, --type <type>', 'Type: feature, bug, task', 'feature')
  .option('-e, --external-id <id>', 'External tracker ID (e.g., JIRA-123)')
  .action(async (titleArg, options) => {
    // Find project root
    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      logger.error('Project not initialized');
      logger.dim('Run `nextai init` to initialize this project');
      process.exit(1);
    }

    // Validate type
    const validTypes: FeatureType[] = ['feature', 'bug', 'task'];
    if (!validTypes.includes(options.type)) {
      logger.error(`Invalid type: ${options.type}`);
      logger.dim('Valid types: feature, bug, task');
      process.exit(1);
    }

    const type: FeatureType = options.type;

    // Get title
    let title = titleArg;
    if (!title) {
      title = await inputText(`Enter ${type} title:`);
      if (!title.trim()) {
        logger.error('Title is required');
        process.exit(1);
      }
    }

    // Get description interactively
    let description: string | undefined;
    const shouldAddDescription = await selectOption(
      'Add a description now?',
      [
        { value: 'yes', name: 'Yes, add description' },
        { value: 'no', name: 'No, I\'ll add it later' },
      ]
    );

    if (shouldAddDescription === 'yes') {
      description = await inputText('Enter description (or press Enter to skip):');
    }

    const spinner = ora('Creating feature...').start();

    try {
      // Add to ledger
      const feature = addFeature(projectRoot, title, type, options.externalId);

      // Scaffold folder
      spinner.text = 'Scaffolding feature folder...';
      scaffoldFeature(projectRoot, feature.id, title, type, description);

      spinner.succeed(`Created ${type}: ${feature.id}`);

      logger.keyValue('Folder', `todo/${feature.id}/`);
      logger.keyValue('Phase', feature.phase);
      if (options.externalId) {
        logger.keyValue('External ID', options.externalId);
      }

      logger.blank();
      logger.box('Next steps:', [
        `1. Add context to todo/${feature.id}/planning/initialization.md`,
        `2. Run: /nextai-refine ${feature.id}`,
      ]);
    } catch (error) {
      spinner.fail('Failed to create feature');
      if (error instanceof NextAIError) {
        logger.error(error.message);
        if (error.details) logger.dim(error.details);
      } else {
        logger.error(String(error));
      }
      process.exit(1);
    }
  });
