import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  checkAttachmentsFolder,
  getNextSessionNumber,
  generateTestSessionEntry,
} from '../../../../src/cli/commands/testing';
import {
  createTestProject,
  writeTestFile,
  type TestContext,
} from '../../../helpers/test-utils';

describe('Testing Command Unit Tests', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('getNextSessionNumber', () => {
    it('should return 1 for non-existent testing.md', () => {
      const testingPath = path.join(testContext.projectRoot, 'testing.md');
      const sessionNumber = getNextSessionNumber(testingPath);

      expect(sessionNumber).toBe(1);
    });

    it('should return 1 for empty testing.md', () => {
      const testingPath = path.join(testContext.projectRoot, 'testing.md');
      writeTestFile(testContext.projectRoot, 'testing.md', '# Testing\n\n');

      const sessionNumber = getNextSessionNumber(testingPath);

      expect(sessionNumber).toBe(1);
    });

    it('should return 2 when Session 1 exists', () => {
      const testingPath = path.join(testContext.projectRoot, 'testing.md');
      const content = `# Testing

## Test Sessions

### Session 1 - 12/15/2024, 10:30
**Status:** FAIL
**Notes:** Test failed
`;
      writeTestFile(testContext.projectRoot, 'testing.md', content);

      const sessionNumber = getNextSessionNumber(testingPath);

      expect(sessionNumber).toBe(2);
    });

    it('should return 3 when Sessions 1 and 2 exist', () => {
      const testingPath = path.join(testContext.projectRoot, 'testing.md');
      const content = `# Testing

## Test Sessions

### Session 1 - 12/15/2024, 10:30
**Status:** FAIL

### Session 2 - 12/15/2024, 14:00
**Status:** PASS
`;
      writeTestFile(testContext.projectRoot, 'testing.md', content);

      const sessionNumber = getNextSessionNumber(testingPath);

      expect(sessionNumber).toBe(3);
    });

    it('should handle non-sequential session numbers', () => {
      const testingPath = path.join(testContext.projectRoot, 'testing.md');
      const content = `# Testing

## Test Sessions

### Session 1 - 12/15/2024, 10:30
**Status:** FAIL

### Session 5 - 12/15/2024, 14:00
**Status:** PASS
`;
      writeTestFile(testContext.projectRoot, 'testing.md', content);

      const sessionNumber = getNextSessionNumber(testingPath);

      // Should return max + 1 = 6
      expect(sessionNumber).toBe(6);
    });
  });

  describe('checkAttachmentsFolder', () => {
    it('should return empty array when folder does not exist', () => {
      const attachments = checkAttachmentsFolder(testContext.projectRoot, 'test-feature');

      expect(attachments).toEqual([]);
    });

    it('should return empty array when folder exists but is empty', () => {
      const evidencePath = path.join(
        testContext.projectRoot,
        'nextai/todo/test-feature/attachments/evidence'
      );
      fs.mkdirSync(evidencePath, { recursive: true });

      const attachments = checkAttachmentsFolder(testContext.projectRoot, 'test-feature');

      expect(attachments).toEqual([]);
    });

    it('should return file paths when files exist in evidence folder', () => {
      const evidencePath = path.join(
        testContext.projectRoot,
        'nextai/todo/test-feature/attachments/evidence'
      );
      fs.mkdirSync(evidencePath, { recursive: true });

      // Create test files
      fs.writeFileSync(path.join(evidencePath, 'error.log'), 'Error log content');
      fs.writeFileSync(path.join(evidencePath, 'screenshot.png'), 'Screenshot content');

      const attachments = checkAttachmentsFolder(testContext.projectRoot, 'test-feature');

      expect(attachments).toHaveLength(2);
      expect(attachments).toContain('attachments/evidence/error.log');
      expect(attachments).toContain('attachments/evidence/screenshot.png');
    });

    it('should only return files, not directories', () => {
      const evidencePath = path.join(
        testContext.projectRoot,
        'nextai/todo/test-feature/attachments/evidence'
      );
      fs.mkdirSync(evidencePath, { recursive: true });

      // Create test file and subdirectory
      fs.writeFileSync(path.join(evidencePath, 'error.log'), 'Error log content');
      fs.mkdirSync(path.join(evidencePath, 'subfolder'));

      const attachments = checkAttachmentsFolder(testContext.projectRoot, 'test-feature');

      expect(attachments).toHaveLength(1);
      expect(attachments).toContain('attachments/evidence/error.log');
      expect(attachments).not.toContain('attachments/evidence/subfolder');
    });
  });

  describe('generateTestSessionEntry', () => {
    it('should generate PASS session entry with correct format', () => {
      const entry = generateTestSessionEntry(1, 'pass', 'All tests passed', []);

      expect(entry).toContain('### Session 1');
      expect(entry).toContain('**Status:** PASS');
      expect(entry).toContain('**Notes:** All tests passed');
      expect(entry).not.toContain('Investigation Report');
    });

    it('should generate FAIL session entry with investigation placeholder', () => {
      const entry = generateTestSessionEntry(2, 'fail', 'Button not working', []);

      expect(entry).toContain('### Session 2');
      expect(entry).toContain('**Status:** FAIL');
      expect(entry).toContain('**Notes:** Button not working');
      expect(entry).toContain('#### Investigation Report');
      expect(entry).toContain('<!-- Investigation findings will be added here -->');
    });

    it('should include attachments when provided', () => {
      const attachments = ['attachments/evidence/error.log', 'attachments/evidence/screenshot.png'];
      const entry = generateTestSessionEntry(1, 'fail', 'Test failed', attachments);

      expect(entry).toContain('**Attachments:**');
      expect(entry).toContain('- attachments/evidence/error.log');
      expect(entry).toContain('- attachments/evidence/screenshot.png');
    });

    it('should not include attachments section when empty', () => {
      const entry = generateTestSessionEntry(1, 'pass', 'Test passed', []);

      expect(entry).not.toContain('**Attachments:**');
    });

    it('should use default notes when empty', () => {
      const entry = generateTestSessionEntry(1, 'pass', '', []);

      expect(entry).toContain('**Notes:** No notes provided');
    });

    it('should format session number correctly', () => {
      const entry1 = generateTestSessionEntry(1, 'pass', 'Test', []);
      const entry10 = generateTestSessionEntry(10, 'pass', 'Test', []);
      const entry100 = generateTestSessionEntry(100, 'pass', 'Test', []);

      expect(entry1).toContain('### Session 1');
      expect(entry10).toContain('### Session 10');
      expect(entry100).toContain('### Session 100');
    });
  });
});
