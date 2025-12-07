import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTestProject,
  initNextAIStructure,
  type TestContext,
} from '../../../helpers/test-utils';
import { scaffoldFeature } from '../../../../src/core/scaffolding/feature';
import { archiveFeature, countFilesRecursive } from '../../../../src/cli/utils/archive';
import { logger } from '../../../../src/cli/utils/logger';

// Mock logger to capture warnings
vi.mock('../../../../src/cli/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    dim: vi.fn(),
  },
}));

describe('archiveFeature', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    initNextAIStructure(testContext.projectRoot);
    vi.clearAllMocks();
  });

  afterEach(() => {
    testContext.cleanup();
  });

  it('deletes attachments folder during archive', () => {
    // Setup: Create feature with attachments
    scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test', 'feature');
    const attachmentsDir = path.join(testContext.projectRoot, 'todo', 'test-feature', 'attachments');
    fs.mkdirSync(path.join(attachmentsDir, 'evidence'), { recursive: true });
    fs.writeFileSync(path.join(attachmentsDir, 'evidence', 'test.log'), 'test content');

    // Act
    archiveFeature(testContext.projectRoot, 'test-feature');

    // Assert: Attachments not in done/
    const doneAttachments = path.join(testContext.projectRoot, 'done', 'test-feature', 'attachments');
    expect(fs.existsSync(doneAttachments)).toBe(false);

    // Assert: Other artifacts preserved
    const doneSummary = path.join(testContext.projectRoot, 'done', 'test-feature', 'summary.md');
    expect(fs.existsSync(doneSummary)).toBe(true);
  });

  it('preserves spec.md and tasks.md in archive', () => {
    // Setup
    scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test', 'feature');
    fs.writeFileSync(path.join(testContext.projectRoot, 'todo', 'test-feature', 'spec.md'), '# Spec');
    fs.writeFileSync(path.join(testContext.projectRoot, 'todo', 'test-feature', 'tasks.md'), '# Tasks');

    // Act
    archiveFeature(testContext.projectRoot, 'test-feature');

    // Assert
    expect(fs.existsSync(path.join(testContext.projectRoot, 'done', 'test-feature', 'spec.md'))).toBe(true);
    expect(fs.existsSync(path.join(testContext.projectRoot, 'done', 'test-feature', 'tasks.md'))).toBe(true);
  });

  it('warns when attachments folder has files', () => {
    // Setup: Create feature with attachments
    scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test', 'feature');
    const attachmentsDir = path.join(testContext.projectRoot, 'todo', 'test-feature', 'attachments');
    fs.mkdirSync(path.join(attachmentsDir, 'evidence'), { recursive: true });
    fs.writeFileSync(path.join(attachmentsDir, 'evidence', 'test.log'), 'test content');

    // Act
    archiveFeature(testContext.projectRoot, 'test-feature');

    // Assert: Warning was logged with file count
    expect(logger.warn).toHaveBeenCalledWith('Deleting attachments folder (1 files)');
  });

  it('does not warn when attachments folder is empty', () => {
    // Setup: Create feature with empty attachments
    scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test', 'feature');
    // scaffoldFeature creates empty attachments subfolders

    // Act
    archiveFeature(testContext.projectRoot, 'test-feature');

    // Assert: No warning (0 files)
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('handles missing attachments folder gracefully', () => {
    // Setup: Create feature, then delete attachments folder
    scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test', 'feature');
    const attachmentsDir = path.join(testContext.projectRoot, 'todo', 'test-feature', 'attachments');
    fs.rmSync(attachmentsDir, { recursive: true, force: true });

    // Act: Should not throw
    expect(() => archiveFeature(testContext.projectRoot, 'test-feature')).not.toThrow();

    // Assert: Feature still archived
    expect(fs.existsSync(path.join(testContext.projectRoot, 'done', 'test-feature'))).toBe(true);
  });

  it('preserves planning directory in archive', () => {
    // Setup
    scaffoldFeature(testContext.projectRoot, 'test-feature', 'Test', 'feature');

    // Act
    archiveFeature(testContext.projectRoot, 'test-feature');

    // Assert: Planning directory with initialization.md is preserved
    expect(fs.existsSync(path.join(testContext.projectRoot, 'done', 'test-feature', 'planning', 'initialization.md'))).toBe(true);
  });
});

describe('countFilesRecursive', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
  });

  afterEach(() => {
    testContext.cleanup();
  });

  it('counts files in nested directories', () => {
    const dir = path.join(testContext.projectRoot, 'test-dir');
    fs.mkdirSync(path.join(dir, 'sub1', 'sub2'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'file1.txt'), '');
    fs.writeFileSync(path.join(dir, 'sub1', 'file2.txt'), '');
    fs.writeFileSync(path.join(dir, 'sub1', 'sub2', 'file3.txt'), '');

    expect(countFilesRecursive(dir)).toBe(3);
  });

  it('returns 0 for empty directory', () => {
    const dir = path.join(testContext.projectRoot, 'empty-dir');
    fs.mkdirSync(dir, { recursive: true });

    expect(countFilesRecursive(dir)).toBe(0);
  });

  it('returns 0 for directory with only subdirectories', () => {
    const dir = path.join(testContext.projectRoot, 'dirs-only');
    fs.mkdirSync(path.join(dir, 'sub1', 'sub2'), { recursive: true });

    expect(countFilesRecursive(dir)).toBe(0);
  });
});
