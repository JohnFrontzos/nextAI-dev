# Testing

## Manual Test Checklist

### Test 1: New Bug Workflow (Happy Path)
- [ ] Create a new bug: `nextai create "Test bug for validation"`
- [ ] Select type: `bug`
- [ ] Note the feature ID (e.g., `20251223_test-bug-validation`)
- [ ] Run refinement: `nextai refine <id>`
- [ ] Verify investigator agent is invoked (not product-owner)
- [ ] Wait for investigation to complete
- [ ] Verify file exists: `nextai/todo/<id>/planning/requirements.md`
- [ ] Verify file does NOT exist: `nextai/todo/<id>/planning/investigation.md`
- [ ] Verify technical-architect agent is invoked
- [ ] Wait for technical specification to complete
- [ ] Verify phase advances to `tech_spec` without requiring `--force` flag
- [ ] Verify no error messages about missing requirements.md
- [ ] Run `nextai show <id>` and verify phase is `tech_spec`

### Test 2: Verify File Contents
- [ ] Open `nextai/todo/<id>/planning/requirements.md`
- [ ] Verify it contains investigation findings (symptom, trace, root cause, evidence)
- [ ] Verify it follows the investigation template structure
- [ ] Open `nextai/todo/<id>/spec.md`
- [ ] Verify it references the investigation findings from requirements.md
- [ ] Verify spec.md contains fix specification and implementation approach

### Test 3: Template Consistency Check
- [ ] Open `.claude/templates/commands/refine.md`
- [ ] Locate "Context to provide the investigator subagent" section
- [ ] Verify it includes: `- Output: \`nextai/todo/$ARGUMENTS/planning/requirements.md\` (investigation findings)`
- [ ] Open `.claude/agents/investigator.md` line 35
- [ ] Verify it says "document findings." (NOT "document findings in planning/investigation.md")
- [ ] Open `.claude/skills/root-cause-tracing/SKILL.md`
- [ ] Verify it says "Write findings to the investigation document:" (NOT "planning/requirements.md")
- [ ] Open `.claude/skills/systematic-debugging/SKILL.md`
- [ ] Verify it says "update the investigation document:" (NOT "planning/requirements.md")

### Test 4: Regression - Feature Workflow
- [ ] Create a new feature: `nextai create "Test feature workflow"`
- [ ] Select type: `feature`
- [ ] Run refinement: `nextai refine <id>`
- [ ] Verify product-owner agent is invoked (not investigator)
- [ ] Verify it creates `planning/requirements.md` with product requirements
- [ ] Verify phase advances to `tech_spec` without errors
- [ ] Verify feature workflow is unaffected by bug workflow changes

### Test 5: Regression - Task Workflow
- [ ] Create a new task: `nextai create "Test task workflow"`
- [ ] Select type: `task`
- [ ] Run refinement: `nextai refine <id>`
- [ ] Verify product-owner agent is invoked (not investigator)
- [ ] Verify it creates `planning/requirements.md` with task requirements
- [ ] Verify phase advances to `tech_spec` without errors
- [ ] Verify task workflow is unaffected by bug workflow changes

### Test 6: Edge Case - Resume Bug Refinement
- [ ] Create a bug and run refinement until investigation completes
- [ ] Stop before technical specification completes
- [ ] Verify phase is still `product_refinement`
- [ ] Verify `planning/requirements.md` exists
- [ ] Run `nextai refine <id>` again (resume)
- [ ] Verify it continues from technical specification
- [ ] Verify it does NOT re-run investigation
- [ ] Verify phase advances to `tech_spec` without errors

### Test 7: Cleanup
- [ ] Remove test features created during testing
- [ ] Verify no leftover `investigation.md` files in any test feature folders
- [ ] Verify Git status shows only the 4 intended file changes in resources/

---

## Test Sessions
<!-- Populated during /nextai-testing phase -->
