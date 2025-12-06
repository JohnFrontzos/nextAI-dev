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
import { getFeaturePath } from '../scaffolding/feature.js';

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
 * Update a feature's phase with validation
 * Validates the current phase's work is complete before allowing transition
 */
export async function updateFeaturePhase(
  projectRoot: string,
  featureId: string,
  newPhase: Phase,
  options: { force?: boolean; skipValidation?: boolean } = {}
): Promise<PhaseUpdateResult> {
  const ledger = loadLedger(projectRoot);
  const featureIndex = ledger.features.findIndex((f) => f.id === featureId);

  if (featureIndex === -1) {
    return { success: false, error: `Feature '${featureId}' not found` };
  }

  const feature = ledger.features[featureIndex];
  const fromPhase = feature.phase;

  // Check if transition is valid (phase order)
  if (!options.force && !VALID_TRANSITIONS[fromPhase].includes(newPhase)) {
    return {
      success: false,
      error: `Cannot transition from '${fromPhase}' to '${newPhase}'`,
    };
  }

  // Run validation for current phase (unless skipped)
  let bypassed = false;
  if (!options.skipValidation) {
    const validator = getValidatorForPhase(fromPhase);
    if (validator) {
      const featurePath = getFeaturePath(projectRoot, featureId);
      const result = await validator.validate(featurePath);

      if (!result.valid) {
        if (options.force) {
          // Log the bypass and proceed
          logValidationBypass(projectRoot, featureId, newPhase, result.errors, result.warnings);
          bypassed = true;
        } else {
          // Log failed validation and block
          logValidation(projectRoot, featureId, newPhase, 'failed', result.errors, result.warnings);
          return {
            success: false,
            error: 'Validation failed',
            errors: result.errors,
            warnings: result.warnings,
          };
        }
      } else {
        // Log successful validation
        logValidation(projectRoot, featureId, newPhase, 'passed', [], result.warnings);
      }
    }
  }

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

  return { success: true, bypassed };
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
