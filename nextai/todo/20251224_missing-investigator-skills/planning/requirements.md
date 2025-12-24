# Requirements: Missing Investigator Skills

## Bug Summary
The investigator agent template does not include skill dependencies for `root-cause-tracing` and `systematic-debugging`, preventing these skills from being embedded in generated agent files.

## Investigation Findings

### Root Cause Confirmed
The root cause is **two-fold**:

1. **Missing skill placeholders in agent template**: The `C:\Dev\Git\nextai-dev\resources\agents\investigator.md` file has an empty `skillDependencies: []` array and lacks placeholder comments in the body content that would trigger skill embedding.

2. **Agent sync doesn't embed skills**: The `syncAgents()` function in both `C:\Dev\Git\nextai-dev\src\core\sync\claude-code.ts` (lines 78-117) and `C:\Dev\Git\nextai-dev\src\core\sync\opencode.ts` (lines 78-118) does NOT call `embedSkillPlaceholders()` on agent content. This function only transforms frontmatter and writes content as-is.

### Evidence

#### 1. Skills exist but are unused
- `C:\Dev\Git\nextai-dev\resources\skills\root-cause-tracing\SKILL.md` - EXISTS (96 lines of backward tracing methodology)
- `C:\Dev\Git\nextai-dev\resources\skills\systematic-debugging\SKILL.md` - EXISTS (148 lines of structured debugging process)

#### 2. Investigator template has empty dependencies
- `C:\Dev\Git\nextai-dev\resources\agents\investigator.md:12` - `skillDependencies: []`
- No skill placeholder comments like `[Insert full content of .claude/skills/root-cause-tracing/SKILL.md here]` in body

#### 3. Documentation specifies required skills
- `C:\Dev\Git\nextai-dev\nextai\docs\conventions.md:311` states:
  ```
  | investigator | root-cause-tracing, systematic-debugging, testing-investigator | Bug and test failure investigation |
  ```

#### 4. Other agents show the pattern
- `C:\Dev\Git\nextai-dev\resources\agents\developer.md:12` - Also has `skillDependencies: []`
- `C:\Dev\Git\nextai-dev\resources\agents\reviewer.md:12` - Also has `skillDependencies: []`
- **All agents lack skill dependencies** - this is a systemic issue

#### 5. Skill embedding works in commands
- `C:\Dev\Git\nextai-dev\resources\templates\commands\review.md:97` - Contains placeholder
- `C:\Dev\Git\nextai-dev\resources\templates\commands\implement.md:93` - Contains placeholder
- `C:\Dev\Git\nextai-dev\src\core\sync\claude-code.ts:186` - `embedSkillPlaceholders()` called in `transformCommandTemplate()`
- `C:\Dev\Git\nextai-dev\src\core\sync\opencode.ts:151` - Same for OpenCode

#### 6. Agent transformer handles skillDependencies metadata
- `C:\Dev\Git\nextai-dev\src\core\sync\transformers\agent.ts:61-63` - Converts `skillDependencies` array to comma-separated string for Claude Code frontmatter
- However, this only affects the `skills:` frontmatter field, NOT the body content

### Affected Files

- `C:\Dev\Git\nextai-dev\resources\agents\investigator.md` - Needs `skillDependencies` array populated and skill placeholders in body
- `C:\Dev\Git\nextai-dev\src\core\sync\claude-code.ts` - `syncAgents()` needs to call `embedSkillPlaceholders()`
- `C:\Dev\Git\nextai-dev\src\core\sync\opencode.ts` - `syncAgents()` needs to call `embedSkillPlaceholders()`
- `C:\Dev\Git\nextai-dev\src\core\sync\transformers\agent.ts` - May need to handle skill embedding in transformation

## Fix Requirements

### Functional Requirements

1. **Investigator agent must include skill content**
   - `root-cause-tracing` skill content must be embedded in agent body
   - `systematic-debugging` skill content must be embedded in agent body
   - `testing-investigator` skill should also be included per conventions.md

2. **Skill embedding must work for all agents**
   - The fix should enable skill embedding for any agent with `skillDependencies`
   - Should work for both Claude Code and OpenCode sync targets

3. **Frontmatter and body must be consistent**
   - `skillDependencies` array in frontmatter should match embedded skills
   - Generated agent files should have both the frontmatter `skills:` field AND the body content

### Implementation Approach

**Option A: Add placeholders to agent templates (simpler)**
1. Update `resources/agents/investigator.md`:
   - Set `skillDependencies: ["root-cause-tracing", "systematic-debugging", "testing-investigator"]`
   - Add placeholder comments in the body under "## First Action" section:
     ```markdown
     ## First Action
     Before proceeding, load your skill:
     [Insert full content of .claude/skills/root-cause-tracing/SKILL.md here]

     [Insert full content of .claude/skills/systematic-debugging/SKILL.md here]

     [Insert full content of .claude/skills/testing-investigator/SKILL.md here]

     <!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
     ```
2. Update `syncAgents()` in both `claude-code.ts` and `opencode.ts` to call `embedSkillPlaceholders(content, projectRoot)` before writing

**Option B: Auto-generate placeholders from skillDependencies (more robust)**
1. Modify `toClaudeAgent()` and `toOpenCodeAgent()` in `agent.ts` to:
   - Read `skillDependencies` from frontmatter
   - Auto-generate placeholder strings for each skill
   - Insert them at the "First Action" section or after frontmatter
2. Then call `embedSkillPlaceholders()` on the transformed content

**Recommendation: Option A**
- Simpler and follows existing pattern used in command templates
- Explicit placeholders make it clear what gets embedded
- Easier to test and debug
- Consistent with how commands handle skills

## Scope

### In Scope
- Update `investigator.md` with skill dependencies and placeholders
- Modify `syncAgents()` in `claude-code.ts` to embed skills
- Modify `syncAgents()` in `opencode.ts` to embed skills
- Test that skills are correctly embedded in generated agent files

### Out of Scope
- Adding skills to other agents (developer, reviewer, etc.) - should be separate tasks
- Creating new skills
- Changing the skill embedding mechanism itself
- Modifying command templates
- Changing how the Skill tool works in Claude Code
