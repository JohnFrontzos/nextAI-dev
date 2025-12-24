# Implementation Tasks: Missing Investigator Skills

## Pre-Implementation Review

- [ ] Read `C:\Dev\Git\nextai-dev\nextai\todo\20251224_missing-investigator-skills\spec.md`
- [ ] Review `C:\Dev\Git\nextai-dev\resources\agents\investigator.md` current state
- [ ] Verify all three skills exist in `C:\Dev\Git\nextai-dev\resources\skills\`:
  - [ ] `root-cause-tracing/SKILL.md`
  - [ ] `systematic-debugging/SKILL.md`
  - [ ] `testing-investigator/SKILL.md`
- [ ] Review `embedSkillPlaceholders()` implementation in `C:\Dev\Git\nextai-dev\src\core\sync\transformers\skill-embedder.ts`

## Core Implementation

### Task 1: Update Investigator Agent Template

File: `C:\Dev\Git\nextai-dev\resources\agents\investigator.md`

- [ ] Update frontmatter `skillDependencies` on line 12:
  - Change from: `skillDependencies: []`
  - Change to: `skillDependencies: ["root-cause-tracing", "systematic-debugging", "testing-investigator"]`

- [ ] Update "First Action" section (lines 17-19):
  - Add placeholder for `root-cause-tracing` skill
  - Add placeholder for `systematic-debugging` skill
  - Add placeholder for `testing-investigator` skill
  - Keep existing operator comment at the end
  - Use exact format: `[Insert full content of .claude/skills/{skill-name}/SKILL.md here]`

### Task 2: Update Claude Code Sync

File: `C:\Dev\Git\nextai-dev\src\core\sync\claude-code.ts`

- [ ] Add skill embedding in main transformation path (lines 101-106):
  - After `const transformed = toClaudeAgent(parsed);`
  - Add: `const withSkills = embedSkillPlaceholders(transformed, projectRoot);`
  - Replace `writeFileSync(targetPath, transformed);` with `writeFileSync(targetPath, withSkills);`

- [ ] Add skill embedding in legacy fallback path (lines 109-111):
  - After `const transformed = this.transformAgentManifest(content);`
  - Add: `const withSkills = embedSkillPlaceholders(transformed, projectRoot);`
  - Replace `writeFileSync(targetPath, transformed);` with `writeFileSync(targetPath, withSkills);`

- [ ] Verify `embedSkillPlaceholders` is already imported (line 6)

### Task 3: Update OpenCode Sync

File: `C:\Dev\Git\nextai-dev\src\core\sync\opencode.ts`

- [ ] Add skill embedding in main transformation path (lines 102-107):
  - After `const transformed = toOpenCodeAgent(parsed);`
  - Add: `const withSkills = embedSkillPlaceholders(transformed, projectRoot);`
  - Replace `writeFileSync(targetPath, transformed);` with `writeFileSync(targetPath, withSkills);`

- [ ] Add skill embedding in legacy fallback path (lines 109-112):
  - After `const transformed = this.transformAgentManifest(content);`
  - Add: `const withSkills = embedSkillPlaceholders(transformed, projectRoot);`
  - Replace `writeFileSync(targetPath, transformed);` with `writeFileSync(targetPath, withSkills);`

- [ ] Verify `embedSkillPlaceholders` is already imported (line 6)

## Unit Tests

### Task 4: Add Claude Code Test

File: `C:\Dev\Git\nextai-dev\tests\unit\core\sync\claude-code.test.ts`

- [ ] Add test case: `it('embeds skill placeholders in agent content', async () => { ... })`
  - [ ] Create test skill in `.nextai/skills/test-skill/SKILL.md`
  - [ ] Create test agent with skill placeholder
  - [ ] Run sync
  - [ ] Verify skill content is embedded in output
  - [ ] Verify placeholder is removed

### Task 5: Add OpenCode Test

File: `C:\Dev\Git\nextai-dev\tests\unit\core\sync\opencode.test.ts`

- [ ] Add test case: `it('embeds skill placeholders in agent content', async () => { ... })`
  - [ ] Create test skill in `.nextai/skills/test-skill/SKILL.md`
  - [ ] Create test agent with skill placeholder
  - [ ] Run sync
  - [ ] Verify skill content is embedded in output
  - [ ] Verify placeholder is removed

## Verification

### Task 6: Run Test Suite

- [ ] Run full test suite: `npm test`
- [ ] Verify all tests pass (no regressions)
- [ ] Check new tests pass
- [ ] Run type check: `npm run typecheck`
- [ ] Run linter: `npm run lint`

### Task 7: Build Verification

- [ ] Run build: `npm run build`
- [ ] Verify no build errors
- [ ] Check `dist/` output is generated

## Pre-Review Checklist

- [ ] All tasks marked complete
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] All tests passing
- [ ] Code follows existing patterns
- [ ] No console.log statements added (only console.warn where appropriate)
- [ ] Changes match spec.md exactly
