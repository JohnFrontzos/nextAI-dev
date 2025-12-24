# Technical Specification: Missing Investigator Skills

## Overview

This bug fix addresses a two-part issue preventing debugging skills from being embedded in the investigator agent:

1. The `C:\Dev\Git\nextai-dev\resources\agents\investigator.md` template has an empty `skillDependencies` array and lacks skill placeholder comments
2. The `syncAgents()` function in both Claude Code and OpenCode sync modules does not call `embedSkillPlaceholders()` on agent content

According to `C:\Dev\Git\nextai-dev\nextai\docs\conventions.md:311`, the investigator agent should have three skills:
- `root-cause-tracing` - Backward tracing methodology
- `systematic-debugging` - Structured debugging process
- `testing-investigator` - Test failure analysis

All three skills exist in `C:\Dev\Git\nextai-dev\resources\skills\` but are not being injected.

## Root Cause Analysis

### Issue 1: Missing Skill Dependencies in Agent Template

**File:** `C:\Dev\Git\nextai-dev\resources\agents\investigator.md`

**Current state (line 12):**
```yaml
skillDependencies: []
```

**Current body (lines 17-19):**
```markdown
## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
```

**Problem:** No skill names in `skillDependencies` array and no placeholder comments to trigger embedding.

### Issue 2: Agent Sync Doesn't Embed Skills

**Files:**
- `C:\Dev\Git\nextai-dev\src\core\sync\claude-code.ts` (lines 78-117)
- `C:\Dev\Git\nextai-dev\src\core\sync\opencode.ts` (lines 78-118)

**Current behavior:** The `syncAgents()` function:
1. Reads agent file from `resources/agents/`
2. Parses frontmatter using `parseBaseAgent()`
3. Transforms to target format using `toClaudeAgent()` or `toOpenCodeAgent()`
4. Writes content directly without calling `embedSkillPlaceholders()`

**Contrast with commands:** The `transformCommandTemplate()` function (claude-code.ts:182-196, opencode.ts:146-157) DOES call `embedSkillPlaceholders()` on line 186 and 151 respectively.

## Technical Approach

This fix follows **Option A** from the requirements document - adding explicit placeholders to agent templates and updating the sync functions to embed them. This approach:

- Follows existing patterns used in command templates
- Makes skill injection explicit and visible
- Requires minimal code changes
- Is consistent with how the system already works

## Implementation Details

### Change 1: Update Investigator Agent Template

**File:** `C:\Dev\Git\nextai-dev\resources\agents\investigator.md`

**Modification 1 - Line 12 (frontmatter):**

Replace:
```yaml
skillDependencies: []
```

With:
```yaml
skillDependencies: ["root-cause-tracing", "systematic-debugging", "testing-investigator"]
```

**Modification 2 - Lines 17-19 (body content):**

Replace:
```markdown
## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
```

With:
```markdown
## First Action
Before proceeding, load your skill:
[Insert full content of .claude/skills/root-cause-tracing/SKILL.md here]

[Insert full content of .claude/skills/systematic-debugging/SKILL.md here]

[Insert full content of .claude/skills/testing-investigator/SKILL.md here]

<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
```

**Why this works:**
- The `skillDependencies` array is used by `toClaudeAgent()` and `toOpenCodeAgent()` transformers to populate the frontmatter `skills:` field (see `C:\Dev\Git\nextai-dev\src\core\sync\transformers\agent.ts:61-63`)
- The placeholder comments match the regex pattern in `C:\Dev\Git\nextai-dev\src\core\sync\transformers\skill-embedder.ts:16`
- When `embedSkillPlaceholders()` is called, it will replace these with actual skill content from `.nextai/skills/`

### Change 2: Update Claude Code Sync

**File:** `C:\Dev\Git\nextai-dev\src\core\sync\claude-code.ts`

**Context:** The `embedSkillPlaceholders` function is already imported on line 6.

**Modification - Lines 101-106:**

Replace:
```typescript
const content = readFileSync(sourcePath, 'utf-8');
try {
  const parsed = parseBaseAgent(content);
  const transformed = toClaudeAgent(parsed);
  writeFileSync(targetPath, transformed);
```

With:
```typescript
const content = readFileSync(sourcePath, 'utf-8');
try {
  const parsed = parseBaseAgent(content);
  const transformed = toClaudeAgent(parsed);
  // Embed skill placeholders before writing
  const withSkills = embedSkillPlaceholders(transformed, projectRoot);
  writeFileSync(targetPath, withSkills);
```

**Modification - Lines 109-111 (legacy fallback):**

Replace:
```typescript
console.warn(`Failed to parse ${agent} as base format, using legacy fallback`);
const transformed = this.transformAgentManifest(content);
writeFileSync(targetPath, transformed);
```

With:
```typescript
console.warn(`Failed to parse ${agent} as base format, using legacy fallback`);
const transformed = this.transformAgentManifest(content);
// Embed skill placeholders in legacy path too
const withSkills = embedSkillPlaceholders(transformed, projectRoot);
writeFileSync(targetPath, withSkills);
```

### Change 3: Update OpenCode Sync

**File:** `C:\Dev\Git\nextai-dev\src\core\sync\opencode.ts`

**Context:** The `embedSkillPlaceholders` function is already imported on line 6.

**Modification - Lines 102-107:**

Replace:
```typescript
const content = readFileSync(sourcePath, 'utf-8');
// Transform from base format to OpenCode format
try {
  const parsed = parseBaseAgent(content);
  const transformed = toOpenCodeAgent(parsed);
  writeFileSync(targetPath, transformed);
```

With:
```typescript
const content = readFileSync(sourcePath, 'utf-8');
// Transform from base format to OpenCode format
try {
  const parsed = parseBaseAgent(content);
  const transformed = toOpenCodeAgent(parsed);
  // Embed skill placeholders before writing
  const withSkills = embedSkillPlaceholders(transformed, projectRoot);
  writeFileSync(targetPath, withSkills);
```

**Modification - Lines 109-112 (legacy fallback):**

Replace:
```typescript
console.warn(`Failed to parse ${agent} as base format, using legacy fallback`);
const transformed = this.transformAgentManifest(content);
writeFileSync(targetPath, transformed);
```

With:
```typescript
console.warn(`Failed to parse ${agent} as base format, using legacy fallback`);
const transformed = this.transformAgentManifest(content);
// Embed skill placeholders in legacy path too
const withSkills = embedSkillPlaceholders(transformed, projectRoot);
writeFileSync(targetPath, withSkills);
```

## Error Handling

The `embedSkillPlaceholders()` function already has robust error handling:

1. **Missing skill files:** If a skill doesn't exist, the placeholder is kept unchanged and a warning is logged (skill-embedder.ts:36-39)
2. **File read errors:** Errors are caught, logged, and the placeholder is preserved (skill-embedder.ts:44-48)

This means if skills are missing or inaccessible:
- The agent will still be created
- Placeholders will remain in the output
- Warnings will inform developers of the issue

No additional error handling is needed in the sync functions.

## Testing Strategy

### Unit Tests

The project uses Vitest for testing (see `C:\Dev\Git\nextai-dev\nextai\docs\technical-guide.md:74-108`).

**Test file:** `C:\Dev\Git\nextai-dev\tests\unit\core\sync\claude-code.test.ts`

**New test to add:**
```typescript
it('embeds skill placeholders in agent content', async () => {
  // Setup: Create a skill
  const skillDir = path.join(testContext.projectRoot, '.nextai', 'skills', 'test-skill');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Test Skill Content');

  // Create agent with placeholder
  const agentsDir = path.join(testContext.projectRoot, '.nextai', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });
  const agentContent = `---
id: test-agent
description: Test agent
role: subagent
tools:
  read: true
skillDependencies: ["test-skill"]
---

## First Action
[Insert full content of .claude/skills/test-skill/SKILL.md here]
`;
  fs.writeFileSync(path.join(agentsDir, 'test-agent.md'), agentContent);

  // Sync
  await configurator.sync(testContext.projectRoot, {});

  // Verify skill content embedded
  const syncedPath = path.join(testContext.projectRoot, '.claude', 'agents', 'test-agent.md');
  const syncedContent = fs.readFileSync(syncedPath, 'utf-8');

  expect(syncedContent).toContain('# Test Skill Content');
  expect(syncedContent).not.toContain('[Insert full content of');
});
```

**Similar test needed for:** `C:\Dev\Git\nextai-dev\tests\unit\core\sync\opencode.test.ts`

### Integration Tests

No new integration tests needed - existing sync tests will validate the full workflow.

### Regression Prevention

The existing test suite in `C:\Dev\Git\nextai-dev\tests\unit\core\sync\transformers\skill-embedder.test.ts` already validates:
- Single placeholder replacement
- Multiple placeholder replacement
- Missing skill handling
- Mixed scenarios
- Error handling

These tests ensure the embedding mechanism remains robust.

## Impact Analysis

### Files Modified
1. `C:\Dev\Git\nextai-dev\resources\agents\investigator.md` - Template update
2. `C:\Dev\Git\nextai-dev\src\core\sync\claude-code.ts` - Add skill embedding call
3. `C:\Dev\Git\nextai-dev\src\core\sync\opencode.ts` - Add skill embedding call
4. `C:\Dev\Git\nextai-dev\tests\unit\core\sync\claude-code.test.ts` - Add test
5. `C:\Dev\Git\nextai-dev\tests\unit\core\sync\opencode.test.ts` - Add test

### Backward Compatibility

**Breaking changes:** None

**Behavior changes:**
- After fix: Investigator agent will include full skill content when synced
- Before fix: Investigator agent had placeholder comments but no skill content

**Migration:** Users just need to run `nextai sync --force` to regenerate agent files with embedded skills.

### Performance Considerations

**Minimal impact:**
- `embedSkillPlaceholders()` uses regex replacement - O(n) where n = template length
- Skills are read once during sync, not at runtime
- Total of 3 additional file reads per investigator agent sync
- Negligible for typical sync operations

## Verification Checklist

After implementation, verify:

1. **Investigator template updated:**
   - `skillDependencies` array contains 3 skill names
   - Body has 3 skill placeholders before operator comment

2. **Sync produces correct output:**
   - Run `nextai sync --force`
   - Check `.claude/agents/investigator.md` contains skill content
   - Check `.opencode/agent/investigator.md` contains skill content

3. **Tests pass:**
   - Run `npm test`
   - All existing tests still pass
   - New tests for agent skill embedding pass

4. **No console warnings:**
   - Sync should not warn about missing skills
   - Skills should be found and embedded successfully

## Success Criteria

1. Investigator agent template includes all three required skills
2. Both Claude Code and OpenCode sync embed skill content
3. Unit tests validate skill embedding in agents
4. Manual verification confirms skills appear in synced files
5. No regressions in existing functionality
