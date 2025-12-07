import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { scaffoldProject, scaffoldGlobalDirs, isProjectInitialized } from '../../src/core/scaffolding/project';
import { scaffoldFeature, featureFolderExists } from '../../src/core/scaffolding/feature';
import {
  addFeature,
  getFeature,
  listFeatures,
  updateFeaturePhase,
} from '../../src/core/state/ledger';
import { suggestNextAction, detectPhaseFromArtifacts } from '../../src/core/validation/phase-detection';
import { syncToClient } from '../../src/core/sync';
import { readHistory } from '../../src/core/state/history';
import {
  createTestProject,
  createFeatureFixture,
  createDoneFeatureFixture,
  type TestContext,
} from '../helpers/test-utils';
import {
  validInitializationMd,
  validRequirementsMd,
  validSpecMd,
  allTasksCompleteMd,
  passingReviewMd,
  passingTestingMd,
  validSummaryMd,
} from '../fixtures/artifacts';

describe('E2E Workflow Tests', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
  });

  afterEach(() => {
    testContext.cleanup();
  });

  // Helper to simulate full CLI create command (addFeature + scaffoldFeature)
  function createFeature(title: string, type: 'feature' | 'bug' | 'task' = 'feature') {
    const feature = addFeature(testContext.projectRoot, title, type);
    scaffoldFeature(testContext.projectRoot, feature.id, title, type);
    return feature;
  }

  describe('Init -> Create -> List', () => {
    it('initializes project, creates feature, and lists it', () => {
      // Init
      scaffoldProject(testContext.projectRoot, 'Test Project');
      scaffoldGlobalDirs(testContext.projectRoot);
      expect(isProjectInitialized(testContext.projectRoot)).toBe(true);

      // Create
      const feature = createFeature('My Feature', 'feature');
      expect(featureFolderExists(testContext.projectRoot, feature.id)).toBe(true);

      // List
      const features = listFeatures(testContext.projectRoot);
      expect(features).toHaveLength(1);
      expect(features[0].title).toBe('My Feature');
    });
  });

  describe('Create -> Show -> Resume', () => {
    it('creates feature and gets correct suggestions', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');
      scaffoldGlobalDirs(testContext.projectRoot);

      const feature = createFeature('Test Feature', 'feature');
      const featurePath = path.join(testContext.projectRoot, 'todo', feature.id);

      // Show (get feature)
      const fetched = getFeature(testContext.projectRoot, feature.id);
      expect(fetched).toBeDefined();
      expect(fetched?.phase).toBe('created');

      // Resume (suggest next action)
      const suggestion = suggestNextAction(featurePath);
      // Since we just created, it needs init.md (but scaffoldFeature creates it)
      // So it should suggest refinement
      expect(suggestion.suggestedPhase).toBe('product_refinement');
      expect(suggestion.aiCommand).toContain('/nextai-refine');
    });
  });

  describe('Phase Progression with Manual Artifacts', () => {
    it('progresses through all phases with manual artifacts', async () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');
      scaffoldGlobalDirs(testContext.projectRoot);

      const feature = createFeature('Full Workflow', 'feature');
      const featurePath = path.join(testContext.projectRoot, 'todo', feature.id);

      // Phase 1: Created -> Product Refinement
      // init.md already created by scaffoldFeature
      let result = await updateFeaturePhase(
        testContext.projectRoot,
        feature.id,
        'product_refinement'
      );
      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('product_refinement');

      // Phase 2: Product Refinement -> Tech Spec
      createFeatureFixture(testContext.projectRoot, feature.id, {
        'planning/requirements.md': validRequirementsMd,
      });
      result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'tech_spec');
      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('tech_spec');

      // Phase 3: Tech Spec -> Implementation
      createFeatureFixture(testContext.projectRoot, feature.id, {
        'spec.md': validSpecMd,
        'tasks.md': allTasksCompleteMd, // All tasks complete for testing
      });
      result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'implementation');
      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('implementation');

      // Phase 4: Implementation -> Review
      result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'review');
      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('review');

      // Phase 5: Review -> Testing
      createFeatureFixture(testContext.projectRoot, feature.id, {
        'review.md': passingReviewMd,
      });
      result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'testing');
      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('testing');

      // Phase 6: Testing -> Complete
      createFeatureFixture(testContext.projectRoot, feature.id, {
        'testing.md': passingTestingMd,
      });
      result = await updateFeaturePhase(testContext.projectRoot, feature.id, 'complete');
      expect(result.success).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)?.phase).toBe('complete');

      // Verify feature is in complete phase
      const completed = getFeature(testContext.projectRoot, feature.id);
      expect(completed?.phase).toBe('complete');

      // Verify history has all phase transitions
      const history = readHistory(testContext.projectRoot);
      const transitions = history.filter((e) => e.event === 'phase_transition');
      expect(transitions.length).toBe(6);
    });
  });

  describe('Sync to Claude Code', () => {
    it('syncs to Claude Code after init', async () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      const result = await syncToClient(testContext.projectRoot, 'claude');

      expect(fs.existsSync(path.join(testContext.projectRoot, '.claude'))).toBe(true);
      expect(result.commandsWritten.length).toBeGreaterThan(0);
    });
  });

  describe('Sync to OpenCode', () => {
    it('syncs to OpenCode after init', async () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');

      const result = await syncToClient(testContext.projectRoot, 'opencode');

      expect(fs.existsSync(path.join(testContext.projectRoot, '.opencode'))).toBe(true);
      expect(result.commandsWritten.length).toBeGreaterThan(0);
    });
  });

  describe('Phase Detection from Artifacts', () => {
    it('detects phase correctly from artifacts', () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');
      scaffoldGlobalDirs(testContext.projectRoot);

      const feature = createFeature('Test', 'feature');
      const featurePath = path.join(testContext.projectRoot, 'todo', feature.id);

      // Initially at 'created' (init.md exists)
      expect(detectPhaseFromArtifacts(featurePath)).toBe('created');

      // Add requirements.md
      createFeatureFixture(testContext.projectRoot, feature.id, {
        'planning/requirements.md': validRequirementsMd,
      });
      expect(detectPhaseFromArtifacts(featurePath)).toBe('product_refinement');

      // Add spec.md and tasks.md
      createFeatureFixture(testContext.projectRoot, feature.id, {
        'spec.md': validSpecMd,
        'tasks.md': '- [ ] Task 1',
      });
      expect(detectPhaseFromArtifacts(featurePath)).toBe('tech_spec');

      // Complete all tasks
      createFeatureFixture(testContext.projectRoot, feature.id, {
        'tasks.md': allTasksCompleteMd,
      });
      expect(detectPhaseFromArtifacts(featurePath)).toBe('implementation');

      // Add passing review
      createFeatureFixture(testContext.projectRoot, feature.id, {
        'review.md': passingReviewMd,
      });
      expect(detectPhaseFromArtifacts(featurePath)).toBe('review');

      // Add passing testing
      createFeatureFixture(testContext.projectRoot, feature.id, {
        'testing.md': passingTestingMd,
      });
      expect(detectPhaseFromArtifacts(featurePath)).toBe('testing');

      // Archive to done/
      createDoneFeatureFixture(testContext.projectRoot, feature.id, {
        'summary.md': validSummaryMd,
      });
      expect(detectPhaseFromArtifacts(featurePath)).toBe('complete');
    });
  });

  describe('Multiple Features Workflow', () => {
    it('manages multiple features independently', async () => {
      scaffoldProject(testContext.projectRoot, 'Test Project');
      scaffoldGlobalDirs(testContext.projectRoot);

      // Create multiple features
      const feature1 = createFeature('Feature One', 'feature');
      const feature2 = createFeature('Bug Fix', 'bug');
      const feature3 = createFeature('Task', 'task');

      // Verify all created
      const all = listFeatures(testContext.projectRoot);
      expect(all).toHaveLength(3);

      // Advance feature1
      await updateFeaturePhase(testContext.projectRoot, feature1.id, 'product_refinement');

      // Verify independent phases
      expect(getFeature(testContext.projectRoot, feature1.id)?.phase).toBe('product_refinement');
      expect(getFeature(testContext.projectRoot, feature2.id)?.phase).toBe('created');
      expect(getFeature(testContext.projectRoot, feature3.id)?.phase).toBe('created');

      // Filter by type
      const bugs = listFeatures(testContext.projectRoot, { type: 'bug' });
      expect(bugs).toHaveLength(1);
      expect(bugs[0].title).toBe('Bug Fix');
    });
  });
});
