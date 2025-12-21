import { Command } from 'commander';
import { writeFileSync, appendFileSync, existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import { findProjectRoot, ensureDir } from '../utils/config.js';
import { findFeature, updateFeaturePhase } from '../../core/state/ledger.js';
import { getFeaturePath } from '../../core/scaffolding/feature.js';
import { printNextCommand } from '../utils/next-command.js';
import { selectOption } from '../utils/prompts.js';

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
 * Interface for Investigator classification result
 */
interface InvestigatorClassification {
  classification: 'BUG' | 'SPEC_CHANGE';
  confidence: number;
  reasoning: string;
  specChangeDescription?: string;
}

/**
 * Trigger investigator agent on test failure
 */
async function triggerInvestigator(
  projectRoot: string,
  featureId: string,
  failureNotes: string,
  attachments: string[]
): Promise<void> {
  // 1. Get feature paths
  const featurePath = getFeaturePath(projectRoot, featureId);
  const specPath = join(featurePath, 'spec.md');

  // 2. Check if spec.md exists (edge case)
  if (!existsSync(specPath)) {
    logger.warn('Cannot analyze spec change - spec.md not found');
    logger.dim('Defaulting to bug investigation. Run /nextai-refine first if needed.');
    return;
  }

  // 3. Invoke Investigator agent with testing-investigator skill
  // TODO: Agent SDK integration
  // For now, log what would happen
  logger.info('Invoking Investigator agent for failure analysis...');
  logger.dim(`Failure notes: ${failureNotes}`);
  if (attachments.length > 0) {
    logger.dim(`Attachments: ${attachments.join(', ')}`);
  }

  // 4. Parse agent response (mock for now)
  // TODO: Replace with actual agent invocation that returns classification
  const classification: InvestigatorClassification = {
    classification: 'BUG', // Mock - will be replaced with agent output
    confidence: 60,
    reasoning: 'Placeholder reasoning from investigator',
    specChangeDescription: undefined
  };

  // 5. Handle classification
  if (classification.classification === 'BUG' || classification.confidence < 70) {
    // Continue with existing bug investigation flow
    logger.dim('Classified as bug - investigation report will be written to testing.md');
    return;
  }

  // 6. Spec change detected - prompt user
  await handleSpecChangeApproval(
    projectRoot,
    featureId,
    failureNotes,
    classification.reasoning,
    classification.confidence,
    classification.specChangeDescription || 'Spec change detected'
  );
}

/**
 * Handle user approval flow for spec changes
 */
async function handleSpecChangeApproval(
  projectRoot: string,
  featureId: string,
  failureDescription: string,
  reasoning: string,
  confidence: number,
  specChangeDescription: string
): Promise<void> {
  // Display spec change detection
  logger.blank();
  logger.warn(`Spec change detected in feature ${featureId}`);
  logger.blank();
  logger.keyValue('Failure Description', failureDescription.substring(0, 200) + (failureDescription.length > 200 ? '...' : ''));
  logger.keyValue('Analysis', reasoning);
  logger.keyValue('Confidence', `${confidence}%`);
  logger.blank();
  logger.dim('This will:');
  logger.dim('1. Append the spec change to initialization.md');
  logger.dim('2. Reset to product_refinement phase');
  logger.dim('3. Re-run refinement (overwrites existing specs)');
  logger.blank();

  // Prompt user
  const decision = await selectOption<'yes' | 'no' | 'cancel'>(
    'How would you like to proceed?',
    [
      { value: 'yes', name: 'Yes - Approve spec change and restart refinement' },
      { value: 'no', name: 'No - Treat as bug, return to implementation' },
      { value: 'cancel', name: 'Cancel - Stop and wait for manual input' }
    ]
  );

  // Handle decision
  switch (decision) {
    case 'yes':
      await approveSpecChange(projectRoot, featureId, specChangeDescription);
      break;
    case 'no':
      await declineSpecChange(projectRoot, featureId, failureDescription);
      break;
    case 'cancel':
      logger.info('Cancelled. Feature remains in testing phase.');
      logger.dim(`Run /nextai-testing ${featureId} when ready.`);
      break;
  }
}

/**
 * Approve spec change and reset to product_refinement
 */
async function approveSpecChange(
  projectRoot: string,
  featureId: string,
  specChangeDescription: string
): Promise<void> {
  // 1. Append to initialization.md
  const featurePath = getFeaturePath(projectRoot, featureId);
  const initPath = join(featurePath, 'planning', 'initialization.md');

  const specChangeEntry = `\n## Spec Changes\n\n### ${new Date().toISOString()}\n${specChangeDescription}\n`;

  if (existsSync(initPath)) {
    appendFileSync(initPath, specChangeEntry);
  } else {
    logger.warn('initialization.md not found - spec change will not be recorded');
  }

  // 2. Log metrics
  await logSpecChangeMetrics(projectRoot, featureId, 'approved', specChangeDescription);

  // 3. Reset phase to product_refinement
  const result = await updateFeaturePhase(projectRoot, featureId, 'product_refinement', { skipValidation: true });

  if (result.success) {
    logger.success('Spec change approved');
    logger.info('Phase reset to product_refinement');
    logger.blank();
    logger.dim('Next step: Run /nextai-refine to restart refinement with updated requirements');
    printNextCommand(featureId, 'product_refinement', featurePath);
  } else {
    logger.error('Failed to reset phase');
    logger.dim(result.error || 'Unknown error');
  }
}

/**
 * Decline spec change and continue with bug investigation
 */
async function declineSpecChange(
  projectRoot: string,
  featureId: string,
  failureDescription: string
): Promise<void> {
  // 1. Log metrics
  await logSpecChangeMetrics(projectRoot, featureId, 'declined', failureDescription);

  // 2. Let investigator write bug report (existing flow)
  logger.info('Treating as bug - investigation report will be generated');
  logger.dim('The Investigator will write findings to testing.md');

  // Phase already transitioned to implementation in main testing command
  logger.blank();
  logger.dim('Fix the issues and run through review again before re-testing.');
}

/**
 * Log spec change metrics to JSONL file
 */
async function logSpecChangeMetrics(
  projectRoot: string,
  featureId: string,
  userDecision: 'approved' | 'declined' | 'cancelled',
  description: string
): Promise<void> {
  try {
    const metricsDir = join(projectRoot, 'nextai', 'metrics');
    ensureDir(metricsDir);

    const metricsPath = join(metricsDir, 'spec-changes.jsonl');

    const entry = {
      timestamp: new Date().toISOString(),
      featureId,
      failureDescription: description,
      userDecision,
      originalPhase: 'testing'
    };

    // Append as JSONL (one JSON object per line)
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(metricsPath, line);
  } catch (error) {
    // Log error but don't crash - metrics are non-critical
    logger.dim(`Failed to log spec change metrics: ${error}`);
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
