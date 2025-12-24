# Testing

## Manual Test Checklist

### Part 1: Framework Skill Pre-Loading Tests

#### Test /nextai-refine command
- [ ] Create a test feature: `nextai create "test skill loading fix"`
- [ ] Run `/nextai-refine <id>` and observe Phase 1 (product-owner)
- [ ] Verify Task prompt contains "## Your Workflow" heading
- [ ] Verify full `refinement-product-requirements` skill content is present in prompt
- [ ] Verify NO "FIRST ACTION - Load Your Skill" instruction remains
- [ ] Verify agent does NOT call Skill("refinement-product-requirements") tool
- [ ] Verify agent follows workflow from injected skill content
- [ ] Allow Phase 1 to complete and verify Phase 2 starts (technical-architect)
- [ ] Verify Task prompt contains "## Your Workflow" heading
- [ ] Verify full `refinement-technical-specs` skill content is present in prompt
- [ ] Verify agent does NOT call Skill("refinement-technical-specs") tool
- [ ] Verify agent follows workflow from injected skill content
- [ ] Verify both phases complete successfully with proper outputs

#### Test /nextai-implement command
- [ ] Run `/nextai-implement <id>` on the test feature
- [ ] Verify Task prompt contains "## Your Workflow" heading
- [ ] Verify full `executing-plans` skill content is present in prompt
- [ ] Verify NO "FIRST ACTION - Load Your Skill" instruction remains
- [ ] Verify agent does NOT call Skill("executing-plans") tool
- [ ] Verify agent follows task execution workflow from injected skill
- [ ] Verify implementation proceeds correctly

#### Test /nextai-review command
- [ ] Run `/nextai-review <id>` on the test feature
- [ ] Verify Task prompt contains "## Your Workflow" heading
- [ ] Verify full `reviewer-checklist` skill content is present in prompt
- [ ] Verify NO "FIRST ACTION - Load Your Skill" instruction remains
- [ ] Verify agent does NOT call Skill("reviewer-checklist") tool
- [ ] Verify agent follows review checklist from injected skill
- [ ] Verify review completes with proper verdict

#### Test /nextai-complete command
- [ ] Complete testing phase to make feature ready for completion
- [ ] Run `/nextai-complete <id>` on the test feature
- [ ] Verify Step 1 Task prompt (summary generation)
- [ ] Verify "## Your Workflow" heading and `documentation-recaps` skill content present
- [ ] Verify agent does NOT call Skill("documentation-recaps") in Step 1
- [ ] Allow Step 1 to complete and observe Step 4 (documentation update)
- [ ] Verify Step 4 Task prompt also contains "## Your Workflow" heading
- [ ] Verify same `documentation-recaps` skill content present in Step 4
- [ ] Verify agent does NOT call Skill("documentation-recaps") in Step 4
- [ ] Verify feature completes and archives successfully

#### Test /nextai-testing command
- [ ] Verify this command has NO skill loading (conversational, not agent-based)
- [ ] No skill injection verification needed for this command

### Part 2: User Skill Support Tests

#### Test Empty Configuration (Default Behavior)
- [ ] Verify all 7 agent files have "First Action" section with placeholder comment
- [ ] Run `/nextai-refine` with default agent files (no user skills configured)
- [ ] Verify agents continue normally without errors
- [ ] Verify agents do NOT attempt to load user skills
- [ ] Verify framework skills are still injected and work correctly

#### Test Custom User Skill
- [ ] Create a test skill file: `.claude/skills/test-custom-skill/SKILL.md`
- [ ] Add frontmatter and simple content to test skill
- [ ] Edit `.claude/agents/technical-architect.md`
- [ ] Replace placeholder comment with: `Skill("test-custom-skill")`
- [ ] Run `/nextai-refine <new-test-id>` and observe Phase 2
- [ ] Verify technical-architect loads test-custom-skill via Skill tool
- [ ] Verify framework skill (refinement-technical-specs) is also present via injection
- [ ] Verify both skills are available to agent
- [ ] Restore placeholder comment after test

#### Test Multiple User Skills
- [ ] Create second test skill: `.claude/skills/test-second-skill/SKILL.md`
- [ ] Edit `.claude/agents/developer.md`
- [ ] Replace placeholder with two Skill() calls:
  ```
  Skill("test-custom-skill")
  Skill("test-second-skill")
  ```
- [ ] Run `/nextai-implement <id>` and observe developer agent
- [ ] Verify developer loads both user skills via Skill tool
- [ ] Verify framework skill (executing-plans) is also present via injection
- [ ] Verify no conflicts between skills
- [ ] Restore placeholder comment after test

#### Test Frontmatter Tool Availability
- [ ] Verify product-owner.md has Skill in tools frontmatter
- [ ] Verify technical-architect.md has Skill in tools frontmatter
- [ ] Verify developer.md has Skill in tools frontmatter
- [ ] Verify reviewer.md already has Skill in tools frontmatter
- [ ] Verify investigator.md has Skill in tools frontmatter
- [ ] Verify document-writer.md has Skill in tools frontmatter
- [ ] Verify ai-team-lead.md has Skill, Task, and SlashCommand in tools frontmatter

### Part 3: Integration Tests

#### Test Complete Workflow with User Skills
- [ ] Configure a user skill in one agent (e.g., technical-architect)
- [ ] Run full workflow: `/nextai-refine` → `/nextai-implement` → `/nextai-review` → `/nextai-testing` → `/nextai-complete`
- [ ] Verify agent with user skill loads it correctly
- [ ] Verify all agents receive their framework skills via injection
- [ ] Verify no skill loading failures or errors
- [ ] Verify workflow completes successfully end-to-end

#### Test Skill Injection Format
- [ ] Examine one Task prompt in detail during any command execution
- [ ] Verify "## Your Workflow" heading is present
- [ ] Verify skill content follows immediately after heading
- [ ] Verify NO YAML frontmatter included in injected content
- [ ] Verify skill markdown body is complete and properly formatted
- [ ] Verify "Now proceed with your task using the workflow above." instruction present

### Part 4: Error and Edge Case Tests

#### Test Missing User Skill (Non-Existent File)
- [ ] Edit an agent's "First Action" to reference non-existent skill: `Skill("does-not-exist")`
- [ ] Run command that uses this agent
- [ ] Verify agent attempts to load skill and receives appropriate error
- [ ] Verify agent can still proceed with framework skill (injected)
- [ ] Restore placeholder after test

#### Test Malformed "First Action" Section
- [ ] Edit an agent's "First Action" with malformed Skill() call
- [ ] Run command that uses this agent
- [ ] Verify graceful handling or clear error message
- [ ] Restore proper format after test

#### Test Framework and User Skill Coexistence
- [ ] Configure user skill in an agent
- [ ] Run command that injects framework skill for same agent
- [ ] Verify both skills are accessible to agent
- [ ] Verify no naming conflicts or override issues
- [ ] Verify agent can follow guidance from both skills

### Part 5: Standardization Verification

#### Verify "First Action" Consistency
- [ ] Check all 7 agent files have identical "First Action" section structure
- [ ] Verify all use exact format: "Before proceeding, load your skill:"
- [ ] Verify all use same comment syntax: `<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->`
- [ ] Verify section placement is consistent (after frontmatter, before or after "Your Role")

#### Verify Hardcoded Skill() Calls Removed
- [ ] Search product-owner.md for `Skill("refinement-product-requirements")` - should NOT exist
- [ ] Search technical-architect.md for `Skill("refinement-technical-specs")` - should NOT exist
- [ ] Search developer.md for `Skill("executing-plans")` - should NOT exist
- [ ] Search reviewer.md for `Skill("reviewer-checklist")` - should NOT exist
- [ ] Search investigator.md for `Skill("root-cause-tracing")` or `Skill("systematic-debugging")` - should NOT exist
- [ ] Search document-writer.md for `Skill("documentation-recaps")` - should NOT exist

#### Verify Command File Updates
- [ ] Search nextai-refine.md for "FIRST ACTION - Load Your Skill" - should NOT exist
- [ ] Search nextai-implement.md for "FIRST ACTION - Load Your Skill" - should NOT exist
- [ ] Search nextai-review.md for "FIRST ACTION - Load Your Skill" - should NOT exist
- [ ] Search nextai-complete.md for "FIRST ACTION - Load Your Skill" - should NOT exist
- [ ] Verify all commands have "## Your Workflow" injection instructions instead

---

## Test Sessions

### Session 1 - 2024-12-24
**Status:** FAIL
**Tester:** Operator

**Notes:** Testing failed to fix all minor issues identified in code review. These issues must be addressed before completion.

**Issues to Fix:**
1. **Inconsistency in analyze.md command template**
   - Location: `resources/templates/commands/analyze.md:37-41`
   - Issue: Still uses old "FIRST ACTION - Load Your Skill" pattern with hardcoded `Skill("documentation-recaps")`
   - Fix: Update to use "## Your Workflow" pattern with skill injection placeholder

2. **Path inconsistency in product-owner.md**
   - Location: `resources/agents/product-owner.md:28`
   - Issue: Uses `todo/<id>/...` while other agents use `nextai/todo/<id>/...`
   - Fix: Standardize to `nextai/todo/<id>/` for consistency

3. **Character encoding artifacts in ai-team-lead.md**
   - Location: `resources/agents/ai-team-lead.md:28`
   - Issue: Contains mojibake characters in place of punctuation
   - Fix: Clean up encoding artifacts

**Investigation Report:**
Returning to implementation to fix all 3 minor issues before completion.
