import { Command } from 'commander';
import { join } from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { findProjectRoot } from '../utils/config.js';
import { findFeature, getActiveFeatures, updateFeaturePhase } from '../../core/state/ledger.js';
import { getFeaturePath } from '../../core/scaffolding/feature.js';
import {
  getTaskProgress,
  getReviewOutcome,
  detectPhaseFromArtifacts,
  phaseIndex,
  getNextPhase
} from '../../core/validation/phase-detection.js';
import { getValidatorForPhase } from '../../core/validation/phase-validators.js';
import { printNextCommand } from '../utils/next-command.js';
import {
  handleReviewFailure,
  handleReviewSuccess
} from '../utils/retry-handler.js';
import type { Feature } from '../../schemas/ledger.js';

export const resumeCommand = new Command('resume')
  .description('Smart continuation - reads feature state and suggests next action')
  .argument('[id]', 'Feature ID (required if multiple active)')
  .option('-f, --force', 'Bypass validation errors', false)
  .option('--sync', 'Auto-sync ledger (must be explicit)')
  .option('--no-sync', 'Do not sync ledger (default)')
  .option('--no-advance', 'Do not auto-advance, just show status', false)
  .action(async (idArg, options) => {
    // Find project root
    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      logger.error('Project not initialized');
      logger.dim('Run `nextai init` to initialize this project');
      process.exit(1);
    }

    try {
      let feature: Feature | undefined;

      if (idArg) {
        // Find specific feature
        feature = findFeature(projectRoot, idArg);
        if (!feature) {
          logger.error(`Feature '${idArg}' not found`);
          process.exit(1);
        }
      } else {
        // Auto-select if only one active feature
        const activeFeatures = getActiveFeatures(projectRoot);

        if (activeFeatures.length === 0) {
          logger.info('No active features');
          logger.dim('Use `nextai create` to create a new feature');
          return;
        }

        if (activeFeatures.length === 1) {
          feature = activeFeatures[0];
          logger.info(`Auto-selected: ${feature.id}`);
        } else {
          // Multiple active features - error with list (no prompts for AI-driven usage)
          logger.error('Multiple active features - specify which one:');
          for (const f of activeFeatures) {
            logger.info(`  • ${f.id} (${f.phase})`);
          }
          logger.blank();
          logger.dim('Usage: nextai resume <feature-id>');
          process.exit(1);
        }
      }

      if (!feature) {
        logger.error('No feature selected');
        process.exit(1);
      }

      const featurePath = getFeaturePath(projectRoot, feature.id);

      // Detect actual phase from artifacts
      const detectedPhase = detectPhaseFromArtifacts(featurePath);
      const ledgerPhaseIndex = phaseIndex(feature.phase);
      const detectedPhaseIndex = phaseIndex(detectedPhase);

      // Show feature info
      console.log(chalk.bold(`Feature: ${feature.id}`));
      logger.keyValue('Ledger Phase', feature.phase);

      // Check if ledger is behind artifacts
      if (detectedPhaseIndex > ledgerPhaseIndex && options.advance !== false) {
        logger.warn(`Ledger shows '${feature.phase}' but artifacts indicate '${detectedPhase}'`);

        // Handle review fail case specially
        if (detectedPhase === 'review') {
          const outcome = getReviewOutcome(join(featurePath, 'review.md'));
          if (outcome.verdict === 'fail') {
            logger.warn('Review has FAIL verdict - returning to implementation');
            const { blocked } = handleReviewFailure(projectRoot, feature.id);
            if (blocked) {
              return;
            }
            await updateFeaturePhase(projectRoot, feature.id, 'implementation', { skipValidation: true });
            // Refresh feature
            feature = findFeature(projectRoot, feature.id)!;
            logger.success(`Synced to: implementation (review failed)`);
            printNextCommand(feature.id, 'implementation', featurePath);
            return;
          } else if (outcome.verdict === 'pass') {
            handleReviewSuccess(projectRoot, feature.id);
          }
        }

        // Determine target phase (next after detected)
        const targetPhase = getNextPhase(detectedPhase) || detectedPhase;

        // Sync only when explicitly requested (no prompts for AI-driven usage)
        const shouldSync = options.sync === true;

        if (!shouldSync) {
          logger.dim(`Ledger out of sync. Run with --sync to update to '${targetPhase}'`);
        }

        if (shouldSync) {
          const result = await updateFeaturePhase(
            projectRoot,
            feature.id,
            targetPhase,
            { force: options.force }
          );

          if (result.success) {
            logger.success(`Synced ledger: ${feature.phase} → ${targetPhase}`);
            // Refresh feature after update
            feature = findFeature(projectRoot, feature.id)!;
          } else {
            logger.error('Failed to sync ledger');
            if (result.error) logger.dim(result.error);
          }
        }
      }

      const taskProgress = getTaskProgress(join(featurePath, 'tasks.md'));
      const reviewOutcome = getReviewOutcome(join(featurePath, 'review.md'));

      // Show status with context
      let statusText = feature.blocked_reason ? chalk.red('BLOCKED') : chalk.green('Ready');
      if (feature.phase === 'implementation' && taskProgress.total > 0) {
        statusText += chalk.dim(` (${taskProgress.completed}/${taskProgress.total} tasks)`);
      } else if (feature.phase === 'review' && reviewOutcome.verdict === 'fail') {
        statusText += chalk.red(' (review failed)');
      }
      if (feature.retry_count > 0) {
        statusText += chalk.yellow(` [retry ${feature.retry_count}]`);
      }
      logger.keyValue('Status', statusText);

      // Handle blocked state
      if (feature.blocked_reason && !options.force) {
        logger.blank();
        logger.warn(`Blocked: ${feature.blocked_reason}`);
        logger.blank();
        logger.box('Suggested actions:', [
          `1. Review and fix the blocking issue`,
          `2. Run: nextai repair ${feature.id}`,
          `3. Then: nextai resume ${feature.id}`,
          ``,
          `Or use --force to bypass validation`,
        ]);
        return;
      }

      // Run validation for current phase to show any issues
      const validator = getValidatorForPhase(feature.phase);
      if (validator) {
        const validationResult = await validator.validate(featurePath);
        if (!validationResult.valid) {
          logger.blank();
          logger.warn('Validation issues for current phase:');
          for (const err of validationResult.errors) {
            logger.error(`  • ${err}`);
          }
          for (const warn of validationResult.warnings) {
            logger.warn(`  • ${warn}`);
          }
        }
      }

      // Print next command
      printNextCommand(feature.id, feature.phase, featurePath);
    } catch (error) {
      logger.error('Failed to resume');
      logger.dim(String(error));
      process.exit(1);
    }
  });
