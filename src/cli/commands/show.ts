import { Command } from 'commander';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { findProjectRoot } from '../utils/config.js';
import { findFeature, listFeatures } from '../../core/state/ledger.js';
import { getFeaturePath } from '../../core/scaffolding/feature.js';
import { getAllPhaseStatuses, getTaskProgress, getReviewOutcome, suggestNextAction } from '../../core/validation/phase-detection.js';
import type { Phase } from '../../schemas/ledger.js';
import { getPhaseFlow } from '../../schemas/ledger.js';

export const showCommand = new Command('show')
  .description('Show details of a specific feature')
  .argument('<id>', 'Feature ID or partial match')
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
      const feature = findFeature(projectRoot, idArg);

      if (!feature) {
        logger.error(`Feature '${idArg}' not found`);

        // Show suggestions
        const allFeatures = listFeatures(projectRoot, { includeComplete: true });
        const suggestions = allFeatures
          .filter((f) => f.id.toLowerCase().includes(idArg.toLowerCase()))
          .slice(0, 3);

        if (suggestions.length > 0) {
          logger.blank();
          logger.info('Did you mean:');
          for (const s of suggestions) {
            logger.dim(`  ${s.id}`);
          }
        }
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(feature, null, 2));
        return;
      }

      // Print feature details
      console.log(chalk.bold(`Feature: ${feature.id}`));
      console.log(chalk.dim('─'.repeat(50)));

      logger.keyValue('Title', feature.title);
      logger.keyValue('Type', feature.type);
      logger.keyValue('Phase', formatPhase(feature.phase));
      logger.keyValue('Blocked', feature.blocked_reason || chalk.dim('—'));
      logger.keyValue('Retry Count', String(feature.retry_count));
      logger.keyValue('Created', formatDate(feature.created_at));
      logger.keyValue('Updated', formatDate(feature.updated_at));
      if (feature.external_id) {
        logger.keyValue('External ID', feature.external_id);
      }

      // Show workflow visualization
      logger.blank();
      console.log(chalk.bold('Workflow:'));
      const phaseFlow = getPhaseFlow(feature.type);
      const flowStr = phaseFlow
        .map(p => p === feature.phase ? chalk.yellow(`[${p}]`) : chalk.dim(p))
        .join(' → ');
      console.log(`  ${flowStr}`);

      // Show phase status
      logger.blank();
      console.log(chalk.bold('Phase Status:'));

      const featurePath = getFeaturePath(projectRoot, feature.id);
      const phaseStatuses = getAllPhaseStatuses(featurePath);
      const taskProgress = getTaskProgress(featurePath + '/tasks.md');
      const reviewOutcome = getReviewOutcome(featurePath + '/review.md');

      for (const phaseStatus of phaseStatuses) {
        let statusIcon: string;
        let statusText = '';

        if (phaseStatus.isComplete) {
          statusIcon = chalk.green('✓');
        } else if (phaseStatus.phase === feature.phase) {
          statusIcon = chalk.yellow('◐');

          // Add progress details for certain phases
          if (phaseStatus.phase === 'implementation' && taskProgress.total > 0) {
            statusText = chalk.dim(` - ${taskProgress.completed}/${taskProgress.total} tasks complete`);
          } else if (phaseStatus.phase === 'review' && reviewOutcome.verdict !== 'pending') {
            statusText = chalk.dim(` - ${reviewOutcome.verdict.toUpperCase()}`);
          }
        } else {
          statusIcon = chalk.dim('○');
        }

        const phaseName = phaseStatus.phase.padEnd(20);
        console.log(`  ${statusIcon} ${phaseName}${statusText}`);
      }

      // Show next action using suggestNextAction
      logger.blank();
      const suggestion = suggestNextAction(featurePath);
      console.log(chalk.bold('Next:'));
      console.log(`  ${suggestion.action}`);
      if (suggestion.aiCommand) {
        console.log(`  ${chalk.cyan('AI:')}  ${suggestion.aiCommand.replace('<id>', feature.id)}`);
      }
      console.log(`  ${chalk.cyan('CLI:')} ${suggestion.cliCommand.replace('<id>', feature.id)}`);
      if (suggestion.hint) {
        console.log(chalk.dim(`  Hint: ${suggestion.hint}`));
      }
    } catch (error) {
      logger.error('Failed to show feature');
      logger.dim(String(error));
      process.exit(1);
    }
  });

function formatPhase(phase: Phase): string {
  const colors: Record<Phase, (text: string) => string> = {
    created: chalk.gray,
    bug_investigation: chalk.blue,
    product_refinement: chalk.blue,
    tech_spec: chalk.blue,
    implementation: chalk.yellow,
    review: chalk.magenta,
    testing: chalk.cyan,
    complete: chalk.green,
  };
  return colors[phase](phase);
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString();
}
