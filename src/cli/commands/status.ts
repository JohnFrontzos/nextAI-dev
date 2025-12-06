import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { findProjectRoot, appendHistory } from '../utils/config.js';
import {
  getFeature,
  findFeature,
  blockFeature,
  unblockFeature,
  incrementRetryCount,
  resetRetryCount,
} from '../../core/state/ledger.js';

export const statusCommand = new Command('status')
  .description('Update feature status (block, retry count)')
  .argument('<id>', 'Feature ID')
  .option('--block <reason>', 'Block feature with reason')
  .option('--unblock', 'Remove block from feature')
  .option('--retry-increment', 'Increment retry count')
  .option('--retry-reset', 'Reset retry count to 0')
  .option('--json', 'Output as JSON', false)
  .action((idArg, options) => {
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

      // Track what changed
      const changes: string[] = [];

      // Handle block/unblock
      if (options.block) {
        blockFeature(projectRoot, feature.id, options.block);
        changes.push(`blocked: "${options.block}"`);

        appendHistory(projectRoot, {
          event: 'feature_blocked',
          feature_id: feature.id,
          reason: options.block,
        });
      } else if (options.unblock) {
        if (feature.blocked_reason) {
          unblockFeature(projectRoot, feature.id);
          changes.push('unblocked');

          appendHistory(projectRoot, {
            event: 'feature_unblocked',
            feature_id: feature.id,
          });
        } else {
          if (!options.json) {
            logger.warn('Feature is not blocked');
          }
        }
      }

      // Handle retry count
      if (options.retryIncrement) {
        const newCount = incrementRetryCount(projectRoot, feature.id);
        changes.push(`retry_count: ${newCount}`);

        appendHistory(projectRoot, {
          event: 'retry_incremented',
          feature_id: feature.id,
          new_count: newCount,
        });

        // Warn if approaching limit
        if (newCount >= 5 && !options.json) {
          logger.warn(`Retry count is ${newCount} - manual intervention may be needed`);
        }
      } else if (options.retryReset) {
        resetRetryCount(projectRoot, feature.id);
        changes.push('retry_count: 0');

        appendHistory(projectRoot, {
          event: 'retry_reset',
          feature_id: feature.id,
        });
      }

      // If no action specified, just show current status
      if (changes.length === 0) {
        const currentFeature = getFeature(projectRoot, feature.id);
        if (options.json) {
          console.log(
            JSON.stringify({
              id: currentFeature?.id,
              phase: currentFeature?.phase,
              blocked_reason: currentFeature?.blocked_reason,
              retry_count: currentFeature?.retry_count,
            })
          );
        } else {
          logger.keyValue('ID', currentFeature?.id || '');
          logger.keyValue('Phase', currentFeature?.phase || '');
          logger.keyValue('Blocked', currentFeature?.blocked_reason || 'no');
          logger.keyValue('Retry count', String(currentFeature?.retry_count || 0));
        }
        return;
      }

      // Output result
      if (options.json) {
        const updatedFeature = getFeature(projectRoot, feature.id);
        console.log(
          JSON.stringify({
            id: updatedFeature?.id,
            phase: updatedFeature?.phase,
            blocked_reason: updatedFeature?.blocked_reason,
            retry_count: updatedFeature?.retry_count,
            changes,
          })
        );
      } else {
        logger.success(`Updated ${feature.id}`);
        for (const change of changes) {
          logger.subItem(change);
        }
      }
    } catch (error) {
      logger.error('Failed to update status');
      logger.dim(String(error));
      process.exit(1);
    }
  });
