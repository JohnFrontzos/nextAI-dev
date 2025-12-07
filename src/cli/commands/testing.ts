import { Command } from 'commander';
import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { selectOption, inputText } from '../utils/prompts.js';
import { findProjectRoot } from '../utils/config.js';
import { findFeature, updateFeaturePhase } from '../../core/state/ledger.js';
import { getFeaturePath } from '../../core/scaffolding/feature.js';
import { printNextCommand } from '../utils/next-command.js';

export const testingCommand = new Command('testing')
  .description('Log manual test results')
  .argument('<id>', 'Feature ID')
  .option('-s, --status <status>', 'Test status: pass or fail')
  .option('-n, --notes <text>', 'Test notes')
  .option('-a, --attachments <paths>', 'Comma-separated paths to attachments')
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

      // Check phase
      if (feature.phase !== 'testing') {
        logger.warn(`Feature is in '${feature.phase}' phase, not 'testing'`);
        logger.dim('Testing can only be logged when feature is in testing phase');
        process.exit(1);
      }

      // Get test status
      let status = options.status;
      if (!status) {
        status = await selectOption('Test result:', [
          { value: 'pass', name: 'PASS - Feature works as expected' },
          { value: 'fail', name: 'FAIL - Issues found' },
        ]);
      }

      if (!['pass', 'fail'].includes(status.toLowerCase())) {
        logger.error('Invalid status. Use "pass" or "fail"');
        process.exit(1);
      }

      const normalizedStatus = status.toLowerCase() as 'pass' | 'fail';

      // Get notes
      let notes = options.notes;
      if (!notes) {
        notes = await inputText('Test notes (what was tested, results):');
      }

      // Get attachments
      const attachments = options.attachments
        ? options.attachments.split(',').map((p: string) => p.trim())
        : [];

      // Create test entry
      const testEntry = generateTestEntry(normalizedStatus, notes, attachments);

      // Append to testing.md
      const testingPath = join(getFeaturePath(projectRoot, feature.id), 'testing.md');
      appendTestEntry(testingPath, testEntry);

      logger.success(`Logged test run for ${feature.id}`);
      logger.keyValue('Status', normalizedStatus === 'pass' ? chalk.green('PASS') : chalk.red('FAIL'));
      if (notes) {
        logger.keyValue('Notes', notes.substring(0, 50) + (notes.length > 50 ? '...' : ''));
      }

      const featurePath = getFeaturePath(projectRoot, feature.id);

      // Update phase based on result
      if (normalizedStatus === 'pass') {
        logger.blank();
        logger.success('Testing passed! Feature is ready for completion.');
        logger.dim('The next command will generate a summary, archive artifacts, and update the ledger.');
        printNextCommand(feature.id, 'testing', featurePath);
      } else {
        // Return to implementation (skip validation since we're going backwards)
        // No retry limit for operator testing - they can test as many times as needed
        const result = await updateFeaturePhase(projectRoot, feature.id, 'implementation', { skipValidation: true });
        if (result.success) {
          logger.blank();
          logger.warn('Testing failed - returning to implementation');
          logger.dim('Fix the issues and run through review again before re-testing.');
          printNextCommand(feature.id, 'implementation', featurePath);
        }
      }
    } catch (error) {
      logger.error('Failed to log test');
      logger.dim(String(error));
      process.exit(1);
    }
  });

function generateTestEntry(
  status: 'pass' | 'fail',
  notes: string,
  attachments: string[]
): string {
  const timestamp = new Date().toISOString();
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  let entry = `\n## Test Run - ${dateStr}\n\n`;
  entry += `**Status:** ${status}\n`;
  entry += `**Timestamp:** ${timestamp}\n`;
  entry += `**Notes:** ${notes || 'No notes provided'}\n`;

  if (attachments.length > 0) {
    entry += `**Attachments:**\n`;
    for (const attachment of attachments) {
      entry += `- ${attachment}\n`;
    }
  }

  entry += '\n---\n';

  return entry;
}

function appendTestEntry(testingPath: string, entry: string): void {
  if (!existsSync(testingPath)) {
    // Create new testing.md with header
    const header = `# Testing Log\n\nManual test results for this feature.\n\n---\n`;
    writeFileSync(testingPath, header + entry);
  } else {
    appendFileSync(testingPath, entry);
  }
}
