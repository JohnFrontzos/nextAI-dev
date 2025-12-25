import { Command } from 'commander';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { findProjectRoot } from '../utils/config.js';
import { listFeatures } from '../../core/state/ledger.js';
import { getFeaturePath } from '../../core/scaffolding/feature.js';
import { getTaskProgress, getReviewOutcome } from '../../core/validation/phase-detection.js';
import type { Phase, FeatureType } from '../../schemas/ledger.js';

export const listCommand = new Command('list')
  .description('List all features with status')
  .option('-a, --all', 'Include completed features', false)
  .option('-t, --type <type>', 'Filter by type: feature, bug, task')
  .option('-p, --phase <phase>', 'Filter by phase')
  .option('--json', 'Output as JSON', false)
  .action((options) => {
    // Find project root
    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      logger.error('Project not initialized');
      logger.dim('Run `nextai init` to initialize this project');
      process.exit(1);
    }

    try {
      const features = listFeatures(projectRoot, {
        includeComplete: options.all,
        type: options.type as FeatureType | undefined,
        phase: options.phase as Phase | undefined,
      });

      if (options.json) {
        console.log(JSON.stringify(features, null, 2));
        return;
      }

      if (features.length === 0) {
        logger.info('No features found');
        if (!options.all) {
          logger.dim('Use --all to include completed features');
        }
        return;
      }

      // Print header
      const header = [
        'ID'.padEnd(42),
        'TYPE'.padEnd(8),
        'PHASE'.padEnd(18),
        'STATUS',
      ].join('  ');

      console.log(chalk.bold(header));
      console.log(chalk.dim('─'.repeat(100)));

      // Print features
      for (const feature of features) {
        const id = feature.id.padEnd(42);
        const type = feature.type.padEnd(8);
        const phase = formatPhase(feature.phase).padEnd(18);

        // Get status text based on phase
        let statusText = '';
        if (feature.blocked_reason) {
          statusText = chalk.red('BLOCKED');
        } else {
          const featurePath = getFeaturePath(projectRoot, feature.id);

          if (feature.phase === 'implementation') {
            const taskProgress = getTaskProgress(featurePath + '/tasks.md');
            if (taskProgress.total > 0) {
              statusText = chalk.dim(`${taskProgress.completed}/${taskProgress.total} tasks`);
            }
          } else if (feature.phase === 'review') {
            const reviewOutcome = getReviewOutcome(featurePath + '/review.md');
            if (reviewOutcome.verdict === 'pass') {
              statusText = chalk.green('PASS');
            } else if (reviewOutcome.verdict === 'fail') {
              statusText = chalk.red('FAIL - needs fixes');
            }
          } else if (feature.phase === 'complete') {
            statusText = chalk.dim('archived');
          }

          // Append retry count if > 0
          if (feature.retry_count > 0) {
            statusText += statusText ? ' ' : '';
            statusText += chalk.yellow(`(retry #${feature.retry_count})`);
          }
        }

        const line = [id, type, phase, statusText].join('  ');

        // Color based on phase
        if (feature.phase === 'complete') {
          console.log(chalk.dim(line));
        } else if (feature.blocked_reason) {
          console.log(chalk.yellow(line));
        } else {
          console.log(line);
        }
      }

      logger.blank();
      logger.dim(`${features.length} feature(s)`);
    } catch (error) {
      logger.error('Failed to list features');
      logger.dim(String(error));
      process.exit(1);
    }
  });

function formatPhase(phase: Phase): string {
  const phaseLabels: Record<Phase, string> = {
    created: 'created',
    product_refinement: 'product_refinement',
    tech_spec: 'tech_spec',
    implementation: 'implementation',
    review: 'review',
    testing: 'testing',
    complete: 'complete',
  } as const;
  return phaseLabels[phase];
}
