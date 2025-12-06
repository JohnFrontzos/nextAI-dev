import { Command } from 'commander';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { findProjectRoot } from '../utils/config.js';
import { findFeature, updateFeaturePhase } from '../../core/state/ledger.js';
import { getFeaturePath } from '../../core/scaffolding/feature.js';
import {
  detectPhaseFromArtifacts,
  getNextPhase,
  canTransitionTo,
  getReviewOutcome
} from '../../core/validation/phase-detection.js';
import { printNextCommand } from '../utils/next-command.js';
import {
  handleReviewFailure,
  handleReviewSuccess
} from '../utils/retry-handler.js';
import { Phase, PHASE_ORDER } from '../../schemas/ledger.js';

export const advanceCommand = new Command('advance')
  .description('Advance a feature to the next phase based on artifact state')
  .argument('<id>', 'Feature ID (partial match supported)')
  .option('--to <phase>', 'Target phase (default: next in sequence)')
  .option('-f, --force', 'Bypass validation errors', false)
  .option('--dry-run', 'Show what would happen without changing state', false)
  .option('-q, --quiet', 'Suppress output (for scripting)', false)
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

      const featurePath = getFeaturePath(projectRoot, feature.id);

      // 1. Detect actual phase from artifacts
      const detectedPhase = detectPhaseFromArtifacts(featurePath);

      // 2. Determine target phase
      let targetPhase: Phase;
      if (options.to) {
        // Validate provided phase
        if (!PHASE_ORDER.includes(options.to as Phase)) {
          logger.error(`Invalid phase: ${options.to}`);
          logger.dim(`Valid phases: ${PHASE_ORDER.join(', ')}`);
          process.exit(1);
        }
        targetPhase = options.to as Phase;
      } else {
        // Default to next phase after detected phase
        const next = getNextPhase(detectedPhase);
        if (!next) {
          if (!options.quiet) {
            logger.info(`Feature is already at '${detectedPhase}' - no further phases`);
          }
          return;
        }
        targetPhase = next;
      }

      // 3. Check if ledger already matches
      if (feature.phase === targetPhase) {
        if (!options.quiet) {
          logger.info(`Already at phase: ${targetPhase}`);
          printNextCommand(feature.id, targetPhase, featurePath);
        }
        return;
      }

      // 4. Handle review fail case - special logic
      if (detectedPhase === 'review') {
        const outcome = getReviewOutcome(join(featurePath, 'review.md'));

        if (outcome.verdict === 'fail') {
          if (!options.quiet) {
            logger.warn('Review has FAIL verdict');
          }

          // Handle retry tracking
          const { blocked } = handleReviewFailure(projectRoot, feature.id);
          if (blocked) {
            process.exit(1);
          }

          // Transition back to implementation
          if (!options.dryRun) {
            await updateFeaturePhase(projectRoot, feature.id, 'implementation', { skipValidation: true });
          }

          if (!options.quiet) {
            if (options.dryRun) {
              logger.info(`[dry-run] Would transition: ${feature.phase} → implementation (review failed)`);
            } else {
              logger.success(`Returned to implementation phase (review failed)`);
              printNextCommand(feature.id, 'implementation', featurePath);
            }
          }
          return;
        }

        if (outcome.verdict === 'pass') {
          handleReviewSuccess(projectRoot, feature.id);
        }
      }

      // 5. Validate prerequisites (unless --force)
      if (!options.force) {
        const validation = canTransitionTo(featurePath, targetPhase);
        if (!validation.canTransition) {
          logger.error(`Cannot advance to '${targetPhase}'`);
          logger.dim(validation.reason || 'Validation failed');
          logger.blank();
          logger.dim('Use --force to bypass validation');
          process.exit(1);
        }
      }

      // 6. Dry run check
      if (options.dryRun) {
        if (!options.quiet) {
          logger.info(`[dry-run] Would advance: ${feature.phase} → ${targetPhase}`);
          logger.dim(`Detected phase from artifacts: ${detectedPhase}`);
        }
        return;
      }

      // 7. Update ledger
      const result = await updateFeaturePhase(
        projectRoot,
        feature.id,
        targetPhase,
        { force: options.force }
      );

      if (!result.success) {
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
        } else {
          logger.error(result.error || 'Failed to update phase');
        }
        process.exit(1);
      }

      // 8. Output result
      if (!options.quiet) {
        if (result.bypassed) {
          logger.warn('Validation bypassed with --force (logged to history)');
        }

        logger.success(`Advanced: ${feature.phase} → ${targetPhase}`);
        printNextCommand(feature.id, targetPhase, featurePath);
      }
    } catch (error) {
      logger.error('Failed to advance phase');
      logger.dim(String(error));
      process.exit(1);
    }
  });
