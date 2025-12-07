import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  scaffoldFeature,
  featureFolderExists,
  getFeaturePath,
  getDonePath,
  getArtifactPath,
  artifactExists,
} from '../../../../src/core/scaffolding/feature';
import {
  createTestProject,
  initNextAIStructure,
  type TestContext,
} from '../../../helpers/test-utils';

describe('Feature Scaffolding', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    initNextAIStructure(testContext.projectRoot);
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('scaffoldFeature()', () => {
    it('creates nextai/todo/<id>/ directory', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test Feature', 'feature');

      const featureDir = path.join(testContext.projectRoot, 'nextai', 'todo', 'test-feature');
      expect(fs.existsSync(featureDir)).toBe(true);
    });

    it('creates planning/ subdirectory', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test Feature', 'feature');

      const planningDir = path.join(testContext.projectRoot, 'nextai', 'todo', 'test-feature', 'planning');
      expect(fs.existsSync(planningDir)).toBe(true);
    });

    it('creates attachments/ directory', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test Feature', 'feature');

      const attachmentsDir = path.join(testContext.projectRoot, 'nextai', 'todo', 'test-feature', 'attachments');
      expect(fs.existsSync(attachmentsDir)).toBe(true);
    });

    it('creates attachments/design/ subdirectory', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test Feature', 'feature');

      const designDir = path.join(testContext.projectRoot, 'nextai', 'todo', 'test-feature', 'attachments', 'design');
      expect(fs.existsSync(designDir)).toBe(true);
    });

    it('creates attachments/evidence/ subdirectory', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test Feature', 'feature');

      const evidenceDir = path.join(testContext.projectRoot, 'nextai', 'todo', 'test-feature', 'attachments', 'evidence');
      expect(fs.existsSync(evidenceDir)).toBe(true);
    });

    it('creates attachments/reference/ subdirectory', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test Feature', 'feature');

      const referenceDir = path.join(testContext.projectRoot, 'nextai', 'todo', 'test-feature', 'attachments', 'reference');
      expect(fs.existsSync(referenceDir)).toBe(true);
    });

    it('creates initialization.md', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test Feature', 'feature');

      const initPath = path.join(
        testContext.projectRoot,
        'nextai',
        'todo',
        'test-feature',
        'planning',
        'initialization.md'
      );
      expect(fs.existsSync(initPath)).toBe(true);
    });

    it('uses title in initialization.md', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'My Feature', 'feature');

      const initPath = path.join(
        testContext.projectRoot,
        'nextai',
        'todo',
        'test-feature',
        'planning',
        'initialization.md'
      );
      const content = fs.readFileSync(initPath, 'utf-8');
      expect(content).toContain('# Feature: My Feature');
    });

    it('uses type label in initialization.md', () => {
      scaffoldFeature(testContext.projectRoot, 'bug-fix', 'Bug Fix', 'bug');

      const initPath = path.join(
        testContext.projectRoot,
        'nextai',
        'todo',
        'bug-fix',
        'planning',
        'initialization.md'
      );
      const content = fs.readFileSync(initPath, 'utf-8');
      expect(content).toContain('# Bug: Bug Fix');
    });

    it('uses description if provided', () => {
      scaffoldFeature(
        testContext.projectRoot,
        'test-feature',
        'Test Feature',
        'feature',
        'Custom description here'
      );

      const initPath = path.join(
        testContext.projectRoot,
        'nextai',
        'todo',
        'test-feature',
        'planning',
        'initialization.md'
      );
      const content = fs.readFileSync(initPath, 'utf-8');
      expect(content).toContain('Custom description here');
    });

    it('uses placeholder if no description', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test Feature', 'feature');

      const initPath = path.join(
        testContext.projectRoot,
        'nextai',
        'todo',
        'test-feature',
        'planning',
        'initialization.md'
      );
      const content = fs.readFileSync(initPath, 'utf-8');
      expect(content).toContain('[Add description here]');
    });

    it('returns feature directory path', () => {
      const result = scaffoldFeature(
        testContext.projectRoot,
        'test-feature',
        'Test Feature',
        'feature'
      );

      expect(result).toBe(path.join(testContext.projectRoot, 'nextai', 'todo', 'test-feature'));
    });
  });

  describe('featureFolderExists()', () => {
    it('returns true when exists', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test Feature', 'feature');
      expect(featureFolderExists(testContext.projectRoot, 'test-feature')).toBe(true);
    });

    it('returns false when missing', () => {
      expect(featureFolderExists(testContext.projectRoot, 'nonexistent')).toBe(false);
    });
  });

  describe('getFeaturePath()', () => {
    it('returns correct path', () => {
      const result = getFeaturePath(testContext.projectRoot, 'feature-1');
      expect(result).toBe(path.join(testContext.projectRoot, 'nextai', 'todo', 'feature-1'));
    });
  });

  describe('getDonePath()', () => {
    it('returns correct path', () => {
      const result = getDonePath(testContext.projectRoot, 'feature-1');
      expect(result).toBe(path.join(testContext.projectRoot, 'nextai', 'done', 'feature-1'));
    });
  });

  describe('getArtifactPath()', () => {
    it('returns correct path for artifact', () => {
      const result = getArtifactPath(testContext.projectRoot, 'feature-1', 'spec.md');
      expect(result).toBe(path.join(testContext.projectRoot, 'nextai', 'todo', 'feature-1', 'spec.md'));
    });

    it('handles nested artifacts', () => {
      const result = getArtifactPath(testContext.projectRoot, 'feature-1', 'planning/requirements.md');
      expect(result).toBe(
        path.join(testContext.projectRoot, 'nextai', 'todo', 'feature-1', 'planning/requirements.md')
      );
    });
  });

  describe('artifactExists()', () => {
    it('returns true when artifact exists', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test Feature', 'feature');
      expect(
        artifactExists(testContext.projectRoot, 'test-feature', 'planning/initialization.md')
      ).toBe(true);
    });

    it('returns false when artifact missing', () => {
      scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test Feature', 'feature');
      expect(artifactExists(testContext.projectRoot, 'test-feature', 'spec.md')).toBe(false);
    });
  });
});
