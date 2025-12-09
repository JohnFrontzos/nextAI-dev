import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { findProjectRoot, appendHistory } from '../utils/config.js';
import { findFeature, validateFeatureForPhase, updateLedgerPhase } from '../../core/state/ledger.js';
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

      if (options.skipSummary) {
        // STEP 1: Validate from todo/ (unless --force)
        if (!options.force) {
          const spinner = ora('Validating feature...').start();
          const validation = await validateFeatureForPhase(
            projectRoot,
            feature.id,
            'complete'
          );

          if (!validation.success) {
            spinner.fail('Validation failed');
            logger.blank();
            if (validation.errors && validation.errors.length > 0) {
              logger.error('Validation errors:');
              for (const err of validation.errors) {
                logger.error(`  • ${err}`);
              }
            }
            if (validation.warnings && validation.warnings.length > 0) {
              logger.warn('Warnings:');
              for (const warn of validation.warnings) {
                logger.warn(`  • ${warn}`);
              }
            }
            logger.blank();
            logger.dim('Use --force to bypass validation');
            process.exit(1);
          }
          spinner.succeed('Validation passed');
        } else {
          logger.warn('⚠️  Bypassing validation with --force flag');
        }

        // STEP 2: Archive feature (todo/ → done/)
        const archiveSpinner = ora('Archiving artifacts...').start();
        try {
          archiveFeature(projectRoot, feature.id);
          archiveSpinner.succeed('Feature archived');
        } catch (error) {
          archiveSpinner.fail('Archive failed');
          logger.error(`Failed to archive feature: ${String(error)}`);
          logger.blank();
          logger.dim('Feature not archived - no changes made to ledger');
          process.exit(1);
        }

        // STEP 3: Update ledger (skip validation - already done)
        try {
          const result = updateLedgerPhase(projectRoot, feature.id, 'complete', {
            logBypass: options.force,
          });

          if (!result.success) {
            logger.error('⚠️  CRITICAL: Feature archived but ledger update failed');
            logger.error(`Error: ${result.error}`);
            logger.blank();
            logger.error('Manual recovery required:');
            logger.dim(`  1. Feature is in: nextai/done/${feature.id}/`);
            logger.dim('  2. Ledger still shows phase: testing');
            logger.dim(`  3. Run: nextai repair ${feature.id}`);
            process.exit(1);
          }

          if (options.force) {
            logger.warn('Validation bypassed with --force (logged to history)');
          }
        } catch (error) {
          logger.error('⚠️  CRITICAL: Feature archived but ledger update failed');
          logger.error(String(error));
          logger.blank();
          logger.error('Manual recovery required:');
          logger.dim(`  1. Feature is in: nextai/done/${feature.id}/`);
          logger.dim('  2. Ledger still shows phase: testing');
          logger.dim(`  3. Run: nextai repair ${feature.id}`);
          process.exit(1);
        }

        logger.success(`Feature complete: ${feature.id}`);

        // Log event
        appendHistory(projectRoot, {
          event: 'feature_completed',
          feature_id: feature.id,
          total_phases: 7,
          retry_count: feature.retry_count,
        });

        logger.keyValue('Archive', `nextai/done/${feature.id}/`);
      } else {
        // Without --skip-summary, instruct user to run slash command (no prompt!)
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
        process.exit(2);  // Action required: use slash command
      }
    } catch (error) {
      logger.error('Failed to complete feature');
      logger.dim(String(error));
      process.exit(1);
    }
  });
