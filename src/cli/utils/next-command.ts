import chalk from 'chalk';
import { join } from 'path';
import { Phase } from '../../schemas/ledger.js';
import {
  existsWithContent,
  getTaskProgress,
  getReviewOutcome
} from '../../core/validation/phase-detection.js';

export interface NextCommandResult {
  aiCommand?: string;   // Slash command for AI clients (optional)
  cliCommand: string;   // CLI command for non-AI clients (always present)
  description: string;
  hint?: string;
}

/**
 * Determines and prints the next command based on current phase and artifacts.
 * Shows both AI (slash) and CLI commands to support all workflows.
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

  if (result.aiCommand) {
    console.log(chalk.cyan(`\n  AI client:`));
    console.log(chalk.cyan(`    ${result.aiCommand}`));
  }
  console.log(chalk.cyan(`\n  CLI:`));
  console.log(chalk.cyan(`    ${result.cliCommand}`));

  if (result.hint) {
    console.log(chalk.dim(`\n  Hint: ${result.hint}`));
  }

  return result;
}

/**
 * Get the next command to run based on current phase and artifact state.
 * Returns both AI (slash) and CLI commands to support all workflows.
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
          cliCommand: `nextai repair ${featureId}`,
          description: 'Feature not properly initialized',
        };
      }
      return {
        aiCommand: `/nextai-refine ${featureId}`,
        cliCommand: `nextai advance ${featureId}`,
        description: 'Start product refinement and technical specification',
      };
    }

    case 'product_refinement':
    case 'tech_spec': {
      const hasSpec = existsWithContent(join(featurePath, 'spec.md'));
      const hasTasks = existsWithContent(join(featurePath, 'tasks.md'));
      if (!hasSpec || !hasTasks) {
        return {
          aiCommand: `/nextai-refine ${featureId}`,
          cliCommand: `nextai advance ${featureId}`,
          description: 'Complete technical specification',
        };
      }
      return {
        aiCommand: `/nextai-implement ${featureId}`,
        cliCommand: `nextai advance ${featureId}`,
        description: 'Implement the feature tasks',
      };
    }

    case 'implementation': {
      const progress = getTaskProgress(join(featurePath, 'tasks.md'));
      if (!progress.isComplete) {
        return {
          aiCommand: `/nextai-implement ${featureId}`,
          cliCommand: `nextai advance ${featureId}`,
          description: `Continue implementation (${progress.completed}/${progress.total} tasks done)`,
        };
      }
      return {
        aiCommand: `/nextai-review ${featureId}`,
        cliCommand: `nextai advance ${featureId}`,
        description: 'Run code review',
      };
    }

    case 'review': {
      const outcome = getReviewOutcome(join(featurePath, 'review.md'));
      if (!outcome.isComplete) {
        return {
          aiCommand: `/nextai-review ${featureId}`,
          cliCommand: `nextai advance ${featureId}`,
          description: 'Complete code review',
        };
      }
      if (outcome.verdict === 'fail') {
        return {
          aiCommand: `/nextai-implement ${featureId}`,
          cliCommand: `nextai status ${featureId} --retry-increment`,
          description: 'Fix review issues and re-implement',
          hint: 'Increment retry count, then fix issues and advance',
        };
      }
      return {
        cliCommand: `nextai testing ${featureId} --status pass`,
        description: 'Run manual testing and log results',
      };
    }

    case 'testing': {
      return {
        aiCommand: `/nextai-complete ${featureId}`,
        cliCommand: `nextai complete ${featureId} --skip-summary`,
        description: 'Complete and archive the feature',
      };
    }

    case 'complete': {
      return {
        cliCommand: `nextai show ${featureId}`,
        description: 'Feature is complete!',
      };
    }

    default:
      return {
        cliCommand: `nextai resume ${featureId}`,
        description: 'Check feature status',
      };
  }
}
