import {
  incrementRetryCount,
  blockFeature,
  resetRetryCount,
  getFeature
} from '../../core/state/ledger.js';
import { appendHistory } from './config.js';
import { logger } from './logger.js';

export const MAX_REVIEW_RETRIES = 5;

export interface RetryResult {
  blocked: boolean;
  retryCount: number;
}

/**
 * Handle review failure: increment retry count, optionally block feature.
 * Called when advancing from review phase and detecting FAIL verdict.
 */
export function handleReviewFailure(
  projectRoot: string,
  featureId: string
): RetryResult {
  // Increment retry counter
  const retryCount = incrementRetryCount(projectRoot, featureId);

  // Log the failure
  appendHistory(projectRoot, {
    event: 'review_failed',
    feature_id: featureId,
    retry_count: retryCount,
  });

  // Check if we should block
  if (retryCount >= MAX_REVIEW_RETRIES) {
    blockFeature(
      projectRoot,
      featureId,
      `Review failed ${MAX_REVIEW_RETRIES} times - manual intervention required`
    );

    appendHistory(projectRoot, {
      event: 'feature_blocked',
      feature_id: featureId,
      reason: 'max_review_retries',
      retry_count: retryCount,
    });

    logger.error(`Feature blocked after ${MAX_REVIEW_RETRIES} failed reviews`);
    logger.box('Manual intervention required:', [
      `Review the issues in: nextai/todo/${featureId}/review.md`,
      `Options:`,
      `  1. Fix issues manually, then: nextai repair ${featureId}`,
      `  2. Force complete: nextai complete ${featureId} --force`,
      `  3. Unblock and retry: nextai advance ${featureId} --force`,
    ]);

    return { blocked: true, retryCount };
  }

  logger.warn(`Review failed (attempt ${retryCount}/${MAX_REVIEW_RETRIES})`);
  return { blocked: false, retryCount };
}


/**
 * Handle review success: reset retry count.
 * Called when advancing from review phase with PASS verdict.
 */
export function handleReviewSuccess(projectRoot: string, featureId: string): void {
  const feature = getFeature(projectRoot, featureId);
  if (feature && feature.retry_count > 0) {
    resetRetryCount(projectRoot, featureId);
    logger.info('Retry count reset after successful review');
  }
}

