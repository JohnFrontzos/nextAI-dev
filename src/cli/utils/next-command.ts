import chalk from 'chalk';
import { join } from 'path';
import { Phase } from '../../schemas/ledger.js';
import {
  existsWithContent,
  getTaskProgress,
  getReviewOutcome
} from '../../core/validation/phase-detection.js';

export interface NextCommandResult {
  command: string;
  isSlashCommand: boolean;
  description: string;
}

/**
 * Determines and prints the next command based on current phase and artifacts.
 * This function MUST be called after every successful phase advance.
 */
export function printNextCommand(
  featureId: string,
  currentPhase: Phase,
  featurePath: string
): NextCommandResult {
  const result = getNextCommand(featureId, currentPhase, featurePath);

  console.log(chalk.bold('\nNext step:'));
  console.log(`  ${result.description}`);

  if (result.isSlashCommand) {
    console.log(chalk.cyan(`\n  Run in your AI client:`));
    console.log(chalk.cyan(`    ${result.command}`));
  } else {
    console.log(chalk.cyan(`\n  Run:`));
    console.log(chalk.cyan(`    ${result.command}`));
  }

  return result;
}

/**
 * Get the next command to run based on current phase and artifact state.
 * Does not print anything - use printNextCommand for output.
 */
export function getNextCommand(
  featureId: string,
  phase: Phase,
  featurePath: string
): NextCommandResult {
  switch (phase) {
    case 'created': {
      const hasInit = existsWithContent(join(featurePath, 'planning', 'initialization.md'));
      if (!hasInit) {
        return {
          command: `nextai repair ${featureId}`,
          isSlashCommand: false,
          description: 'Feature not properly initialized',
        };
      }
      return {
        command: `/nextai-refine ${featureId}`,
        isSlashCommand: true,
        description: 'Start product refinement and technical specification',
      };
    }

    case 'product_refinement':
    case 'tech_spec': {
      const hasSpec = existsWithContent(join(featurePath, 'spec.md'));
      const hasTasks = existsWithContent(join(featurePath, 'tasks.md'));
      if (!hasSpec || !hasTasks) {
        return {
          command: `/nextai-refine ${featureId}`,
          isSlashCommand: true,
          description: 'Complete technical specification',
        };
      }
      return {
        command: `/nextai-implement ${featureId}`,
        isSlashCommand: true,
        description: 'Implement the feature tasks',
      };
    }

    case 'implementation': {
      const progress = getTaskProgress(join(featurePath, 'tasks.md'));
      if (!progress.isComplete) {
        return {
          command: `/nextai-implement ${featureId}`,
          isSlashCommand: true,
          description: `Continue implementation (${progress.completed}/${progress.total} tasks done)`,
        };
      }
      return {
        command: `/nextai-review ${featureId}`,
        isSlashCommand: true,
        description: 'Run code review',
      };
    }

    case 'review': {
      const outcome = getReviewOutcome(join(featurePath, 'review.md'));
      if (!outcome.isComplete) {
        return {
          command: `/nextai-review ${featureId}`,
          isSlashCommand: true,
          description: 'Complete code review',
        };
      }
      if (outcome.verdict === 'fail') {
        return {
          command: `/nextai-implement ${featureId}`,
          isSlashCommand: true,
          description: 'Fix review issues and re-implement',
        };
      }
      return {
        command: `nextai testing ${featureId}`,
        isSlashCommand: false,
        description: 'Run manual testing and log results',
      };
    }

    case 'testing': {
      return {
        command: `/nextai-complete ${featureId}`,
        isSlashCommand: true,
        description: 'Complete and archive the feature',
      };
    }

    case 'complete': {
      return {
        command: `nextai show ${featureId}`,
        isSlashCommand: false,
        description: 'Feature is complete!',
      };
    }

    default:
      return {
        command: `nextai resume ${featureId}`,
        isSlashCommand: false,
        description: 'Check feature status',
      };
  }
}
