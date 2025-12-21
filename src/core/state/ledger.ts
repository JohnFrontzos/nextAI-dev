import {
  type Feature,
  type Phase,
  createFeature,
  generateFeatureId,
  VALID_TRANSITIONS,
  type FeatureType,
} from '../../schemas/ledger.js';
import { loadLedger, saveLedger, appendHistory } from '../../cli/utils/config.js';
import { getValidatorForPhase } from '../validation/phase-validators.js';
import { logValidation, logValidationBypass } from './history.js';
import { getFeaturePath, getDonePath } from '../scaffolding/feature.js';
import { onPhaseTransition, onFeatureComplete } from '../metrics/index.js';

/**
 * Add a new feature to the ledger
 */
export function addFeature(
  projectRoot: string,
  title: string,
  type: FeatureType = 'feature',
  externalId?: string
): Feature {
  const ledger = loadLedger(projectRoot);
  const id = generateFeatureId(title);

  // Check for duplicate ID (same day + similar title)
  let finalId = id;
  let counter = 1;
  while (ledger.features.some((f) => f.id === finalId)) {
    finalId = `${id}-${counter}`;
    counter++;
  }

  const feature = createFeature(finalId, title, type, externalId);
  ledger.features.push(feature);
  saveLedger(projectRoot, ledger);

  // Log event
  appendHistory(projectRoot, {
    event: 'feature_created',
    feature_id: feature.id,
    title: feature.title,
    type: feature.type,
  });

  return feature;
}

/**
 * Get a feature by ID
 */
export function getFeature(projectRoot: string, featureId: string): Feature | undefined {
  const ledger = loadLedger(projectRoot);
  return ledger.features.find((f) => f.id === featureId);
}

/**
 * Get a feature by partial ID match
 */
export function findFeature(projectRoot: string, partialId: string): Feature | undefined {
  const ledger = loadLedger(projectRoot);
  // Exact match first
  const exact = ledger.features.find((f) => f.id === partialId);
  if (exact) return exact;

  // Partial match
  const matches = ledger.features.filter((f) => f.id.includes(partialId));
  if (matches.length === 1) return matches[0];
  return undefined;
}

/**
 * List all features with optional filters
 */
export function listFeatures(
  projectRoot: string,
  options: {
    includeComplete?: boolean;
    type?: FeatureType;
    phase?: Phase;
  } = {}
): Feature[] {
  const ledger = loadLedger(projectRoot);
  let features = ledger.features;

  if (!options.includeComplete) {
    features = features.filter((f) => f.phase !== 'complete');
  }

  if (options.type) {
    features = features.filter((f) => f.type === options.type);
  }

  if (options.phase) {
    features = features.filter((f) => f.phase === options.phase);
  }

  return features;
}

/**
 * Get active (non-complete) features
 */
export function getActiveFeatures(projectRoot: string): Feature[] {
  return listFeatures(projectRoot, { includeComplete: false });
}

/**
 * Result of a phase update operation
 */
export interface PhaseUpdateResult {
  success: boolean;
  error?: string;
  errors?: string[];
  warnings?: string[];
  bypassed?: boolean;
}

/**
 * Validates that a feature is ready to transition to the target phase.
 * Does NOT modify the ledger - only validates artifacts.
 *
 * @param projectRoot - Project root directory
 * @param featureId - Feature ID to validate
 * @param newPhase - Target phase to transition to
 * @param options - Validation options
 * @returns Validation result with errors/warnings
 */
export async function validateFeatureForPhase(
  projectRoot: string,
  featureId: string,
  newPhase: Phase,
  options: { basePath?: 'todo' | 'done' } = {}
): Promise<PhaseUpdateResult> {
  const ledger = loadLedger(projectRoot);
  const feature = ledger.features.find((f) => f.id === featureId);

  if (!feature) {
    return { success: false, error: `Feature '${featureId}' not found` };
  }

  const fromPhase = feature.phase;

  // Check if transition is valid (phase order)
  if (!VALID_TRANSITIONS[fromPhase].includes(newPhase)) {
    return {
      success: false,
      error: `Cannot transition from '${fromPhase}' to '${newPhase}'`,
    };
  }

  // Run validation for current phase
  const validator = getValidatorForPhase(fromPhase);
  if (validator) {
    const basePath = options.basePath || 'todo';
    const featurePath = basePath === 'done'
      ? getDonePath(projectRoot, featureId)
      : getFeaturePath(projectRoot, featureId);

    const result = await validator.validate(featurePath);

    if (!result.valid) {
      return {
        success: false,
        error: 'Validation failed',
        errors: result.errors,
        warnings: result.warnings,
      };
    }

    return {
      success: true,
      warnings: result.warnings,
    };
  }

  return { success: true };
}

/**
 * Updates the ledger phase without validation.
 * Use after validation has already been performed or when forcing.
 *
 * @param projectRoot - Project root directory
 * @param featureId - Feature ID to update
 * @param newPhase - New phase to set
 * @param options - Update options
 * @returns Update result
 */
export function updateLedgerPhase(
  projectRoot: string,
  featureId: string,
  newPhase: Phase,
  options: { logBypass?: boolean } = {}
): PhaseUpdateResult {
  const ledger = loadLedger(projectRoot);
  const featureIndex = ledger.features.findIndex((f) => f.id === featureId);

  if (featureIndex === -1) {
    return { success: false, error: `Feature '${featureId}' not found` };
  }

  const feature = ledger.features[featureIndex];
  const fromPhase = feature.phase;

  // Update feature
  feature.phase = newPhase;
  feature.blocked_reason = null;
  feature.updated_at = new Date().toISOString();
  ledger.features[featureIndex] = feature;

  saveLedger(projectRoot, ledger);

  // Log transition
  appendHistory(projectRoot, {
    event: 'phase_transition',
    feature_id: featureId,
    from_phase: fromPhase,
    to_phase: newPhase,
  });

  // Log bypass if requested
  if (options.logBypass) {
    logValidationBypass(projectRoot, featureId, newPhase, [], []);
  }

  // Update metrics after phase transition
  if (newPhase === 'complete') {
    onFeatureComplete(projectRoot, featureId);
  } else {
    onPhaseTransition(projectRoot, featureId);
  }

  return { success: true, bypassed: options.logBypass };
}

/**
 * Update a feature's phase with validation (backward-compatible wrapper).
 * Validates the current phase's work is complete before allowing transition.
 *
 * For the 'complete' phase, use the new workflow:
 * 1. validateFeatureForPhase()
 * 2. archiveFeature()
 * 3. updateLedgerPhase()
 *
 * @param projectRoot - Project root directory
 * @param featureId - Feature ID to update
 * @param newPhase - New phase to transition to
 * @param options - Update options
 * @returns Update result
 */
export async function updateFeaturePhase(
  projectRoot: string,
  featureId: string,
  newPhase: Phase,
  options: { force?: boolean; skipValidation?: boolean } = {}
): Promise<PhaseUpdateResult> {
  // Skip validation if requested (for complete command after archiving)
  if (options.skipValidation) {
    return updateLedgerPhase(projectRoot, featureId, newPhase, {
      logBypass: options.force,
    });
  }

  // Validate first
  const validationResult = await validateFeatureForPhase(
    projectRoot,
    featureId,
    newPhase
  );

  if (!validationResult.success) {
    if (options.force) {
      // Log validation errors but proceed
      const feature = getFeature(projectRoot, featureId);
      if (feature) {
        logValidationBypass(
          projectRoot,
          featureId,
          newPhase,
          validationResult.errors || [],
          validationResult.warnings || []
        );
      }
      return updateLedgerPhase(projectRoot, featureId, newPhase, {
        logBypass: true,
      });
    } else {
      // Log failed validation
      logValidation(
        projectRoot,
        featureId,
        newPhase,
        'failed',
        validationResult.errors || [],
        validationResult.warnings || []
      );
      return validationResult;
    }
  }

  // Log successful validation
  logValidation(
    projectRoot,
    featureId,
    newPhase,
    'passed',
    [],
    validationResult.warnings || []
  );

  // Update ledger
  return updateLedgerPhase(projectRoot, featureId, newPhase);
}

/**
 * Block a feature with a reason
 */
export function blockFeature(
  projectRoot: string,
  featureId: string,
  reason: string
): void {
  const ledger = loadLedger(projectRoot);
  const featureIndex = ledger.features.findIndex((f) => f.id === featureId);

  if (featureIndex === -1) return;

  ledger.features[featureIndex].blocked_reason = reason;
  ledger.features[featureIndex].updated_at = new Date().toISOString();
  saveLedger(projectRoot, ledger);
}

/**
 * Unblock a feature
 */
export function unblockFeature(projectRoot: string, featureId: string): void {
  const ledger = loadLedger(projectRoot);
  const featureIndex = ledger.features.findIndex((f) => f.id === featureId);

  if (featureIndex === -1) return;

  ledger.features[featureIndex].blocked_reason = null;
  ledger.features[featureIndex].updated_at = new Date().toISOString();
  saveLedger(projectRoot, ledger);
}

/**
 * Increment retry count
 */
export function incrementRetryCount(projectRoot: string, featureId: string): number {
  const ledger = loadLedger(projectRoot);
  const featureIndex = ledger.features.findIndex((f) => f.id === featureId);

  if (featureIndex === -1) return 0;

  ledger.features[featureIndex].retry_count += 1;
  ledger.features[featureIndex].updated_at = new Date().toISOString();
  saveLedger(projectRoot, ledger);

  return ledger.features[featureIndex].retry_count;
}

/**
 * Reset retry count
 */
export function resetRetryCount(projectRoot: string, featureId: string): void {
  const ledger = loadLedger(projectRoot);
  const featureIndex = ledger.features.findIndex((f) => f.id === featureId);

  if (featureIndex === -1) return;

  ledger.features[featureIndex].retry_count = 0;
  ledger.features[featureIndex].updated_at = new Date().toISOString();
  saveLedger(projectRoot, ledger);
}

/**
 * Remove a feature from the ledger
 */
export function removeFeature(projectRoot: string, featureId: string): void {
  const ledger = loadLedger(projectRoot);
  const featureIndex = ledger.features.findIndex((f) => f.id === featureId);

  if (featureIndex === -1) {
    throw new Error(`Feature '${featureId}' not found in ledger`);
  }

  // Get feature info for history log
  const feature = ledger.features[featureIndex];

  // Remove from array
  ledger.features.splice(featureIndex, 1);
  saveLedger(projectRoot, ledger);

  // Log to history
  appendHistory(projectRoot, {
    event: 'feature_removed',
    feature_id: featureId,
    title: feature.title,
    type: feature.type,
    phase: feature.phase,
  });
}
