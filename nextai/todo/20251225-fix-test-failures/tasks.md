# Implementation Tasks: Fix Test Failures

## Phase 1: Remove Obsolete `transformSkillToAgent` Tests

- [x] Open `tests/unit/core/sync/opencode.test.ts`
- [x] Delete the entire `transformSkillToAgent` describe block (lines 126-178)
  - This includes 6 test cases that reference the non-existent method
- [x] Save the file
- [x] Run tests: `npm test -- opencode.test.ts` to verify deletion doesn't break other tests
- [x] Confirm: 8 test failures should now be 2 (only syncSkills tests remain failing)

## Phase 2: Update `syncSkills` Tests

### Test 1: "transforms skills when syncing to OpenCode"

- [x] Locate test at line ~181
- [x] Replace the current test implementation with:
  ```typescript
  it('does not sync skills to OpenCode agents directory', async () => {
    // Setup: create a skill
    const skillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'test-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      '# Test Skill\n\nTest description.\n\n## Purpose\n...'
    );

    // Run sync
    const result = await configurator.sync(testContext.projectRoot, {});

    // Verify: skills are not synced to OpenCode
    expect(result.skillsSynced).toEqual([]);

    // Verify: no skill files in agent directory
    const agentDir = path.join(testContext.projectRoot, '.opencode', 'agent');
    if (fs.existsSync(agentDir)) {
      const files = fs.readdirSync(agentDir);
      expect(files.some(f => f.includes('test-skill'))).toBe(false);
    }
  });
  ```

### Test 2: "preserves existing frontmatter in custom skills"

- [x] Locate test at line ~204
- [x] Replace the current test implementation with:
  ```typescript
  it('skills are kept in .nextai/skills directory', async () => {
    // Setup: create custom skill with frontmatter
    const customSkillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'codex');
    fs.mkdirSync(customSkillDir, { recursive: true });
    const skillContent = `---
description: Use Codex CLI for code analysis
mode: subagent
---

# Codex Skill Guide
...`;
    fs.writeFileSync(
      path.join(customSkillDir, 'SKILL.md'),
      skillContent
    );

    // Run sync
    const result = await configurator.sync(testContext.projectRoot, {});

    // Verify: skill file remains in .nextai/skills directory
    const sourceSkill = fs.readFileSync(
      path.join(customSkillDir, 'SKILL.md'),
      'utf-8'
    );
    expect(sourceSkill).toContain('description: Use Codex CLI for code analysis');

    // Verify: skill NOT copied to OpenCode agents
    expect(result.skillsSynced).toEqual([]);
    const agentDir = path.join(testContext.projectRoot, '.opencode', 'agent');
    if (fs.existsSync(agentDir)) {
      const files = fs.readdirSync(agentDir);
      expect(files.some(f => f.includes('codex'))).toBe(false);
    }
  });
  ```

- [x] Save the file
- [x] Run tests: `npm test -- opencode.test.ts`
- [x] Confirm: All 23 tests in opencode.test.ts should now pass

## Phase 3: Fix Integration Test

- [x] Open `tests/integration/cli/sync.test.ts`
- [x] Locate test "OpenCode adds mode: subagent" at line ~136
- [x] Replace lines 139-145 with:
  ```typescript
  const agentDir = path.join(testContext.projectRoot, '.opencode', 'agent');

  // Check a specific subagent file (developer.md)
  const developerPath = path.join(agentDir, 'developer.md');
  expect(fs.existsSync(developerPath)).toBe(true);

  const content = fs.readFileSync(developerPath, 'utf-8');
  expect(content).toContain('mode: subagent');
  ```

- [x] Save the file
- [x] Run tests: `npm test -- sync.test.ts`
- [x] Confirm: All tests in sync.test.ts should now pass

## Phase 4: Final Validation

- [x] Run full test suite: `npm test`
- [x] Verify all tests pass (including the 10 previously failing tests)
- [x] Check test output for any new warnings or issues
- [x] Review changes to ensure no unintended modifications

## Completion Checklist

- [x] All 10 previously failing tests now pass
- [x] No new test failures introduced
- [x] Test code accurately reflects current implementation behavior
- [x] Test descriptions are clear and accurate
