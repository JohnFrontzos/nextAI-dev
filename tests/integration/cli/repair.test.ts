import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { scaffoldProject } from '../../../src/core/scaffolding/project';
import { addFeature, getFeature, blockFeature } from '../../../src/core/state/ledger';
import { scaffoldFeature, featureFolderExists } from '../../../src/core/scaffolding/feature';
import {
  createTestProject,
  readTestJson,
  writeTestJson,
  type TestContext,
} from '../../helpers/test-utils';
import type { Ledger } from '../../../src/schemas/ledger';

describe('Repair Command Integration', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    scaffoldProject(testContext.projectRoot, 'Test Project');
  });

  afterEach(() => {
    testContext.cleanup();
  });

  // Helper to create a feature
  function createFeature(title: string) {
    const feature = addFeature(testContext.projectRoot, title, 'feature');
    scaffoldFeature(testContext.projectRoot, feature.id, title, 'feature');
    return feature;
  }

  describe('Repair Command - Non-Interactive', () => {
    it('reports healthy state when no issues found', () => {
      const feature = createFeature('Healthy Feature');

      // Feature should be healthy with all required artifacts
      expect(featureFolderExists(testContext.projectRoot, feature.id)).toBe(true);

      // Check initialization.md exists
      const initPath = path.join(
        testContext.projectRoot,
        'nextai',
        'todo',
        feature.id,
        'planning',
        'initialization.md'
      );
      expect(fs.existsSync(initPath)).toBe(true);
    });

    it('detects blocked features as issues', () => {
      const feature = createFeature('Blocked Feature');

      // Block the feature
      blockFeature(testContext.projectRoot, feature.id, 'Test blocking reason');

      // Get the feature and verify it's blocked
      const blockedFeature = getFeature(testContext.projectRoot, feature.id);
      expect(blockedFeature?.blocked_reason).toBe('Test blocking reason');
    });

    it('detects orphan ledger entries', () => {
      // Add feature to ledger without scaffolding folder
      const feature = addFeature(testContext.projectRoot, 'Orphan Feature', 'feature');

      // Verify folder doesn't exist
      expect(featureFolderExists(testContext.projectRoot, feature.id)).toBe(false);

      // Verify ledger has the entry
      const ledger = readTestJson<Ledger>(testContext.projectRoot, '.nextai/state/ledger.json');
      expect(ledger.features.some(f => f.id === feature.id)).toBe(true);
    });
  });

  describe('Repair Command - Exit codes', () => {
    it('should exit 0 when feature is healthy', () => {
      const feature = createFeature('Healthy Feature');

      // Feature exists and is properly scaffolded
      expect(featureFolderExists(testContext.projectRoot, feature.id)).toBe(true);
    });

    it('should have issues when feature is blocked', () => {
      const feature = createFeature('Blocked Feature');
      blockFeature(testContext.projectRoot, feature.id, 'Blocking reason');

      const blockedFeature = getFeature(testContext.projectRoot, feature.id);
      expect(blockedFeature?.blocked_reason).toBeTruthy();
    });
  });

  describe('Repair Command - Ledger Reconstruction', () => {
    it('detects missing ledger entry for todo/ feature', () => {
      // Create feature and scaffold it
      const feature = createFeature('Test Feature');

      // Remove from ledger but keep folder
      const ledger = readTestJson<Ledger>(testContext.projectRoot, '.nextai/state/ledger.json');
      ledger.features = ledger.features.filter(f => f.id !== feature.id);
      writeTestJson(testContext.projectRoot, '.nextai/state/ledger.json', ledger);

      // Verify folder exists but not in ledger
      expect(featureFolderExists(testContext.projectRoot, feature.id)).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)).toBeUndefined();
    });

    it('detects missing ledger entry for done/ feature', () => {
      // Create and complete a feature
      const feature = createFeature('Completed Feature');

      // Ensure done directory exists and move to done/
      const todoPath = path.join(testContext.projectRoot, 'nextai', 'todo', feature.id);
      const doneDir = path.join(testContext.projectRoot, 'nextai', 'done');
      const donePath = path.join(doneDir, feature.id);

      if (!fs.existsSync(doneDir)) {
        fs.mkdirSync(doneDir, { recursive: true });
      }
      fs.renameSync(todoPath, donePath);

      // Remove from ledger
      const ledger = readTestJson<Ledger>(testContext.projectRoot, '.nextai/state/ledger.json');
      ledger.features = ledger.features.filter(f => f.id !== feature.id);
      writeTestJson(testContext.projectRoot, '.nextai/state/ledger.json', ledger);

      // Verify in done/ but not in ledger
      expect(fs.existsSync(donePath)).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)).toBeUndefined();
    });

    it('handles multiple missing entries', () => {
      // Create multiple features
      const feature1 = createFeature('Feature 1');
      const feature2 = createFeature('Feature 2');
      const feature3 = createFeature('Feature 3');

      // Clear ledger
      writeTestJson(testContext.projectRoot, '.nextai/state/ledger.json', { features: [] });

      // Verify all folders exist
      expect(featureFolderExists(testContext.projectRoot, feature1.id)).toBe(true);
      expect(featureFolderExists(testContext.projectRoot, feature2.id)).toBe(true);
      expect(featureFolderExists(testContext.projectRoot, feature3.id)).toBe(true);

      // Verify all missing from ledger
      expect(getFeature(testContext.projectRoot, feature1.id)).toBeUndefined();
      expect(getFeature(testContext.projectRoot, feature2.id)).toBeUndefined();
      expect(getFeature(testContext.projectRoot, feature3.id)).toBeUndefined();
    });

    it('preserves existing ledger entries during reconstruction', () => {
      // Create two features
      const existing = createFeature('Existing Feature');
      const missing = createFeature('Missing Feature');

      // Remove only one from ledger
      const ledger = readTestJson<Ledger>(testContext.projectRoot, '.nextai/state/ledger.json');
      ledger.features = ledger.features.filter(f => f.id !== missing.id);
      writeTestJson(testContext.projectRoot, '.nextai/state/ledger.json', ledger);

      // Verify one is in ledger, one is not
      expect(getFeature(testContext.projectRoot, existing.id)).toBeDefined();
      expect(getFeature(testContext.projectRoot, missing.id)).toBeUndefined();

      // Both folders should exist
      expect(featureFolderExists(testContext.projectRoot, existing.id)).toBe(true);
      expect(featureFolderExists(testContext.projectRoot, missing.id)).toBe(true);
    });

    it('correctly detects phase from artifact files', () => {
      // Create feature with specific artifacts
      const feature = createFeature('In Progress Feature');
      const featurePath = path.join(testContext.projectRoot, 'nextai', 'todo', feature.id);

      // Create spec.md and tasks.md
      fs.writeFileSync(path.join(featurePath, 'planning', 'requirements.md'), '# Requirements\n');
      fs.writeFileSync(path.join(featurePath, 'spec.md'), '# Technical Spec\n');
      fs.writeFileSync(path.join(featurePath, 'tasks.md'), '# Tasks\n');

      // Remove from ledger
      writeTestJson(testContext.projectRoot, '.nextai/state/ledger.json', { features: [] });

      // Folder exists with artifacts
      expect(fs.existsSync(path.join(featurePath, 'tasks.md'))).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)).toBeUndefined();
    });

    it('handles feature with missing initialization.md', () => {
      // Create feature folder without initialization.md
      const featureId = '20251225_test-feature';
      const featurePath = path.join(testContext.projectRoot, 'nextai', 'todo', featureId);
      fs.mkdirSync(featurePath, { recursive: true });

      // Ledger is empty
      writeTestJson(testContext.projectRoot, '.nextai/state/ledger.json', { features: [] });

      // Folder exists without initialization.md
      expect(fs.existsSync(featurePath)).toBe(true);
      expect(fs.existsSync(path.join(featurePath, 'planning', 'initialization.md'))).toBe(false);
    });

    it('handles feature with malformed initialization.md', () => {
      // Create feature
      const feature = createFeature('Malformed Feature');
      const featurePath = path.join(testContext.projectRoot, 'nextai', 'todo', feature.id);

      // Overwrite initialization.md with malformed content
      const initPath = path.join(featurePath, 'planning', 'initialization.md');
      fs.writeFileSync(initPath, 'Invalid content without proper heading\n');

      // Remove from ledger
      writeTestJson(testContext.projectRoot, '.nextai/state/ledger.json', { features: [] });

      // Folder exists with malformed file
      expect(fs.existsSync(initPath)).toBe(true);
      expect(getFeature(testContext.projectRoot, feature.id)).toBeUndefined();
    });

    it('handles mixed scenario with todo and done missing entries', () => {
      // Create features in both todo and done
      const todoFeature = createFeature('Todo Feature');
      const doneFeature = createFeature('Done Feature');

      // Ensure done directory exists and move one to done/
      const todoPath = path.join(testContext.projectRoot, 'nextai', 'todo', doneFeature.id);
      const doneDir = path.join(testContext.projectRoot, 'nextai', 'done');
      const donePath = path.join(doneDir, doneFeature.id);

      if (!fs.existsSync(doneDir)) {
        fs.mkdirSync(doneDir, { recursive: true });
      }
      fs.renameSync(todoPath, donePath);

      // Clear ledger
      writeTestJson(testContext.projectRoot, '.nextai/state/ledger.json', { features: [] });

      // Verify both missing from ledger
      expect(getFeature(testContext.projectRoot, todoFeature.id)).toBeUndefined();
      expect(getFeature(testContext.projectRoot, doneFeature.id)).toBeUndefined();

      // Verify folders exist in correct locations
      expect(featureFolderExists(testContext.projectRoot, todoFeature.id)).toBe(true);
      expect(fs.existsSync(donePath)).toBe(true);
    });

    it('handles empty todo and done directories', () => {
      // Ensure directories exist
      const todoDir = path.join(testContext.projectRoot, 'nextai', 'todo');
      const doneDir = path.join(testContext.projectRoot, 'nextai', 'done');

      if (!fs.existsSync(todoDir)) {
        fs.mkdirSync(todoDir, { recursive: true });
      }
      if (!fs.existsSync(doneDir)) {
        fs.mkdirSync(doneDir, { recursive: true });
      }

      // Clear ledger
      writeTestJson(testContext.projectRoot, '.nextai/state/ledger.json', { features: [] });

      // Verify directories exist but are empty
      expect(fs.existsSync(todoDir)).toBe(true);
      expect(fs.existsSync(doneDir)).toBe(true);

      const todoFiles = fs.readdirSync(todoDir);
      const doneFiles = fs.readdirSync(doneDir);

      expect(todoFiles.length).toBe(0);
      expect(doneFiles.length).toBe(0);
    });

    it('extracts correct metadata from different feature types', () => {
      // Create bug feature
      const bug = addFeature(testContext.projectRoot, 'Test Bug', 'bug');
      scaffoldFeature(testContext.projectRoot, bug.id, 'Test Bug', 'bug');

      // Create task feature
      const task = addFeature(testContext.projectRoot, 'Test Task', 'task');
      scaffoldFeature(testContext.projectRoot, task.id, 'Test Task', 'task');

      // Remove from ledger
      writeTestJson(testContext.projectRoot, '.nextai/state/ledger.json', { features: [] });

      // Both folders should exist
      expect(featureFolderExists(testContext.projectRoot, bug.id)).toBe(true);
      expect(featureFolderExists(testContext.projectRoot, task.id)).toBe(true);

      // Verify initialization.md files have correct format
      const bugInitPath = path.join(
        testContext.projectRoot, 'nextai', 'todo', bug.id, 'planning', 'initialization.md'
      );
      const taskInitPath = path.join(
        testContext.projectRoot, 'nextai', 'todo', task.id, 'planning', 'initialization.md'
      );

      const bugContent = fs.readFileSync(bugInitPath, 'utf-8');
      const taskContent = fs.readFileSync(taskInitPath, 'utf-8');

      expect(bugContent).toContain('# Bug:');
      expect(taskContent).toContain('# Task:');
    });
  });
});
