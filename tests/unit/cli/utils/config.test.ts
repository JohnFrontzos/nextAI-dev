import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTestProject,
  initNextAIStructure,
  type TestContext,
} from '../../../helpers/test-utils';
import {
  initLedger,
  loadLedger,
  saveLedger,
  getLedgerPath,
} from '../../../../src/cli/utils/config';
import { emptyLedger, createFeature, type Ledger } from '../../../../src/schemas/index';

describe('initLedger()', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
  });

  afterEach(() => {
    testContext.cleanup();
  });

  it('creates empty ledger when none exists', () => {
    // Setup: Create .nextai/state directory but no ledger file
    const stateDir = path.join(testContext.projectRoot, '.nextai', 'state');
    fs.mkdirSync(stateDir, { recursive: true });

    // Act
    const ledger = initLedger(testContext.projectRoot);

    // Assert: Ledger is empty
    expect(ledger).toBeDefined();
    expect(ledger.features).toEqual([]);

    // Assert: Ledger file created
    const ledgerPath = getLedgerPath(testContext.projectRoot);
    expect(fs.existsSync(ledgerPath)).toBe(true);

    // Assert: File contains valid JSON
    const fileContent = fs.readFileSync(ledgerPath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    expect(parsed).toEqual({ features: [] });
  });

  it('preserves existing valid ledger', () => {
    // Setup: Initialize structure and create ledger with features
    initNextAIStructure(testContext.projectRoot);

    const feature1 = createFeature('feature-1', 'Test Feature One', 'feature');
    const feature2 = createFeature('feature-2', 'Test Feature Two', 'bug');
    const feature3 = createFeature('feature-3', 'Test Feature Three', 'task');

    const originalLedger: Ledger = {
      features: [feature1, feature2, feature3],
    };

    saveLedger(testContext.projectRoot, originalLedger);

    // Act
    const ledger = initLedger(testContext.projectRoot);

    // Assert: All features preserved
    expect(ledger.features.length).toBe(3);
    expect(ledger.features).toEqual(originalLedger.features);

    // Assert: Feature IDs match
    expect(ledger.features[0].id).toBe('feature-1');
    expect(ledger.features[1].id).toBe('feature-2');
    expect(ledger.features[2].id).toBe('feature-3');

    // Assert: All properties preserved
    expect(ledger.features[0].title).toBe('Test Feature One');
    expect(ledger.features[0].type).toBe('feature');
    expect(ledger.features[1].type).toBe('bug');
    expect(ledger.features[2].type).toBe('task');
  });

  it('replaces corrupted ledger with invalid JSON', () => {
    // Setup: Create ledger file with invalid JSON
    initNextAIStructure(testContext.projectRoot);
    const ledgerPath = getLedgerPath(testContext.projectRoot);
    fs.writeFileSync(ledgerPath, '{ invalid json }', 'utf-8');

    // Spy on console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    const ledger = initLedger(testContext.projectRoot);

    // Assert: Warning logged
    expect(warnSpy).toHaveBeenCalledWith('Existing ledger corrupted, creating new one');

    // Assert: New empty ledger created
    expect(ledger.features).toEqual([]);

    // Assert: File now contains valid JSON
    const fileContent = fs.readFileSync(ledgerPath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    expect(parsed).toEqual({ features: [] });

    // Cleanup
    warnSpy.mockRestore();
  });

  it('replaces ledger with schema validation failure', () => {
    // Setup: Create valid JSON but invalid schema (missing 'features' field)
    initNextAIStructure(testContext.projectRoot);
    const ledgerPath = getLedgerPath(testContext.projectRoot);
    fs.writeFileSync(ledgerPath, JSON.stringify({ invalid: 'schema' }), 'utf-8');

    // Spy on console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    const ledger = initLedger(testContext.projectRoot);

    // Assert: Warning logged
    expect(warnSpy).toHaveBeenCalledWith('Existing ledger corrupted, creating new one');

    // Assert: New empty ledger created
    expect(ledger.features).toEqual([]);

    // Assert: File now has valid schema
    const reloadedLedger = loadLedger(testContext.projectRoot);
    expect(reloadedLedger.features).toEqual([]);

    // Cleanup
    warnSpy.mockRestore();
  });

  it('is idempotent - multiple calls preserve data', () => {
    // Setup: Initialize with a feature
    initNextAIStructure(testContext.projectRoot);

    const feature = createFeature('test-feature', 'Test Feature', 'feature');

    const originalLedger: Ledger = {
      features: [feature],
    };

    saveLedger(testContext.projectRoot, originalLedger);

    // Spy on console.warn to ensure no warnings
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Act: Call initLedger multiple times
    const ledger1 = initLedger(testContext.projectRoot);
    const ledger2 = initLedger(testContext.projectRoot);
    const ledger3 = initLedger(testContext.projectRoot);

    // Assert: All three calls return same feature
    expect(ledger1.features.length).toBe(1);
    expect(ledger2.features.length).toBe(1);
    expect(ledger3.features.length).toBe(1);

    expect(ledger1.features[0].id).toBe('test-feature');
    expect(ledger2.features[0].id).toBe('test-feature');
    expect(ledger3.features[0].id).toBe('test-feature');

    // Assert: No warnings logged
    expect(warnSpy).not.toHaveBeenCalled();

    // Assert: File unchanged
    const finalLedger = loadLedger(testContext.projectRoot);
    expect(finalLedger.features).toEqual(originalLedger.features);

    // Cleanup
    warnSpy.mockRestore();
  });

  it('preserves empty but valid ledger', () => {
    // Setup: Create valid empty ledger
    initNextAIStructure(testContext.projectRoot);
    // initNextAIStructure creates an empty ledger by default

    const ledgerPath = getLedgerPath(testContext.projectRoot);
    const originalContent = fs.readFileSync(ledgerPath, 'utf-8');

    // Spy on console.warn to ensure no warnings
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    const ledger = initLedger(testContext.projectRoot);

    // Assert: Empty ledger preserved
    expect(ledger.features).toEqual([]);

    // Assert: No warning logged
    expect(warnSpy).not.toHaveBeenCalled();

    // Assert: File content unchanged
    const newContent = fs.readFileSync(ledgerPath, 'utf-8');
    expect(newContent).toBe(originalContent);

    // Cleanup
    warnSpy.mockRestore();
  });

  it('handles missing state directory', () => {
    // Setup: Don't create .nextai/state directory
    // testContext.projectRoot is clean

    // Act: Should not throw
    const ledger = initLedger(testContext.projectRoot);

    // Assert: Empty ledger created
    expect(ledger.features).toEqual([]);

    // Assert: State directory created
    const stateDir = path.join(testContext.projectRoot, '.nextai', 'state');
    expect(fs.existsSync(stateDir)).toBe(true);

    // Assert: Ledger file created
    const ledgerPath = getLedgerPath(testContext.projectRoot);
    expect(fs.existsSync(ledgerPath)).toBe(true);
  });

  it('replaces ledger with wrong feature structure', () => {
    // Setup: Create ledger with features that don't match schema
    initNextAIStructure(testContext.projectRoot);
    const ledgerPath = getLedgerPath(testContext.projectRoot);

    const invalidLedger = {
      features: [
        {
          id: 'test',
          // Missing required fields like title, type, phase, etc.
        },
      ],
    };

    fs.writeFileSync(ledgerPath, JSON.stringify(invalidLedger), 'utf-8');

    // Spy on console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Act
    const ledger = initLedger(testContext.projectRoot);

    // Assert: Warning logged
    expect(warnSpy).toHaveBeenCalledWith('Existing ledger corrupted, creating new one');

    // Assert: New empty ledger created
    expect(ledger.features).toEqual([]);

    // Cleanup
    warnSpy.mockRestore();
  });

  it('preserves complex ledger with multiple phases', () => {
    // Setup: Create ledger with features in different phases
    initNextAIStructure(testContext.projectRoot);

    const feature1 = createFeature('feature-1', 'Complete Feature', 'feature');
    feature1.phase = 'complete';

    const feature2 = createFeature('feature-2', 'In Progress', 'feature');
    feature2.phase = 'implementation';

    const feature3 = createFeature('bug-1', 'Blocked Bug', 'bug');
    feature3.blocked_reason = 'Waiting for external fix';

    const complexLedger: Ledger = {
      features: [feature1, feature2, feature3],
    };

    saveLedger(testContext.projectRoot, complexLedger);

    // Act
    const ledger = initLedger(testContext.projectRoot);

    // Assert: All features preserved
    expect(ledger.features.length).toBe(3);

    // Assert: Phases preserved
    expect(ledger.features[0].phase).toBe('complete');
    expect(ledger.features[1].phase).toBe('implementation');
    expect(ledger.features[2].phase).toBe('created');
    expect(ledger.features[2].blocked_reason).toBe('Waiting for external fix');
  });
});
