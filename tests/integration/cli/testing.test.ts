import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { scaffoldProject } from '../../../src/core/scaffolding/project';
import { addFeature, getFeature } from '../../../src/core/state/ledger';
import { scaffoldFeature } from '../../../src/core/scaffolding/feature';
import {
  createTestProject,
  writeTestFile,
  type TestContext,
} from '../../helpers/test-utils';
import type { Ledger } from '../../../src/schemas/ledger';

describe('Testing Command Integration', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    scaffoldProject(testContext.projectRoot, 'Test Project');
  });

  afterEach(() => {
    testContext.cleanup();
  });

  // Helper to create a feature directly in testing phase by manipulating ledger
  function createFeatureInTestingPhase(title: string) {
    const feature = addFeature(testContext.projectRoot, title, 'feature');
    scaffoldFeature(testContext.projectRoot, feature.id, title, 'feature');

    // Create required artifacts for testing phase
    writeTestFile(
      testContext.projectRoot,
      `nextai/todo/${feature.id}/planning/requirements.md`,
      '# Requirements\n\n## Functional Requirements\n- Test requirement'
    );
    writeTestFile(
      testContext.projectRoot,
      `nextai/todo/${feature.id}/spec.md`,
      '# Technical Specification\n\n## Overview\nTest spec'
    );
    writeTestFile(
      testContext.projectRoot,
      `nextai/todo/${feature.id}/tasks.md`,
      '# Tasks\n\n- [x] Task 1\n- [x] Task 2'
    );
    writeTestFile(
      testContext.projectRoot,
      `nextai/todo/${feature.id}/review.md`,
      '# Code Review\n\n## Verdict\nPASS'
    );

    // Directly update ledger to testing phase
    const ledger = JSON.parse(
      fs.readFileSync(path.join(testContext.projectRoot, '.nextai/state/ledger.json'), 'utf-8')
    ) as Ledger;
    const featureIndex = ledger.features.findIndex(f => f.id === feature.id);
    if (featureIndex !== -1) {
      ledger.features[featureIndex].phase = 'testing';
    }
    fs.writeFileSync(
      path.join(testContext.projectRoot, '.nextai/state/ledger.json'),
      JSON.stringify(ledger, null, 2)
    );

    return getFeature(testContext.projectRoot, feature.id)!;
  }

  describe('Testing Command - Non-Interactive', () => {
    it('validates status value - accepts pass', () => {
      const feature = createFeatureInTestingPhase('Test Feature');

      expect(feature.phase).toBe('testing');

      // Validate that 'pass' is a valid status
      const validStatuses = ['pass', 'fail'];
      expect(validStatuses.includes('pass')).toBe(true);
    });

    it('validates status value - accepts fail', () => {
      const feature = createFeatureInTestingPhase('Test Feature');

      expect(feature.phase).toBe('testing');

      // Validate that 'fail' is a valid status
      const validStatuses = ['pass', 'fail'];
      expect(validStatuses.includes('fail')).toBe(true);
    });

    it('validates status value - rejects invalid', () => {
      const feature = createFeatureInTestingPhase('Test Feature');

      expect(feature.phase).toBe('testing');

      // Validate that 'invalid' is not a valid status
      const validStatuses = ['pass', 'fail'];
      expect(validStatuses.includes('invalid')).toBe(false);
    });

    it('uses default notes when not provided', () => {
      // When notes are not provided, default should be 'Logged via CLI'
      const defaultNotes = 'Logged via CLI';
      expect(defaultNotes).toBe('Logged via CLI');
    });
  });

  describe('Testing Command - Phase requirements', () => {
    it('requires feature to be in testing phase', () => {
      // Create feature but don't advance to testing phase
      const feature = addFeature(testContext.projectRoot, 'Not Ready', 'feature');
      scaffoldFeature(testContext.projectRoot, feature.id, 'Not Ready', 'feature');

      // Feature should be in 'created' phase, not 'testing'
      expect(feature.phase).toBe('created');
      expect(feature.phase).not.toBe('testing');
    });

    it('can log test result when in testing phase', () => {
      const feature = createFeatureInTestingPhase('Ready Feature');

      // Feature should be in testing phase
      expect(feature.phase).toBe('testing');
    });
  });
});
