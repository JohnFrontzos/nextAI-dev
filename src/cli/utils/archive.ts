import { existsSync, readFileSync, writeFileSync, renameSync, cpSync, rmSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { logger } from './logger.js';
import { getFeaturePath, getDonePath } from '../../core/scaffolding/feature.js';
import { ensureDir } from './config.js';

/**
 * Count files recursively in a directory.
 */
export function countFilesRecursive(dir: string): number {
  let count = 0;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      count += countFilesRecursive(fullPath);
    } else {
      count++;
    }
  }
  return count;
}

/**
 * Archive a feature from todo/ to done/.
 * Deletes attachments folder before archiving to save space.
 * Creates minimal summary.md if not present.
 */
export function archiveFeature(projectRoot: string, featureId: string): void {
  const sourcePath = getFeaturePath(projectRoot, featureId);
  const targetPath = getDonePath(projectRoot, featureId);

  if (!existsSync(sourcePath)) {
    throw new Error(`Feature directory not found: ${sourcePath}`);
  }

  // Delete attachments folder before archiving (reduces archive size)
  const attachmentsPath = join(sourcePath, 'attachments');
  if (existsSync(attachmentsPath)) {
    const fileCount = countFilesRecursive(attachmentsPath);
    if (fileCount > 0) {
      logger.warn(`Deleting attachments folder (${fileCount} files)`);
    }
    rmSync(attachmentsPath, { recursive: true, force: true });
  }

  // Ensure done/ parent directory exists
  ensureDir(dirname(targetPath));

  // If target already exists (e.g., AI already created summary.md there),
  // copy source contents into it, then remove source
  if (existsSync(targetPath)) {
    cpSync(sourcePath, targetPath, { recursive: true, force: false });
    rmSync(sourcePath, { recursive: true, force: true });
  } else {
    try {
      renameSync(sourcePath, targetPath);
    } catch {
      // Cross-device move: copy then delete
      cpSync(sourcePath, targetPath, { recursive: true });
      rmSync(sourcePath, { recursive: true, force: true });
    }
  }

  // Create minimal summary.md if not present (for --skip-summary path)
  const summaryPath = join(targetPath, 'summary.md');
  if (!existsSync(summaryPath)) {
    const summary = generateMinimalSummary(projectRoot, featureId);
    writeFileSync(summaryPath, summary);
  }
}

/**
 * Generate a minimal summary for features archived without AI processing.
 */
export function generateMinimalSummary(projectRoot: string, featureId: string): string {
  const now = new Date().toISOString();

  // Try to read title from spec.md or initialization.md (now in done/ after archive)
  let title = featureId;
  const donePath = getDonePath(projectRoot, featureId);
  const specPath = join(donePath, 'spec.md');
  const initPath = join(donePath, 'planning', 'initialization.md');

  if (existsSync(specPath)) {
    const content = readFileSync(specPath, 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)/m);
    if (titleMatch) title = titleMatch[1];
  } else if (existsSync(initPath)) {
    const content = readFileSync(initPath, 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)/m);
    if (titleMatch) title = titleMatch[1];
  }

  return `# Feature Complete: ${title}

## Summary
Feature completed and archived.

## Feature ID
${featureId}

## Completed
${now}

## Notes
This is a minimal summary. Run \`/nextai-complete\` for AI-generated summary.
`;
}
