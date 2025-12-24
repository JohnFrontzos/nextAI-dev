import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { embedSkillPlaceholders } from '../../../../../src/core/sync/transformers/skill-embedder';
import { createTestProject, type TestContext } from '../../../../helpers/test-utils';
import { scaffoldProject } from '../../../../../src/core/scaffolding/project';

describe('Skill Embedder Transformer', () => {
  let testContext: TestContext;

  beforeEach(() => {
    testContext = createTestProject();
    scaffoldProject(testContext.projectRoot, 'Test Project');
  });

  afterEach(() => {
    testContext.cleanup();
  });

  describe('embedSkillPlaceholders()', () => {
    it('replaces single placeholder with skill content', () => {
      // Setup: create a skill
      const skillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'test-skill');
      fs.mkdirSync(skillDir, { recursive: true });
      const skillContent = '# Test Skill\n\nThis is test skill content.';
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

      // Template with placeholder
      const template = `# My Command

## Workflow

[Insert full content of .claude/skills/test-skill/SKILL.md here]

Now proceed.`;

      // Transform
      const result = embedSkillPlaceholders(template, testContext.projectRoot);

      // Verify
      expect(result).toContain('# Test Skill');
      expect(result).toContain('This is test skill content.');
      expect(result).not.toContain('[Insert full content of');
    });

    it('replaces multiple placeholders in one template', () => {
      // Setup: create two skills
      const skill1Dir = path.join(testContext.projectRoot, '.nextai', 'skills', 'skill-one');
      const skill2Dir = path.join(testContext.projectRoot, '.nextai', 'skills', 'skill-two');
      fs.mkdirSync(skill1Dir, { recursive: true });
      fs.mkdirSync(skill2Dir, { recursive: true });
      fs.writeFileSync(path.join(skill1Dir, 'SKILL.md'), '# Skill One\nFirst skill.');
      fs.writeFileSync(path.join(skill2Dir, 'SKILL.md'), '# Skill Two\nSecond skill.');

      // Template with multiple placeholders
      const template = `# Command

[Insert full content of .claude/skills/skill-one/SKILL.md here]

Some text in between.

[Insert full content of .claude/skills/skill-two/SKILL.md here]

End.`;

      // Transform
      const result = embedSkillPlaceholders(template, testContext.projectRoot);

      // Verify both skills embedded
      expect(result).toContain('# Skill One');
      expect(result).toContain('First skill.');
      expect(result).toContain('# Skill Two');
      expect(result).toContain('Second skill.');
      expect(result).toContain('Some text in between.');
      expect(result).not.toContain('[Insert full content of');
    });

    it('keeps placeholder when skill is missing', () => {
      // Template referencing non-existent skill
      const template = `# Command

[Insert full content of .claude/skills/nonexistent-skill/SKILL.md here]

Continue.`;

      // Transform
      const result = embedSkillPlaceholders(template, testContext.projectRoot);

      // Verify placeholder kept
      expect(result).toContain('[Insert full content of .claude/skills/nonexistent-skill/SKILL.md here]');
      expect(result).toContain('Continue.');
    });

    it('returns template unchanged when no placeholders present', () => {
      const template = `# Command

This is a regular template with no placeholders.

## Instructions
1. Do something
2. Do something else`;

      // Transform
      const result = embedSkillPlaceholders(template, testContext.projectRoot);

      // Verify unchanged
      expect(result).toBe(template);
    });

    it('handles mixed scenario - some skills exist, some missing', () => {
      // Setup: create one skill, leave another missing
      const existingSkillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'existing');
      fs.mkdirSync(existingSkillDir, { recursive: true });
      fs.writeFileSync(path.join(existingSkillDir, 'SKILL.md'), '# Existing Skill');

      // Template with both
      const template = `# Command

[Insert full content of .claude/skills/existing/SKILL.md here]

Between text.

[Insert full content of .claude/skills/missing/SKILL.md here]

End.`;

      // Transform
      const result = embedSkillPlaceholders(template, testContext.projectRoot);

      // Verify: existing embedded, missing kept as placeholder
      expect(result).toContain('# Existing Skill');
      expect(result).not.toContain('[Insert full content of .claude/skills/existing/SKILL.md here]');
      expect(result).toContain('[Insert full content of .claude/skills/missing/SKILL.md here]');
    });

    it('ignores malformed placeholders', () => {
      const template = `# Command

[Insert full content of wrong-format here]
[Insert full content of .claude/skills/no-closing-bracket/SKILL.md

Normal placeholder:
[Insert full content of .claude/skills/valid/SKILL.md here]

End.`;

      // Create valid skill
      const validSkillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'valid');
      fs.mkdirSync(validSkillDir, { recursive: true });
      fs.writeFileSync(path.join(validSkillDir, 'SKILL.md'), '# Valid Skill');

      // Transform
      const result = embedSkillPlaceholders(template, testContext.projectRoot);

      // Verify: malformed kept, valid replaced
      expect(result).toContain('[Insert full content of wrong-format here]');
      expect(result).toContain('[Insert full content of .claude/skills/no-closing-bracket/SKILL.md');
      expect(result).toContain('# Valid Skill');
      expect(result).not.toContain('[Insert full content of .claude/skills/valid/SKILL.md here]');
    });

    it('handles file read errors gracefully', () => {
      // Setup: create a directory where file should be, causing read error
      const badSkillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'bad-skill');
      fs.mkdirSync(badSkillDir, { recursive: true });
      // Create SKILL.md as a directory instead of a file (will cause read error)
      const badSkillFile = path.join(badSkillDir, 'SKILL.md');
      fs.mkdirSync(badSkillFile, { recursive: true });

      const template = `[Insert full content of .claude/skills/bad-skill/SKILL.md here]`;

      // Transform
      const result = embedSkillPlaceholders(template, testContext.projectRoot);

      // Verify: placeholder kept on error
      expect(result).toContain('[Insert full content of .claude/skills/bad-skill/SKILL.md here]');
    });

    it('preserves exact skill content without modification', () => {
      // Setup: create skill with specific formatting
      const skillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'formatted');
      fs.mkdirSync(skillDir, { recursive: true });
      const skillContent = `---
name: formatted
description: Test
---

# Formatted Skill

Some **bold** and *italic* text.

\`\`\`javascript
const x = 1;
\`\`\`

- List item 1
- List item 2`;
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent);

      const template = `[Insert full content of .claude/skills/formatted/SKILL.md here]`;

      // Transform
      const result = embedSkillPlaceholders(template, testContext.projectRoot);

      // Verify: exact content preserved
      expect(result).toBe(skillContent);
    });
  });
});
