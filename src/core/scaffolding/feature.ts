import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ensureDir } from '../../cli/utils/config.js';
import type { FeatureType } from '../../schemas/ledger.js';

/**
 * Scaffold a feature folder
 */
export function scaffoldFeature(
  projectRoot: string,
  featureId: string,
  title: string,
  type: FeatureType,
  description?: string
): string {
  const featureDir = join(projectRoot, 'todo', featureId);

  // Create directory structure
  ensureDir(featureDir);
  ensureDir(join(featureDir, 'planning'));
  ensureDir(join(featureDir, 'planning', 'visuals'));

  // Create initialization.md
  const initContent = generateInitializationContent(title, type, description);
  writeFileSync(join(featureDir, 'planning', 'initialization.md'), initContent);

  return featureDir;
}

/**
 * Generate initialization.md content
 */
function generateInitializationContent(
  title: string,
  type: FeatureType,
  description?: string
): string {
  const typeLabels: Record<FeatureType, string> = {
    feature: 'Feature',
    bug: 'Bug',
    task: 'Task',
  };

  return `# ${typeLabels[type]}: ${title}

## Description
${description || '[Add description here]'}

## Context
[Any additional context, links, references]

## Acceptance Criteria
${type === 'bug' ? '- [ ] Bug is reproduced\n- [ ] Root cause identified\n- [ ] Fix verified' : '- [ ] [Add acceptance criteria]'}

## Notes
[Additional notes]
`;
}

/**
 * Check if feature folder exists
 */
export function featureFolderExists(projectRoot: string, featureId: string): boolean {
  return existsSync(join(projectRoot, 'todo', featureId));
}

/**
 * Get feature folder path
 */
export function getFeaturePath(projectRoot: string, featureId: string): string {
  return join(projectRoot, 'todo', featureId);
}

/**
 * Get done folder path
 */
export function getDonePath(projectRoot: string, featureId: string): string {
  return join(projectRoot, 'done', featureId);
}

/**
 * Get artifact path within feature folder
 */
export function getArtifactPath(
  projectRoot: string,
  featureId: string,
  artifact: string
): string {
  return join(getFeaturePath(projectRoot, featureId), artifact);
}

/**
 * Check if artifact exists
 */
export function artifactExists(
  projectRoot: string,
  featureId: string,
  artifact: string
): boolean {
  return existsSync(getArtifactPath(projectRoot, featureId, artifact));
}
