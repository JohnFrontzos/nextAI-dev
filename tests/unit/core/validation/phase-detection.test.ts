import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  existsWithContent,
  getTaskProgress,
  getReviewOutcome,
  isPhaseComplete,
  canTransitionTo,
  suggestNextAction,
  detectPhaseFromArtifacts,
  phaseIndex,
  getNextPhase,
} from '../../../../src/core/validation/phase-detection';
import {
  createTestProject,
  createFeatureFixture,
  createDoneFeatureFixture,
  type TestContext,
} from '../../../helpers/test-utils';
import {
  validInitializationMd,
  validRequirementsMd,
  validSpecMd,
  validTasksMd,
  allTasksCompleteMd,
  mixedTasksMd,
  noTasksMd,
  passingReviewMd,
  failingReviewMd,
  lowercasePassReviewMd,
  reviewNoVerdictMd,
  reviewVerdictBeforeHeaderMd,
  passingTestingMd,
  validSummaryMd,
  createdPhaseArtifacts,
  productRefinementArtifacts,
  techSpecArtifacts,
  implementationCompleteArtifacts,
  reviewPassArtifacts,
  testingPassArtifacts,
} from '../../../fixtures/artifacts';

describe('Phase Detection', () => {
  let testContext: TestContext;
  let featureDir: string;

  beforeEach(() => {
    testContext = createTestProject();
    featureDir = path.join(testContext.projectRoot, 'nextai', 'todo', 'test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('existsWithContent()', () => {
    it('returns true for file with content', () => {
      const filePath = path.join(featureDir, 'test.md');
      fs.writeFileSync(filePath, 'This is content with more than 10 chars', 'utf-8');
      expect(existsWithContent(filePath)).toBe(true);
    });

    it('returns false for non-existent file', () => {
      const filePath = path.join(featureDir, 'nonexistent.md');
      expect(existsWithContent(filePath)).toBe(false);
    });

    it('returns false for empty file', () => {
      const filePath = path.join(featureDir, 'empty.md');
      fs.writeFileSync(filePath, '', 'utf-8');
      expect(existsWithContent(filePath)).toBe(false);
    });

    it('returns false for whitespace-only file', () => {
      const filePath = path.join(featureDir, 'whitespace.md');
      fs.writeFileSync(filePath, '   \n\n   \t\t\n   ', 'utf-8');
      expect(existsWithContent(filePath)).toBe(false);
    });

    it('respects minLength parameter (file shorter than minLength)', () => {
      const filePath = path.join(featureDir, 'short.md');
      fs.writeFileSync(filePath, 'short', 'utf-8'); // 5 chars
      expect(existsWithContent(filePath, 10)).toBe(false);
    });

    it('respects minLength parameter (file longer than minLength)', () => {
      const filePath = path.join(featureDir, 'short.md');
      fs.writeFileSync(filePath, 'short', 'utf-8'); // 5 chars
      expect(existsWithContent(filePath, 3)).toBe(true);
    });
  });

  describe('getTaskProgress()', () => {
    it('counts unchecked tasks', () => {
      const tasksPath = path.join(featureDir, 'tasks.md');
      fs.writeFileSync(tasksPath, '- [ ] Task 1\n- [ ] Task 2', 'utf-8');
      const progress = getTaskProgress(tasksPath);
      expect(progress).toEqual({ total: 2, completed: 0, isComplete: false });
    });

    it('counts checked tasks', () => {
      const tasksPath = path.join(featureDir, 'tasks.md');
      fs.writeFileSync(tasksPath, '- [x] Task 1\n- [x] Task 2', 'utf-8');
      const progress = getTaskProgress(tasksPath);
      expect(progress).toEqual({ total: 2, completed: 2, isComplete: true });
    });

    it('counts mixed tasks', () => {
      const tasksPath = path.join(featureDir, 'tasks.md');
      fs.writeFileSync(tasksPath, '- [x] Done\n- [ ] Todo', 'utf-8');
      const progress = getTaskProgress(tasksPath);
      expect(progress).toEqual({ total: 2, completed: 1, isComplete: false });
    });

    it('handles asterisk format', () => {
      const tasksPath = path.join(featureDir, 'tasks.md');
      fs.writeFileSync(tasksPath, '* [ ] Task\n* [x] Done', 'utf-8');
      const progress = getTaskProgress(tasksPath);
      expect(progress).toEqual({ total: 2, completed: 1, isComplete: false });
    });

    it('case insensitive [X]', () => {
      const tasksPath = path.join(featureDir, 'tasks.md');
      fs.writeFileSync(tasksPath, '- [X] Task', 'utf-8');
      const progress = getTaskProgress(tasksPath);
      expect(progress).toEqual({ total: 1, completed: 1, isComplete: true });
    });

    it('ignores non-task lines', () => {
      const tasksPath = path.join(featureDir, 'tasks.md');
      fs.writeFileSync(tasksPath, '# Header\n- [ ] Task\nSome text', 'utf-8');
      const progress = getTaskProgress(tasksPath);
      expect(progress).toEqual({ total: 1, completed: 0, isComplete: false });
    });

    it('returns zero for no tasks', () => {
      const tasksPath = path.join(featureDir, 'tasks.md');
      fs.writeFileSync(tasksPath, 'No tasks here', 'utf-8');
      const progress = getTaskProgress(tasksPath);
      expect(progress).toEqual({ total: 0, completed: 0, isComplete: false });
    });

    it('returns zero for missing file', () => {
      const tasksPath = path.join(featureDir, 'nonexistent.md');
      const progress = getTaskProgress(tasksPath);
      expect(progress).toEqual({ total: 0, completed: 0, isComplete: false });
    });
  });

  describe('getReviewOutcome()', () => {
    it('detects PASS verdict', () => {
      const reviewPath = path.join(featureDir, 'review.md');
      fs.writeFileSync(reviewPath, passingReviewMd, 'utf-8');
      const outcome = getReviewOutcome(reviewPath);
      expect(outcome).toEqual({ isComplete: true, verdict: 'pass' });
    });

    it('detects FAIL verdict', () => {
      const reviewPath = path.join(featureDir, 'review.md');
      fs.writeFileSync(reviewPath, failingReviewMd, 'utf-8');
      const outcome = getReviewOutcome(reviewPath);
      expect(outcome).toEqual({ isComplete: true, verdict: 'fail' });
    });

    it('case insensitive', () => {
      const reviewPath = path.join(featureDir, 'review.md');
      fs.writeFileSync(reviewPath, lowercasePassReviewMd, 'utf-8');
      const outcome = getReviewOutcome(reviewPath);
      expect(outcome).toEqual({ isComplete: true, verdict: 'pass' });
    });

    it('requires Verdict section', () => {
      const reviewPath = path.join(featureDir, 'review.md');
      fs.writeFileSync(reviewPath, 'Result: PASS', 'utf-8');
      const outcome = getReviewOutcome(reviewPath);
      expect(outcome).toEqual({ isComplete: false, verdict: 'pending' });
    });

    it('returns pending for missing file', () => {
      const reviewPath = path.join(featureDir, 'nonexistent.md');
      const outcome = getReviewOutcome(reviewPath);
      expect(outcome).toEqual({ isComplete: false, verdict: 'pending' });
    });

    it('returns pending for no verdict text', () => {
      const reviewPath = path.join(featureDir, 'review.md');
      fs.writeFileSync(reviewPath, reviewNoVerdictMd, 'utf-8');
      const outcome = getReviewOutcome(reviewPath);
      expect(outcome).toEqual({ isComplete: false, verdict: 'pending' });
    });

    it('only checks after Verdict header', () => {
      const reviewPath = path.join(featureDir, 'review.md');
      fs.writeFileSync(reviewPath, reviewVerdictBeforeHeaderMd, 'utf-8');
      const outcome = getReviewOutcome(reviewPath);
      expect(outcome).toEqual({ isComplete: true, verdict: 'pass' });
    });
  });

  describe('isPhaseComplete()', () => {
    it('created: true when init.md exists', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', createdPhaseArtifacts);
      expect(isPhaseComplete(featureDir, 'created')).toBe(true);
    });

    it('created: false when init.md missing', () => {
      expect(isPhaseComplete(featureDir, 'created')).toBe(false);
    });

    it('product_refinement: true when requirements.md exists', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', productRefinementArtifacts);
      expect(isPhaseComplete(featureDir, 'product_refinement')).toBe(true);
    });

    it('tech_spec: true when both spec and tasks exist', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', techSpecArtifacts);
      expect(isPhaseComplete(featureDir, 'tech_spec')).toBe(true);
    });

    it('tech_spec: false when spec.md missing', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        ...createdPhaseArtifacts,
        'tasks.md': validTasksMd,
      });
      expect(isPhaseComplete(featureDir, 'tech_spec')).toBe(false);
    });

    it('tech_spec: false when tasks.md missing', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        ...createdPhaseArtifacts,
        'spec.md': validSpecMd,
      });
      expect(isPhaseComplete(featureDir, 'tech_spec')).toBe(false);
    });

    it('implementation: true when all tasks done', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', implementationCompleteArtifacts);
      expect(isPhaseComplete(featureDir, 'implementation')).toBe(true);
    });

    it('implementation: false when tasks remain', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', techSpecArtifacts);
      expect(isPhaseComplete(featureDir, 'implementation')).toBe(false);
    });

    it('review: true when verdict exists (PASS)', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', reviewPassArtifacts);
      expect(isPhaseComplete(featureDir, 'review')).toBe(true);
    });

    it('review: true even on FAIL', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        ...implementationCompleteArtifacts,
        'review.md': failingReviewMd,
      });
      expect(isPhaseComplete(featureDir, 'review')).toBe(true);
    });

    it('testing: true when testing.md exists', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', testingPassArtifacts);
      expect(isPhaseComplete(featureDir, 'testing')).toBe(true);
    });

    it('complete: true when summary in done/', () => {
      createDoneFeatureFixture(testContext.projectRoot, 'test-feature', {
        'summary.md': validSummaryMd,
      });
      expect(isPhaseComplete(featureDir, 'complete')).toBe(true);
    });
  });

  describe('canTransitionTo()', () => {
    describe('Valid Adjacent Transitions', () => {
      it('created -> product_refinement', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', createdPhaseArtifacts);
        const result = canTransitionTo(featureDir, 'product_refinement');
        expect(result.canTransition).toBe(true);
      });

      it('product_refinement -> tech_spec', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', productRefinementArtifacts);
        const result = canTransitionTo(featureDir, 'tech_spec');
        expect(result.canTransition).toBe(true);
      });

      it('tech_spec -> implementation', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', techSpecArtifacts);
        const result = canTransitionTo(featureDir, 'implementation');
        expect(result.canTransition).toBe(true);
      });

      it('implementation -> review', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', implementationCompleteArtifacts);
        const result = canTransitionTo(featureDir, 'review');
        expect(result.canTransition).toBe(true);
      });

      it('review -> testing (PASS)', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', reviewPassArtifacts);
        const result = canTransitionTo(featureDir, 'testing');
        expect(result.canTransition).toBe(true);
      });

      it('testing -> complete', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', testingPassArtifacts);
        const result = canTransitionTo(featureDir, 'complete');
        expect(result.canTransition).toBe(true);
      });
    });

    describe('Special Cases (Review Outcomes)', () => {
      it('review -> implementation (FAIL retry)', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', {
          ...implementationCompleteArtifacts,
          'review.md': failingReviewMd,
        });
        const result = canTransitionTo(featureDir, 'implementation');
        expect(result.canTransition).toBe(true);
      });

      it('review -> testing (FAIL blocked)', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', {
          ...implementationCompleteArtifacts,
          'review.md': failingReviewMd,
        });
        const result = canTransitionTo(featureDir, 'testing');
        expect(result.canTransition).toBe(false);
        expect(result.reason).toContain('Review failed');
      });
    });

    describe('Invalid Transitions (Phase Skipping)', () => {
      it('cannot skip to implementation', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', createdPhaseArtifacts);
        const result = canTransitionTo(featureDir, 'implementation');
        expect(result.canTransition).toBe(false);
        expect(result.reason).toContain("'product_refinement'");
      });

      it('cannot skip to review', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', productRefinementArtifacts);
        const result = canTransitionTo(featureDir, 'review');
        expect(result.canTransition).toBe(false);
        expect(result.reason).toContain("'tech_spec'");
      });

      it('cannot skip to testing', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', techSpecArtifacts);
        const result = canTransitionTo(featureDir, 'testing');
        expect(result.canTransition).toBe(false);
      });

      it('cannot skip to complete', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', implementationCompleteArtifacts);
        const result = canTransitionTo(featureDir, 'complete');
        expect(result.canTransition).toBe(false);
      });
    });

    describe('Missing Prerequisite Artifacts', () => {
      it('no init.md', () => {
        const result = canTransitionTo(featureDir, 'product_refinement');
        expect(result.canTransition).toBe(false);
        expect(result.reason).toContain("'created'");
      });

      it('no requirements.md', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', createdPhaseArtifacts);
        const result = canTransitionTo(featureDir, 'tech_spec');
        expect(result.canTransition).toBe(false);
        expect(result.reason).toContain("'product_refinement'");
      });

      it('incomplete tasks', () => {
        createFeatureFixture(testContext.projectRoot, 'test-feature', techSpecArtifacts);
        const result = canTransitionTo(featureDir, 'review');
        expect(result.canTransition).toBe(false);
        expect(result.reason).toContain("'implementation'");
      });
    });
  });

  describe('suggestNextAction()', () => {
    it('suggests repair when not initialized', () => {
      const suggestion = suggestNextAction(featureDir);
      expect(suggestion.cliCommand).toContain('repair');
      expect(suggestion.aiCommand).toBeUndefined();
    });

    it('suggests refine when spec missing', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', createdPhaseArtifacts);
      const suggestion = suggestNextAction(featureDir);
      expect(suggestion.aiCommand).toContain('/nextai-refine');
      expect(suggestion.cliCommand).toContain('advance');
    });

    it('suggests implement when tasks incomplete', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', techSpecArtifacts);
      const suggestion = suggestNextAction(featureDir);
      expect(suggestion.aiCommand).toContain('/nextai-implement');
      expect(suggestion.cliCommand).toContain('advance');
    });

    it('suggests review when tasks done, no review', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', implementationCompleteArtifacts);
      const suggestion = suggestNextAction(featureDir);
      expect(suggestion.aiCommand).toContain('/nextai-review');
      expect(suggestion.cliCommand).toContain('advance');
    });

    it('suggests implement on review FAIL', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', {
        ...implementationCompleteArtifacts,
        'review.md': failingReviewMd,
      });
      const suggestion = suggestNextAction(featureDir);
      expect(suggestion.aiCommand).toContain('/nextai-implement');
      expect(suggestion.cliCommand).toContain('--retry-increment');
      expect(suggestion.hint).toBeDefined();
    });

    it('suggests testing after review PASS', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', reviewPassArtifacts);
      const suggestion = suggestNextAction(featureDir);
      expect(suggestion.aiCommand).toBeUndefined();
      expect(suggestion.cliCommand).toContain('testing');
      expect(suggestion.cliCommand).toContain('--status pass');
    });

    it('suggests complete after testing', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', testingPassArtifacts);
      const suggestion = suggestNextAction(featureDir);
      expect(suggestion.aiCommand).toContain('/nextai-complete');
      expect(suggestion.cliCommand).toContain('--skip-summary');
    });

    it('returns "Feature is complete!"', () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', testingPassArtifacts);
      createDoneFeatureFixture(testContext.projectRoot, 'test-feature', {
        'summary.md': validSummaryMd,
      });
      const suggestion = suggestNextAction(featureDir);
      expect(suggestion.action).toBe('Feature is complete!');
      expect(suggestion.cliCommand).toContain('show');
    });
  });

  describe('detectPhaseFromArtifacts()', () => {
    it("returns 'created' for init.md only", () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', createdPhaseArtifacts);
      expect(detectPhaseFromArtifacts(featureDir)).toBe('created');
    });

    it("returns 'product_refinement' for requirements", () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', productRefinementArtifacts);
      expect(detectPhaseFromArtifacts(featureDir)).toBe('product_refinement');
    });

    it("returns 'tech_spec' for spec + tasks", () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', techSpecArtifacts);
      expect(detectPhaseFromArtifacts(featureDir)).toBe('tech_spec');
    });

    it("returns 'implementation' when all tasks done", () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', implementationCompleteArtifacts);
      expect(detectPhaseFromArtifacts(featureDir)).toBe('implementation');
    });

    it("returns 'review' when review passed", () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', reviewPassArtifacts);
      expect(detectPhaseFromArtifacts(featureDir)).toBe('review');
    });

    it("returns 'testing' when testing passed", () => {
      createFeatureFixture(testContext.projectRoot, 'test-feature', testingPassArtifacts);
      expect(detectPhaseFromArtifacts(featureDir)).toBe('testing');
    });

    it("returns 'complete' when archived", () => {
      createDoneFeatureFixture(testContext.projectRoot, 'test-feature', {
        'summary.md': validSummaryMd,
      });
      expect(detectPhaseFromArtifacts(featureDir)).toBe('complete');
    });

    it("returns 'created' for empty feature folder", () => {
      expect(detectPhaseFromArtifacts(featureDir)).toBe('created');
    });
  });

  describe('phaseIndex()', () => {
    it('returns correct index for each phase', () => {
      expect(phaseIndex('created')).toBe(0);
      expect(phaseIndex('product_refinement')).toBe(1);
      expect(phaseIndex('tech_spec')).toBe(2);
      expect(phaseIndex('implementation')).toBe(3);
      expect(phaseIndex('review')).toBe(4);
      expect(phaseIndex('testing')).toBe(5);
      expect(phaseIndex('complete')).toBe(6);
    });
  });

  describe('getNextPhase()', () => {
    it('returns next phase in sequence', () => {
      expect(getNextPhase('created')).toBe('product_refinement');
      expect(getNextPhase('product_refinement')).toBe('tech_spec');
      expect(getNextPhase('tech_spec')).toBe('implementation');
      expect(getNextPhase('implementation')).toBe('review');
      expect(getNextPhase('review')).toBe('testing');
      expect(getNextPhase('testing')).toBe('complete');
    });

    it('returns null for complete phase', () => {
      expect(getNextPhase('complete')).toBeNull();
    });
  });
});
