import { Command } from 'commander';
import { writeFileSync, appendFileSync, existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { findProjectRoot } from '../utils/config.js';
import { findFeature, updateFeaturePhase } from '../../core/state/ledger.js';
import { getFeaturePath } from '../../core/scaffolding/feature.js';
import { printNextCommand } from '../utils/next-command.js';

/**
 * Check attachments folder for evidence files
 */
export function checkAttachmentsFolder(projectRoot: string, featureId: string): string[] {
  const attachmentsPath = join(projectRoot, 'nextai', 'todo', featureId, 'attachments', 'evidence');

  if (!existsSync(attachmentsPath)) {
    return [];
  }

  try {
    const files = readdirSync(attachmentsPath);
    return files
      .filter(file => {
        const filePath = join(attachmentsPath, file);
        return statSync(filePath).isFile();
      })
      .map(file => `attachments/evidence/${file}`);
  } catch (error) {
    return [];
  }
}

/**
 * Get next session number by parsing existing testing.md
 */
export function getNextSessionNumber(testingPath: string): number {
  if (!existsSync(testingPath)) {
    return 1;
  }

  try {
    const content = readFileSync(testingPath, 'utf-8');
    const sessionMatches = content.match(/### Session (\d+)/g);

    if (!sessionMatches || sessionMatches.length === 0) {
      return 1;
    }

    const sessionNumbers = sessionMatches.map(match => {
      const num = match.match(/### Session (\d+)/);
      return num ? parseInt(num[1], 10) : 0;
    });

    return Math.max(...sessionNumbers) + 1;
  } catch (error) {
    return 1;
  }
}

/**
 * Trigger investigator agent on test failure (placeholder for now)
 */
async function triggerInvestigator(
  projectRoot: string,
  featureId: string,
  failureNotes: string,
  attachments: string[]
): Promise<void> {
  // Placeholder for future investigator integration
  logger.dim('Investigation trigger: Future integration with testing-investigator skill');
  logger.dim(`Failure notes: ${failureNotes}`);
  if (attachments.length > 0) {
    logger.dim(`Attachments: ${attachments.join(', ')}`);
  }
}

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

      // Validate status (now optional, handled by template in conversational mode)
      if (!options.status) {
        logger.error('Status is required. Use --status pass or --status fail');
        logger.dim('Conversational mode is handled by the command template in Claude Code');
        process.exit(1);
      }

      const status = options.status;
      if (!['pass', 'fail'].includes(status.toLowerCase())) {
        logger.error('Invalid status. Use "pass" or "fail"');
        process.exit(1);
      }

      const normalizedStatus = status.toLowerCase() as 'pass' | 'fail';

      // Notes are optional, default to CLI-generated message
      const notes = options.notes || 'Logged via CLI';

      // Auto-check attachments folder
      const autoAttachments = checkAttachmentsFolder(projectRoot, feature.id);

      // Get attachments from options or use auto-detected
      const attachments = options.attachments
        ? options.attachments.split(',').map((p: string) => p.trim())
        : autoAttachments;

      // Get session number
      const testingPath = join(getFeaturePath(projectRoot, feature.id), 'testing.md');
      const sessionNumber = getNextSessionNumber(testingPath);

      // Create test entry
      const testEntry = generateTestSessionEntry(sessionNumber, normalizedStatus, notes, attachments);

      // Append to testing.md
      appendTestEntry(testingPath, testEntry);

      // Trigger investigator on FAIL
      if (normalizedStatus === 'fail') {
        await triggerInvestigator(projectRoot, feature.id, notes, attachments);
      }

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

export function generateTestSessionEntry(
  sessionNumber: number,
  status: 'pass' | 'fail',
  notes: string,
  attachments: string[]
): string {
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  let entry = `\n### Session ${sessionNumber} - ${dateStr}\n`;
  entry += `**Status:** ${status.toUpperCase()}\n`;
  entry += `**Notes:** ${notes || 'No notes provided'}\n`;

  if (attachments.length > 0) {
    entry += `\n**Attachments:**\n`;
    for (const attachment of attachments) {
      entry += `- ${attachment}\n`;
    }
  }

  // Add investigation report placeholder for FAIL
  if (status === 'fail') {
    entry += `\n#### Investigation Report\n`;
    entry += `<!-- Investigation findings will be added here -->\n`;
  }

  entry += '\n';

  return entry;
}

function appendTestEntry(testingPath: string, entry: string): void {
  if (!existsSync(testingPath)) {
    // Create new testing.md with header (matching Phase 4 template)
    const header = `# Testing\n\n## Manual Test Checklist\n\n<!-- Add test cases here -->\n\n---\n\n## Test Sessions\n`;
    writeFileSync(testingPath, header + entry);
  } else {
    // Check if file has the new structure with Test Sessions header
    const content = readFileSync(testingPath, 'utf-8');

    if (!content.includes('## Test Sessions')) {
      // Old format - add Test Sessions header before appending
      const updatedContent = content + '\n---\n\n## Test Sessions\n';
      writeFileSync(testingPath, updatedContent + entry);
    } else {
      // New format - just append
      appendFileSync(testingPath, entry);
    }
  }
}
