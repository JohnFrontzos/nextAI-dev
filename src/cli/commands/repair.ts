import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { logger } from '../utils/logger.js';
import {
  findProjectRoot,
  getNextAIDir,
  loadLedger,
  saveLedger,
  loadConfig,
  loadProfile,
} from '../utils/config.js';
import { logRepair } from '../../core/state/history.js';
import { getFeaturePath, artifactExists } from '../../core/scaffolding/feature.js';
import { unblockFeature, getFeature } from '../../core/state/ledger.js';
import type { Phase } from '../../schemas/ledger.js';

interface RepairIssue {
  type: 'error' | 'warning';
  message: string;
  fix?: () => void;
}

export const repairCommand = new Command('repair')
  .description('Health check and repair project or feature state')
  .argument('[id]', 'Feature ID (repairs specific feature if provided)')
  .option('--check-only', 'Only check, don\'t fix (default if no --apply)')
  .option('--apply', 'Apply automatic fixes')
  .option('-v, --verbose', 'Show detailed checks', false)
  .action(async (idArg, options) => {
    // Find project root
    const projectRoot = findProjectRoot();
    if (!projectRoot) {
      logger.error('Project not initialized');
      logger.dim('Run `nextai init` to initialize this project');
      process.exit(1);
    }

    const spinner = ora('Checking...').start();

    try {
      const issues: RepairIssue[] = [];
      const actions: string[] = [];

      if (idArg) {
        // Feature-level repair
        spinner.text = `Checking feature: ${idArg}`;
        const featureIssues = await checkFeature(projectRoot, idArg, options.verbose);
        issues.push(...featureIssues);
      } else {
        // Project-level repair
        spinner.text = 'Checking project health...';
        const projectIssues = await checkProject(projectRoot, options.verbose);
        issues.push(...projectIssues);
      }

      spinner.stop();

      // Report issues
      const errors = issues.filter((i) => i.type === 'error');
      const warnings = issues.filter((i) => i.type === 'warning');

      // No issues found = success
      if (issues.length === 0) {
        logger.success(idArg ? 'Feature is healthy' : 'Project is healthy');
        process.exit(0);
      }

      console.log();
      if (errors.length > 0) {
        console.log(chalk.red(`Found ${errors.length} error(s):`));
        for (const issue of errors) {
          console.log(`  ${chalk.red('✗')} ${issue.message}`);
        }
      }

      if (warnings.length > 0) {
        console.log(chalk.yellow(`Found ${warnings.length} warning(s):`));
        for (const issue of warnings) {
          console.log(`  ${chalk.yellow('⚠')} ${issue.message}`);
        }
      }

      // Apply fixes only with --apply flag (no prompts for AI-driven usage)
      const fixableIssues = issues.filter((i) => i.fix);

      if (!options.apply) {
        // Issues found without --apply = exit 1 (mirrors lint tooling)
        logger.blank();
        if (fixableIssues.length > 0) {
          logger.dim(`Run with --apply to fix ${fixableIssues.length} issue(s)`);
        } else {
          logger.warn('No automatic fixes available');
          logger.dim('Please address the issues manually');
        }
        process.exit(1);  // Non-zero: issues detected
      }

      if (fixableIssues.length === 0) {
        logger.blank();
        logger.warn('No automatic fixes available');
        logger.dim('Please address the issues manually');
        process.exit(1);
      }

      for (const issue of fixableIssues) {
        try {
          issue.fix!();
          actions.push(issue.message);
          logger.success(`Fixed: ${issue.message}`);
        } catch (error) {
          logger.error(`Failed to fix: ${issue.message}`);
        }
      }

      // Log repair event
      logRepair(
        projectRoot,
        idArg,
        issues.length,
        actions.length,
        actions
      );

      logger.blank();
      logger.success(`Repair complete: ${actions.length} fix(es) applied`);
      process.exit(0);  // Success after applying
    } catch (error) {
      spinner.fail('Repair failed');
      logger.error(String(error));
      process.exit(1);
    }
  });

async function checkProject(projectRoot: string, verbose: boolean): Promise<RepairIssue[]> {
  const issues: RepairIssue[] = [];

  // Check config.json
  try {
    loadConfig(projectRoot);
    if (verbose) logger.dim('  ✓ config.json valid');
  } catch (error) {
    issues.push({
      type: 'error',
      message: 'config.json is invalid or missing',
    });
  }

  // Check profile.json
  try {
    loadProfile(projectRoot);
    if (verbose) logger.dim('  ✓ profile.json valid');
  } catch (error) {
    issues.push({
      type: 'error',
      message: 'profile.json is invalid or missing',
    });
  }

  // Check ledger.json
  try {
    const ledger = loadLedger(projectRoot);
    if (verbose) logger.dim(`  ✓ ledger.json valid (${ledger.features.length} features)`);

    // Check for orphan features (ledger entry but no folder)
    for (const feature of ledger.features) {
      if (feature.phase !== 'complete') {
        const featureDir = getFeaturePath(projectRoot, feature.id);
        if (!existsSync(featureDir)) {
          issues.push({
            type: 'warning',
            message: `Orphan ledger entry: ${feature.id} (folder missing)`,
            fix: () => {
              const newLedger = loadLedger(projectRoot);
              newLedger.features = newLedger.features.filter((f) => f.id !== feature.id);
              saveLedger(projectRoot, newLedger);
            },
          });
        }
      }
    }
  } catch (error) {
    issues.push({
      type: 'error',
      message: 'ledger.json is corrupted',
    });
  }

  // Check agents directory
  const agentsDir = join(getNextAIDir(projectRoot), 'agents');
  if (!existsSync(agentsDir)) {
    issues.push({
      type: 'warning',
      message: 'agents/ directory missing',
    });
  }

  // Check skills directory
  const skillsDir = join(getNextAIDir(projectRoot), 'skills');
  if (!existsSync(skillsDir)) {
    issues.push({
      type: 'warning',
      message: 'skills/ directory missing',
    });
  }

  return issues;
}

async function checkFeature(projectRoot: string, featureId: string, verbose: boolean): Promise<RepairIssue[]> {
  const issues: RepairIssue[] = [];

  // Get feature from ledger
  const feature = getFeature(projectRoot, featureId);
  if (!feature) {
    issues.push({
      type: 'error',
      message: `Feature '${featureId}' not found in ledger`,
    });
    return issues;
  }

  if (verbose) logger.dim(`  Feature: ${feature.id}`);
  if (verbose) logger.dim(`  Phase: ${feature.phase}`);

  // Check folder exists
  const featureDir = getFeaturePath(projectRoot, feature.id);
  if (!existsSync(featureDir)) {
    issues.push({
      type: 'error',
      message: 'Feature folder does not exist',
    });
    return issues;
  }

  if (verbose) logger.dim('  ✓ Folder exists');

  // Check artifacts for current phase
  const requiredArtifacts = getRequiredArtifactsForPhase(feature.phase);
  for (const artifact of requiredArtifacts) {
    if (!artifactExists(projectRoot, feature.id, artifact)) {
      issues.push({
        type: 'warning',
        message: `Phase mismatch: ${feature.phase} but ${artifact} missing`,
      });
    } else if (verbose) {
      logger.dim(`  ✓ ${artifact} exists`);
    }
  }

  // Clear blocked_reason if blocking condition no longer exists
  if (feature.blocked_reason) {
    // For simplicity, offer to clear blocked_reason
    issues.push({
      type: 'warning',
      message: `Feature is blocked: ${feature.blocked_reason}`,
      fix: () => unblockFeature(projectRoot, feature.id),
    });
  }

  return issues;
}

function getRequiredArtifactsForPhase(phase: Phase): string[] {
  const requirements: Record<Phase, string[]> = {
    created: ['planning/initialization.md'],
    product_refinement: ['planning/initialization.md'],
    tech_spec: ['planning/initialization.md', 'planning/requirements.md'],
    implementation: ['planning/initialization.md', 'planning/requirements.md', 'spec.md', 'tasks.md'],
    review: ['planning/initialization.md', 'planning/requirements.md', 'spec.md', 'tasks.md'],
    testing: ['planning/initialization.md', 'planning/requirements.md', 'spec.md', 'tasks.md', 'review.md'],
    complete: [],
  };
  return requirements[phase] || [];
}
