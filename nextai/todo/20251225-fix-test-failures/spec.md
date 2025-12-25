# Technical Specification: Fix Test Failures

## Overview
Fix 10 failing tests in the OpenCode sync module that broke after the agent templates refactoring (commit 0ecc709). The tests are failing because they reference an old private method `transformSkillToAgent` that no longer exists, and because the OpenCode sync logic needs to be updated to properly handle the new base agent format.

## Root Cause Analysis

### Agent Template Format Change
In commit 0ecc709, the agent template format was changed from a simple format to a new base format with structured frontmatter:

**Old Format (expected by tests):**
```markdown
# My Skill

Description here.
```

**New Base Format:**
```markdown
---
id: agent-id
description: Agent description
role: subagent | primary
tools:
  read: true
  write: true
  # ... other tools
skillDependencies: []
---

Agent content here.
```

### What Changed

1. **Agent files moved to new format**: All agents in `resources/agents/*.md` now use the new base format with `role` field (either `primary` or `subagent`)

2. **New transformer functions**: The code now uses `parseBaseAgent()` and `toOpenCodeAgent()` from `src/core/sync/transformers/agent.ts` to convert base format to OpenCode format

3. **Private method removed**: The `transformSkillToAgent()` private method that tests were accessing no longer exists in `OpenCodeConfigurator`

4. **Skills vs Agents**: The new architecture properly distinguishes between:
   - **Skills**: Located in `.nextai/skills/*/SKILL.md` (not synced to OpenCode)
   - **Agents**: Located in `resources/agents/*.md` → synced to `.opencode/agent/`

### Current Behavior vs Expected

**Issue 1: `transformSkillToAgent` tests (8 failures)**
- Tests try to access `configurator.transformSkillToAgent()` as a private method
- This method no longer exists in the class
- The logic is now in the agent transformer modules

**Issue 2: `syncSkills` tests (2 failures)**
- Tests expect skills from `.nextai/skills/*/SKILL.md` to be synced to `.opencode/agent/nextai-*.md`
- Current implementation: `syncSkills()` returns empty array (per spec comment: "OpenCode reads skills from `.claude/skills/` path")
- Skills are NOT being synced to OpenCode agents directory

**Issue 3: Mode field mismatch (1 failure)**
- Test expects `mode: subagent` in synced agent files
- Actual output shows `mode: primary` for ai-team-lead agent
- This is because `toOpenCodeAgent()` correctly maps `role` field to `mode` field
- The test is checking the wrong agent file (ai-team-lead is primary, not subagent)

## Technical Decisions

### 1. Remove Obsolete `transformSkillToAgent` Tests
The 8 tests in the `transformSkillToAgent` describe block are testing functionality that no longer exists and is not needed:
- The old method manually added frontmatter to skills
- The new architecture uses `parseBaseAgent()` and `toOpenCodeAgent()` for agents
- Skills are handled differently (not synced to OpenCode agent directory)

**Decision**: Delete these tests as they test obsolete functionality.

### 2. Update `syncSkills` Tests
The 2 tests in the `syncSkills` describe block have incorrect expectations:
- They expect skills to be synced to `.opencode/agent/nextai-*.md`
- The current implementation correctly returns empty array
- Skills are NOT agents and should not be synced to the agent directory

**Options:**
- A) Delete these tests (skills sync is intentionally disabled for OpenCode)
- B) Update tests to verify that skills are NOT synced

**Decision**: Option B - Update tests to verify correct behavior (empty return, no files created).

### 3. Fix `mode: subagent` Test
The integration test `OpenCode adds mode: subagent` is checking the wrong file:
- It reads the first `.md` file in `.opencode/agent/` directory
- The first file alphabetically is `ai-team-lead.md` which has `role: primary`
- Should check a file that has `role: subagent` like `developer.md`

**Decision**: Update test to check a specific subagent file instead of the first alphabetically.

## Implementation Approach

### Phase 1: Remove Obsolete Tests
1. Delete the entire `transformSkillToAgent` describe block (lines 126-178)
2. Verify remaining tests still pass

### Phase 2: Update Skills Sync Tests
1. Update test "transforms skills when syncing to OpenCode":
   - Remove expectation that skill file exists in `.opencode/agent/`
   - Verify that `syncSkills()` returns empty array
   - Verify no skill files are created in agent directory

2. Update test "preserves existing frontmatter in custom skills":
   - Same changes as above

### Phase 3: Fix Integration Test
1. Update test "OpenCode adds mode: subagent":
   - Change from reading first file to reading specific file: `developer.md`
   - Verify `mode: subagent` exists in that file

## Files to Modify

1. `tests/unit/core/sync/opencode.test.ts` - Remove and update tests
2. `tests/integration/cli/sync.test.ts` - Fix mode test

## Validation

After fixes:
- All 23 tests in `opencode.test.ts` should pass
- All tests in `sync.test.ts` should pass
- No functionality changes to source code (only test updates)

## Testing Strategy

Run tests incrementally:
1. After Phase 1: `npm test -- opencode.test.ts`
2. After Phase 2: `npm test -- opencode.test.ts`
3. After Phase 3: `npm test -- sync.test.ts`
4. Final: `npm test` (all tests)

## Notes

- This is purely a test fix - no source code changes needed
- The existing implementation is correct; tests are outdated
- Agent template architecture is working as designed
