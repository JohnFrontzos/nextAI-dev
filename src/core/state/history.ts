import { existsSync, readFileSync } from 'fs';
import { getHistoryPath, appendHistory } from '../../cli/utils/config.js';
import type { HistoryEvent } from '../../schemas/history.js';
import type { FeatureType } from '../../schemas/ledger.js';

/**
 * Read all history events
 */
export function readHistory(projectRoot: string): HistoryEvent[] {
  const historyPath = getHistoryPath(projectRoot);
  if (!existsSync(historyPath)) {
    return [];
  }

  const content = readFileSync(historyPath, 'utf-8');
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as HistoryEvent);
}

/**
 * Get history for a specific feature
 */
export function getFeatureHistory(
  projectRoot: string,
  featureId: string
): HistoryEvent[] {
  return readHistory(projectRoot).filter((e) => e.feature_id === featureId);
}

/**
 * Get all validation bypasses
 */
export function getValidationBypasses(projectRoot: string): HistoryEvent[] {
  return readHistory(projectRoot).filter((e) => e.event === 'validation_bypass');
}

/**
 * Get validation bypass counts by feature type
 */
export function getBypassCountsByType(projectRoot: string): Record<FeatureType, number> {
  const bypasses = getValidationBypasses(projectRoot);
  const counts: Record<FeatureType, number> = {
    feature: 0,
    bug: 0,
    task: 0,
  };

  for (const event of bypasses) {
    if (event.event === 'validation_bypass' && 'feature_type' in event) {
      counts[event.feature_type]++;
    }
  }

  return counts;
}

/**
 * Log a validation bypass (with feature type for metrics tracking)
 */
export function logValidationBypass(
  projectRoot: string,
  featureId: string,
  featureType: FeatureType,
  targetPhase: string,
  errorsIgnored: string[],
  warningsIgnored?: string[]
): void {
  appendHistory(projectRoot, {
    event: 'validation_bypass',
    feature_id: featureId,
    feature_type: featureType,
    target_phase: targetPhase,
    errors_ignored: errorsIgnored,
    warnings_ignored: warningsIgnored,
    bypass_method: '--force',
  });
}

/**
 * Log a validation result
 */
export function logValidation(
  projectRoot: string,
  featureId: string,
  targetPhase: string,
  result: 'passed' | 'failed',
  errors?: string[],
  warnings?: string[]
): void {
  appendHistory(projectRoot, {
    event: 'validation',
    feature_id: featureId,
    target_phase: targetPhase,
    result,
    errors,
    warnings,
  });
}

/**
 * Log a sync event
 */
export function logSync(
  projectRoot: string,
  client: string,
  commandsSynced: number,
  skillsSynced: number,
  agentsSynced: number
): void {
  appendHistory(projectRoot, {
    event: 'sync',
    client,
    commands_synced: commandsSynced,
    skills_synced: skillsSynced,
    agents_synced: agentsSynced,
  });
}

/**
 * Log a repair event
 */
export function logRepair(
  projectRoot: string,
  featureId: string | undefined,
  issuesFound: number,
  issuesFixed: number,
  actions: string[]
): void {
  appendHistory(projectRoot, {
    event: 'repair',
    feature_id: featureId,
    issues_found: issuesFound,
    issues_fixed: issuesFixed,
    actions,
  });
}

/**
 * Log an init event
 */
export function logInit(
  projectRoot: string,
  projectId: string,
  projectName: string,
  client?: string
): void {
  appendHistory(projectRoot, {
    event: 'init',
    project_id: projectId,
    project_name: projectName,
    client,
  });
}
