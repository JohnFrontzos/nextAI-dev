import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { confirmAction } from '../utils/prompts.js';
import { findProjectRoot, appendHistory } from '../utils/config.js';
import { findFeature, updateFeaturePhase } from '../../core/state/ledger.js';
import { archiveFeature } from '../utils/archive.js';

export const completeCommand = new Command('complete')
  .description('Archive a completed feature')
  .argument('<id>', 'Feature ID')
  .option('--skip-summary', 'Skip AI-generated summary (archive only)', false)
  .option('-f, --force', 'Bypass validation errors', false)
  .action(async (idArg, options) => {
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

      // Check phase (basic gate check - detailed validation happens in updateFeaturePhase)
      if (feature.phase !== 'testing' && !options.force) {
        logger.error(`Feature is in '${feature.phase}' phase, not 'testing'`);
        logger.dim('Use --force to complete anyway');
        process.exit(1);
      }

      const spinner = ora('Completing feature...').start();

      if (options.skipSummary) {
        // Simple archive without AI summary
        spinner.text = 'Archiving artifacts...';
        archiveFeature(projectRoot, feature.id);
        spinner.succeed('Feature archived');
      } else {
        // With AI summary - instruct user to run slash command
        spinner.stop();

        logger.info('Feature ready for completion!');
        logger.blank();
        logger.info('Run in your AI client:');
        console.log(chalk.cyan(`  /nextai-complete ${feature.id}`));
        logger.blank();
        logger.dim('This will:');
        logger.dim('  • Generate summary and archive artifacts');
        logger.dim('  • Update changelog and history');
        logger.dim('  • Refresh project documentation');
        logger.blank();
        logger.dim('Or use --skip-summary to archive without AI processing');

        const shouldArchiveOnly = await confirmAction(
          'Archive without AI summary?',
          false
        );

        if (shouldArchiveOnly) {
          const archiveSpinner = ora('Archiving...').start();
          archiveFeature(projectRoot, feature.id);
          archiveSpinner.succeed('Feature archived');
        } else {
          return;
        }
      }

      // Update phase with validation
      const result = await updateFeaturePhase(projectRoot, feature.id, 'complete', { force: options.force });

      if (!result.success) {
        // Show validation errors
        if (result.errors && result.errors.length > 0) {
          logger.error('Validation failed:');
          for (const err of result.errors) {
            logger.error(`  • ${err}`);
          }
          if (result.warnings && result.warnings.length > 0) {
            logger.warn('Warnings:');
            for (const warn of result.warnings) {
              logger.warn(`  • ${warn}`);
            }
          }
          logger.blank();
          logger.dim('Use --force to bypass validation');
        } else {
          logger.error('Failed to update phase');
          logger.dim(result.error || 'Unknown error');
        }
        process.exit(1);
      }

      // Show bypass warning if applicable
      if (result.bypassed) {
        logger.warn('Validation bypassed with --force (logged to history)');
      }

      logger.success(`Feature complete: ${feature.id}`);

      // Log event
      appendHistory(projectRoot, {
        event: 'feature_completed',
        feature_id: feature.id,
        total_phases: 7,
        retry_count: feature.retry_count,
      });

      logger.keyValue('Archive', `done/${feature.id}/`);
    } catch (error) {
      logger.error('Failed to complete feature');
      logger.dim(String(error));
      process.exit(1);
    }
  });
