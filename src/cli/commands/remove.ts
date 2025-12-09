import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { findProjectRoot } from '../utils/config.js';
import { findFeature, removeFeature } from '../../core/state/ledger.js';
import { moveToRemoved, getRemovedPath } from '../utils/remove.js';
import { confirmAction } from '../utils/prompts.js';

export const removeCommand = new Command('remove')
  .description('Remove a feature from nextai/todo/')
  .argument('<id>', 'Feature ID')
  .action(async (idArg) => {
    // Find project root
    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      logger.error('Project not initialized');
      logger.dim('Run `nextai init` to initialize this project');
      process.exit(1);
    }

    try {
      // Find feature
      const feature = findFeature(projectRoot, idArg);
      if (!feature) {
        logger.error(`Feature '${idArg}' not found`);
        process.exit(1);
      }

      // Display feature details
      logger.blank();
      logger.info(`Feature: ${chalk.cyan(feature.id)}`);
      logger.keyValue('Title', feature.title);
      logger.keyValue('Type', feature.type);
      logger.keyValue('Phase', feature.phase);
      logger.keyValue('Location', `nextai/todo/${feature.id}/`);
      logger.blank();

      // Prompt for confirmation
      logger.warn('This will move the feature to nextai/removed/ for manual cleanup.');
      const confirmed = await confirmAction(
        'Are you sure you want to remove this feature?',
        false
      );

      if (!confirmed) {
        logger.info('Removal cancelled.');
        process.exit(2);
      }

      logger.blank();

      // Move folder
      const moveSpinner = ora('Moving feature folder...').start();
      try {
        moveToRemoved(projectRoot, feature.id);
        moveSpinner.succeed('Feature folder moved');
      } catch (error) {
        moveSpinner.fail('Failed to move feature folder');
        logger.error(String(error));
        process.exit(1);
      }

      // Update ledger
      const ledgerSpinner = ora('Updating ledger...').start();
      try {
        removeFeature(projectRoot, feature.id);
        ledgerSpinner.succeed('Ledger updated');
      } catch (error) {
        ledgerSpinner.fail('Ledger update failed');
        logger.error('⚠️  CRITICAL: Feature moved but ledger update failed');
        logger.error(String(error));
        logger.blank();
        logger.error('Manual recovery required:');
        logger.dim(`  1. Feature is in: ${getRemovedPath(projectRoot, feature.id)}`);
        logger.dim('  2. Ledger still shows the feature as active');
        logger.dim('  3. Run: nextai repair');
        process.exit(1);
      }

      // Success
      logger.blank();
      logger.success(`Removed feature: ${feature.id}`);
      logger.blank();
      logger.keyValue('Moved to', `nextai/removed/${feature.id}/`);
      logger.keyValue('Ledger', 'Entry removed');
      logger.keyValue('History', 'Logged removal event');
      logger.blank();
      logger.dim('Note: The feature folder is preserved in nextai/removed/ and can be manually deleted later.');
    } catch (error) {
      logger.error('Failed to remove feature');
      logger.dim(String(error));
      process.exit(1);
    }
  });
