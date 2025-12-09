import { existsSync, renameSync, cpSync, rmSync } from 'fs';
import { join } from 'path';
import { getFeaturePath } from '../../core/scaffolding/feature.js';
import { getNextAIContentDir, ensureDir } from './config.js';

/**
 * Move a feature from todo/ to removed/.
 * Non-destructive operation - preserves all files.
 */
export function moveToRemoved(projectRoot: string, featureId: string): void {
  const sourcePath = getFeaturePath(projectRoot, featureId);
  const removedDir = join(getNextAIContentDir(projectRoot), 'removed');
  const targetPath = join(removedDir, featureId);

  // Validate source exists
  if (!existsSync(sourcePath)) {
    throw new Error(`Feature directory not found: ${sourcePath}`);
  }

  // Ensure removed/ parent directory exists
  ensureDir(removedDir);

  // Check target doesn't already exist
  if (existsSync(targetPath)) {
    throw new Error(`Target already exists: ${targetPath}`);
  }

  // Move folder (handle cross-device moves)
  try {
    renameSync(sourcePath, targetPath);
  } catch {
    // Cross-device move: copy then delete
    cpSync(sourcePath, targetPath, { recursive: true });
    rmSync(sourcePath, { recursive: true, force: true });
  }
}

/**
 * Get the path to a removed feature.
 */
export function getRemovedPath(projectRoot: string, featureId: string): string {
  return join(getNextAIContentDir(projectRoot), 'removed', featureId);
}
