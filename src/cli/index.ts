#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { createCommand } from './commands/create.js';
import { listCommand } from './commands/list.js';
import { showCommand } from './commands/show.js';
import { resumeCommand } from './commands/resume.js';
import { advanceCommand } from './commands/advance.js';
import { syncCommand } from './commands/sync.js';
import { repairCommand } from './commands/repair.js';
import { testingCommand } from './commands/testing.js';
import { completeCommand } from './commands/complete.js';
import { statusCommand } from './commands/status.js';
import { getPackageVersion, updateSession, findProjectRoot } from './utils/config.js';

const program = new Command();

program
  .name('nextai')
  .description('NextAI Dev Framework - AI Development Workflow Orchestrator')
  .version(getPackageVersion())
  .hook('preAction', () => {
    // Update session on every command (provides current timestamp to AI workflows)
    const projectRoot = findProjectRoot();
    if (projectRoot) {
      try {
        updateSession(projectRoot, getPackageVersion());
      } catch {
        // Ignore errors during session update
      }
    }
  });

// Register commands
program.addCommand(initCommand);
program.addCommand(createCommand);
program.addCommand(listCommand);
program.addCommand(showCommand);
program.addCommand(resumeCommand);
program.addCommand(advanceCommand);
program.addCommand(syncCommand);
program.addCommand(repairCommand);
program.addCommand(testingCommand);
program.addCommand(completeCommand);
program.addCommand(statusCommand);

program.parse(process.argv);
