import { existsSync, readFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { Phase, PHASE_ORDER } from '../../schemas/ledger.js';
import { getDonePath } from '../scaffolding/feature.js';

export interface PhaseStatus {
  phase: Phase;
  isComplete: boolean;
  missingFiles?: string[];
}

export interface ReviewOutcome {
  isComplete: boolean;
  verdict: 'pending' | 'pass' | 'fail';
}

export interface TaskProgress {
  total: number;
  completed: number;
  isComplete: boolean;
}

/**
 * Check if a file exists and has meaningful content (not just whitespace)
 */
export function existsWithContent(filePath: string, minLength: number = 10): boolean {
  if (!existsSync(filePath)) return false;
  try {
    const content = readFileSync(filePath, 'utf-8').trim();
    return content.length >= minLength;
  } catch {
    return false;
  }
}

/**
 * Parse tasks.md and count completed vs total tasks
 * Tasks are lines matching: - [ ] or - [x] or * [ ] or * [x]
 */
export function getTaskProgress(tasksPath: string): TaskProgress {
  if (!existsSync(tasksPath)) {
    return { total: 0, completed: 0, isComplete: false };
  }

  const content = readFileSync(tasksPath, 'utf-8');
  const lines = content.split(/\r?\n/);

  const TASK_PATTERN = /^[-*]\s+\[[\sx]\]/i;
  const COMPLETED_PATTERN = /^[-*]\s+\[x\]/i;

  let total = 0;
  let completed = 0;

  for (const line of lines) {
    if (TASK_PATTERN.test(line.trim())) {
      total++;
      if (COMPLETED_PATTERN.test(line.trim())) {
        completed++;
      }
    }
  }

  return {
    total,
    completed,
    isComplete: total > 0 && completed === total,
  };
}

/**
 * Parse review.md to determine the review outcome
 */
export function getReviewOutcome(reviewPath: string): ReviewOutcome {
  if (!existsSync(reviewPath)) {
    return { isComplete: false, verdict: 'pending' };
  }

  const content = readFileSync(reviewPath, 'utf-8');

  if (!content.includes('## Verdict')) {
    return { isComplete: false, verdict: 'pending' };
  }

  // Look for PASS or FAIL after the Verdict header
  const verdictSection = content.split('## Verdict')[1] || '';

  if (/\bPASS\b/i.test(verdictSection)) {
    return { isComplete: true, verdict: 'pass' };
  }
  if (/\bFAIL\b/i.test(verdictSection)) {
    return { isComplete: true, verdict: 'fail' };
  }

  return { isComplete: false, verdict: 'pending' };
}

/**
 * Check if a specific phase is complete for a feature
 */
export function isPhaseComplete(featureDir: string, phase: Phase): boolean {
  switch (phase) {
    case 'created':
      return existsWithContent(join(featureDir, 'planning', 'initialization.md'));

    case 'product_refinement':
      return existsWithContent(join(featureDir, 'planning', 'requirements.md'));

    case 'tech_spec':
      return existsWithContent(join(featureDir, 'spec.md')) &&
             existsWithContent(join(featureDir, 'tasks.md'));

    case 'implementation':
      return getTaskProgress(join(featureDir, 'tasks.md')).isComplete;

    case 'review':
      const outcome = getReviewOutcome(join(featureDir, 'review.md'));
      return outcome.isComplete && outcome.verdict === 'pass';

    case 'testing':
      return existsWithContent(join(featureDir, 'testing.md'));

    case 'complete':
      // For complete phase, check done/<id>/summary.md instead of todo/<id>/summary.md
      // featureDir = /project/nextai/todo/<id> → go up 3 levels to reach project root
      const projectRoot = dirname(dirname(dirname(featureDir)));
      const featureId = basename(featureDir);
      const donePath = getDonePath(projectRoot, featureId);
      return existsWithContent(join(donePath, 'summary.md'));

    default:
      return false;
  }
}

/**
 * Get the completion status of all phases for a feature
 */
export function getAllPhaseStatuses(featureDir: string): PhaseStatus[] {
  const phases: Phase[] = [
    'created',
    'product_refinement',
    'tech_spec',
    'implementation',
    'review',
    'testing',
    'complete',
  ];

  return phases.map(phase => ({
    phase,
    isComplete: isPhaseComplete(featureDir, phase),
  }));
}

/**
 * Determine the highest completed phase
 */
export function getHighestCompletedPhase(featureDir: string): Phase | null {
  const phases: Phase[] = [
    'complete',
    'testing',
    'review',
    'implementation',
    'tech_spec',
    'product_refinement',
    'created',
  ];

  for (const phase of phases) {
    if (isPhaseComplete(featureDir, phase)) {
      return phase;
    }
  }

  return null;
}

/**
 * Check if a feature can transition to a target phase
 * Returns { canTransition: true } or { canTransition: false, reason: string }
 */
export function canTransitionTo(
  featureDir: string,
  targetPhase: Phase
): { canTransition: boolean; reason?: string } {

  // Special case: review must PASS to go to testing (check before prerequisites)
  if (targetPhase === 'testing') {
    const reviewOutcome = getReviewOutcome(join(featureDir, 'review.md'));
    if (reviewOutcome.verdict === 'fail') {
      return {
        canTransition: false,
        reason: `Review failed. Fix issues and re-run /nextai-review before testing.`,
      };
    }
  }

  const prerequisites: Record<Phase, Phase[]> = {
    created: [],
    product_refinement: ['created'],
    tech_spec: ['created', 'product_refinement'],
    implementation: ['created', 'product_refinement', 'tech_spec'],
    review: ['created', 'product_refinement', 'tech_spec', 'implementation'],
    testing: ['created', 'product_refinement', 'tech_spec', 'implementation', 'review'],
    complete: ['created', 'product_refinement', 'tech_spec', 'implementation', 'review', 'testing'],
  };

  const requiredPhases = prerequisites[targetPhase];

  for (const prereq of requiredPhases) {
    if (!isPhaseComplete(featureDir, prereq)) {
      return {
        canTransition: false,
        reason: `Phase '${prereq}' is not complete. Cannot start '${targetPhase}'.`,
      };
    }
  }

  return { canTransition: true };
}

/**
 * Suggestion returned by suggestNextAction()
 * - aiCommand: Slash command for AI clients (optional, undefined for CLI-only actions)
 * - cliCommand: CLI command for non-AI clients (always present)
 */
export interface NextActionSuggestion {
  suggestedPhase: Phase;
  action: string;
  aiCommand?: string;   // Slash command for AI clients (optional)
  cliCommand: string;   // CLI command for non-AI clients (always present)
  hint?: string;
}

/**
 * Suggest the next action for a feature based on its current state.
 * Returns both AI (slash) and CLI commands to support both AI and non-AI workflows.
 */
export function suggestNextAction(featureDir: string): NextActionSuggestion {
  // Check phases in order
  if (!isPhaseComplete(featureDir, 'created')) {
    return {
      suggestedPhase: 'created',
      action: 'Feature not properly initialized',
      cliCommand: 'nextai repair <id>',
    };
  }

  if (!isPhaseComplete(featureDir, 'tech_spec')) {
    return {
      suggestedPhase: 'product_refinement',
      action: 'Run refinement to gather requirements and create tech spec',
      aiCommand: '/nextai-refine <id>',
      cliCommand: 'nextai advance <id>',
    };
  }

  if (!isPhaseComplete(featureDir, 'implementation')) {
    const progress = getTaskProgress(join(featureDir, 'tasks.md'));
    return {
      suggestedPhase: 'implementation',
      action: `Implement tasks (${progress.completed}/${progress.total} done)`,
      aiCommand: '/nextai-implement <id>',
      cliCommand: 'nextai advance <id>',
    };
  }

  const reviewOutcome = getReviewOutcome(join(featureDir, 'review.md'));

  if (!reviewOutcome.isComplete) {
    return {
      suggestedPhase: 'review',
      action: 'Run code review',
      aiCommand: '/nextai-review <id>',
      cliCommand: 'nextai advance <id>',
    };
  }

  if (reviewOutcome.verdict === 'fail') {
    return {
      suggestedPhase: 'implementation',
      action: 'Review failed - fix issues and re-implement',
      aiCommand: '/nextai-implement <id>',
      cliCommand: 'nextai status <id> --retry-increment',
      hint: 'Increment retry count, then fix issues and advance',
    };
  }

  if (!isPhaseComplete(featureDir, 'testing')) {
    return {
      suggestedPhase: 'testing',
      action: 'Run manual testing',
      cliCommand: 'nextai testing <id> --status pass',
    };
  }

  if (!isPhaseComplete(featureDir, 'complete')) {
    return {
      suggestedPhase: 'complete',
      action: 'Complete and archive the feature',
      aiCommand: '/nextai-complete <id>',
      cliCommand: 'nextai complete <id> --skip-summary',
    };
  }

  return {
    suggestedPhase: 'complete',
    action: 'Feature is complete!',
    cliCommand: 'nextai show <id>',
  };
}

/**
 * Get the numeric index of a phase in the workflow order
 */
export function phaseIndex(phase: Phase): number {
  return PHASE_ORDER.indexOf(phase);
}

/**
 * Get the next phase in the workflow sequence
 * Returns null if already at 'complete' phase
 */
export function getNextPhase(currentPhase: Phase): Phase | null {
  const currentIndex = phaseIndex(currentPhase);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[currentIndex + 1];
}

/**
 * Detect the actual phase a feature is in based on artifact existence.
 * This checks artifacts in reverse order (highest phase first) to find
 * the most advanced phase the feature has reached.
 *
 * Note: This detects what phase the feature has COMPLETED, not what phase
 * it should transition TO. The caller should use getNextPhase() to determine
 * the target phase for advancement.
 */
export function detectPhaseFromArtifacts(featurePath: string): Phase {
  // Check if feature is archived (in done/ folder with summary.md)
  // featurePath = /project/nextai/todo/<id> → go up 3 levels to reach project root
  const projectRoot = dirname(dirname(dirname(featurePath)));
  const featureId = basename(featurePath);
  const donePath = getDonePath(projectRoot, featureId);
  if (existsWithContent(join(donePath, 'summary.md'))) {
    return 'complete'; // Feature is archived and complete
  }

  // Check for testing.md with PASS or FAIL status (testing phase)
  const testingPath = join(featurePath, 'testing.md');
  if (existsWithContent(testingPath)) {
    const content = readFileSync(testingPath, 'utf-8').toLowerCase();
    if (content.includes('status: pass') || content.includes('**status:** pass') ||
        content.includes('status: fail') || content.includes('**status:** fail')) {
      return 'testing'; // Testing phase (pass or fail), ready for complete or retry
    }
  }

  // Check for review.md with verdict
  const reviewOutcome = getReviewOutcome(join(featurePath, 'review.md'));
  if (reviewOutcome.isComplete && reviewOutcome.verdict === 'pass') {
    return 'review'; // Review passed, ready for testing
  }

  // Check for all tasks complete
  const taskProgress = getTaskProgress(join(featurePath, 'tasks.md'));
  if (taskProgress.isComplete) {
    return 'implementation'; // Implementation complete, ready for review
  }

  // Check for spec.md and tasks.md existence
  if (existsWithContent(join(featurePath, 'spec.md')) &&
      existsWithContent(join(featurePath, 'tasks.md'))) {
    return 'tech_spec'; // Tech spec complete, ready for implementation
  }

  // Check for requirements.md
  if (existsWithContent(join(featurePath, 'planning', 'requirements.md'))) {
    return 'product_refinement'; // Product refinement complete, ready for tech spec
  }

  // Check for initialization.md
  if (existsWithContent(join(featurePath, 'planning', 'initialization.md'))) {
    return 'created'; // Created, ready for product refinement
  }

  // Default to created (feature exists but not initialized)
  return 'created';
}
