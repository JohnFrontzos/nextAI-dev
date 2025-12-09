# Spec: Tasks Structure Refactor

## Problem Statement

### Issue: False Positive Implementation Blocking

The implementation phase is incorrectly blocked from completion because the `tasks.md` template includes tasks that belong to later phases:

**Current tasks.md template includes:**
```markdown
## Testing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Manual testing          ← Testing phase task (human)

## Documentation
- [ ] Update relevant docs    ← Document-writer agent task
- [ ] Add code comments       ← Could be implementation, but vague

## Review
- [ ] Self-review code        ← Review phase task
- [ ] Address review feedback ← Review phase task
```

**How implementation completion is detected** ([phase-detection.ts:112-113](src/core/validation/phase-detection.ts#L112-L113)):
```typescript
case 'implementation':
  return getTaskProgress(join(featureDir, 'tasks.md')).isComplete;
```

The `getTaskProgress()` function counts ALL checkbox items in `tasks.md`. This means:
- Developer completes all code implementation tasks
- Manual testing checkbox remains unchecked (not developer's job)
- Documentation checkbox remains unchecked (document-writer's job)
- Review feedback checkbox remains unchecked (happens after review)
- **Result**: Implementation phase shows as incomplete even though all developer work is done

### Root Cause

The task template conflates three distinct responsibilities:
1. **Developer tasks** - Code implementation work
2. **Agent tasks** - Work done by reviewer/document-writer agents
3. **Human tasks** - Manual testing by the user

---

## Proposed Solution

### Remove Non-Implementation Tasks from tasks.md

The `tasks.md` file should ONLY contain tasks for the implementation phase. Testing, documentation, and review are handled by their respective phases/agents.

### New tasks.md Template Structure

```markdown
# Implementation Tasks

## Pre-implementation
- [ ] Review existing related code
- [ ] Set up any required dependencies

## Core Implementation
- [ ] Task 1: Description
- [ ] Task 2: Description
- [ ] Task 3: Description

## Automated Tests
- [ ] Write unit tests for new functionality
- [ ] Write integration tests
- [ ] Ensure existing tests pass
```

**What stays:**
- Pre-implementation tasks
- Core implementation tasks
- Automated tests (unit/integration - developer responsibility)

**What's removed:**
- `Manual testing` → Handled by `/nextai-testing` phase (human task)
- `## Documentation` section → Handled by document-writer agent during `/nextai-complete`
- `## Review` section → Handled by reviewer agent during `/nextai-review`

---

## Technical Specification

### Complete File Inventory

All files that define or reference the tasks.md structure:

| Category | File Path | Lines | Change Required |
|----------|-----------|-------|-----------------|
| **Skill (3 copies)** | `.claude/skills/nextai/refinement-spec-writer/SKILL.md` | 66-93 | Yes - update template |
| | `resources/skills/refinement-spec-writer/SKILL.md` | 66-93 | Yes - update template |
| | `.nextai/skills/refinement-spec-writer/SKILL.md` | 66-93 | Yes - update template |
| **Command (3 copies)** | `.claude/commands/nextai-refine.md` | 81-85 | Yes - update structure |
| | `resources/templates/commands/refine.md` | 86-90 | Yes - update structure |
| | `.nextai/templates/commands/refine.md` | 80-83 | Yes - update structure |
| **Agent (3 copies)** | `.claude/agents/nextai/technical-architect.md` | 87-93 | Yes - update instructions |
| | `resources/agents/technical-architect.md` | 87-93 | Yes - update instructions |
| | `.nextai/agents/technical-architect.md` | 87-93 | Yes - update instructions |

**Total: 9 files require updates**

---

### Detailed Changes

#### 1. Skill Template: refinement-spec-writer (3 files)

**Files:**
- `.claude/skills/nextai/refinement-spec-writer/SKILL.md`
- `resources/skills/refinement-spec-writer/SKILL.md`
- `.nextai/skills/refinement-spec-writer/SKILL.md`

**Current (lines 66-93):**
```markdown
### Phase 3: Write tasks.md
Create a step-by-step implementation checklist:

```markdown
# Implementation Tasks

## Pre-implementation
- [ ] Review existing related code
- [ ] Set up any required dependencies

## Core Implementation
- [ ] Task 1: Description
- [ ] Task 2: Description
- [ ] Task 3: Description

## Testing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Manual testing

## Documentation
- [ ] Update relevant docs
- [ ] Add code comments where needed

## Review
- [ ] Self-review code
- [ ] Address review feedback
```

**Proposed:**
```markdown
### Phase 3: Write tasks.md
Create a step-by-step implementation checklist containing ONLY implementation-phase work:

```markdown
# Implementation Tasks

## Pre-implementation
- [ ] Review existing related code
- [ ] Set up any required dependencies

## Core Implementation
- [ ] Task 1: Description
- [ ] Task 2: Description
- [ ] ...additional tasks based on spec

## Automated Tests
- [ ] Write unit tests for new functionality
- [ ] Write integration tests
- [ ] Ensure existing tests pass
```

**IMPORTANT:** Do NOT include these sections - they are handled by other phases:
- Manual testing → `/nextai-testing` phase (human task)
- Documentation → document-writer agent during `/nextai-complete`
- Review/feedback → reviewer agent during `/nextai-review`
```

---

#### 2. Command Templates: refine.md (3 files)

**Files:**
- `.claude/commands/nextai-refine.md` (lines 81-85)
- `resources/templates/commands/refine.md` (lines 86-90)
- `.nextai/templates/commands/refine.md` (lines 80-83)

**Current:**
```markdown
### tasks.md structure:
- Pre-implementation tasks
- Core implementation tasks (checkbox format)
- Testing tasks
- Documentation tasks
```

**Proposed:**
```markdown
### tasks.md structure:
- Pre-implementation tasks
- Core implementation tasks (checkbox format)
- Automated tests (unit tests, integration tests - NOT manual testing)

> Do NOT include documentation or review tasks - these are handled by their respective phases.
```

---

#### 3. Agent: technical-architect (3 files)

**Files:**
- `.claude/agents/nextai/technical-architect.md` (lines 87-93)
- `resources/agents/technical-architect.md` (lines 87-93)
- `.nextai/agents/technical-architect.md` (lines 87-93)

**Current:**
```markdown
### Step 7: Write tasks.md
Create actionable implementation checklist:
- Pre-implementation tasks
- Core implementation (broken into logical steps)
- Testing tasks
- Documentation tasks
```

**Proposed:**
```markdown
### Step 7: Write tasks.md
Create actionable implementation checklist containing ONLY implementation-phase work:
- Pre-implementation tasks
- Core implementation (broken into logical steps)
- Automated tests (unit tests, integration tests - NOT manual testing)

Do NOT include documentation or review tasks - these are handled by document-writer and reviewer agents.
```

---

### Agent Updates (Verification - No Changes Required)

#### Reviewer Agent
**File:** `.claude/agents/nextai/reviewer.md`

**Current behavior (line 40):** "Check that all tasks are marked complete"

**Impact:** With the new structure, this check becomes MORE accurate because `tasks.md` only contains implementation tasks. The reviewer validates that the developer completed their work.

**No changes needed.**

#### Document-Writer Agent
**File:** `.claude/agents/nextai/document-writer.md`

**Current behavior (line 84):** "Read `spec.md` and `tasks.md`" to understand context.

**Impact:** The document-writer uses these files for context only, not for task assignment. It determines documentation updates based on the spec and implementation changes.

**No changes needed.**

---

### Phase Detection Logic (No Changes Required)

**File:** `src/core/validation/phase-detection.ts`

The `getTaskProgress()` function (lines 40-68) will continue to work correctly:
- It counts all `- [ ]` and `- [x]` items
- With the new template, these will only be implementation tasks
- Implementation completion detection becomes accurate

**No code changes needed.**

---

## Migration Considerations

### Existing Features

Features already in progress will have the old task structure with Testing/Documentation/Review sections.

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| 1. Leave as-is | No migration | Simple, no risk | Existing features remain blocked |
| 2. Manual fix | User removes sections | Targeted | Manual effort per feature |
| 3. Repair command | `/nextai-repair` detects and fixes | Automated | Additional development |
| 4. Warning in status | Show warning for old format | Awareness | Doesn't fix the issue |

**Recommendation:** Option 2 (Manual fix)

- Users can manually remove the Documentation/Review sections from `tasks.md`
- Or run `/nextai-repair` if we implement Option 3 later

**Future work (not in scope):** Option 4 (Warning in status) could be added later if needed. This would require:
- File: `src/cli/commands/status.ts` or equivalent status handler
- Detection: Check if `tasks.md` contains `## Documentation` or `## Review` sections
- Message: "Warning: tasks.md uses legacy format with non-implementation tasks. Consider removing Documentation/Review sections."

### Detection of Old Format

To identify features with the old format, check for these patterns in `tasks.md`:
- Contains `## Documentation` section
- Contains `## Review` section
- Contains `- [ ] Manual testing` checkbox

---

## Implementation Checklist

### Skill Templates (3 files)
- [ ] Update `.claude/skills/nextai/refinement-spec-writer/SKILL.md`
- [ ] Update `resources/skills/refinement-spec-writer/SKILL.md`
- [ ] Update `.nextai/skills/refinement-spec-writer/SKILL.md`

### Command Templates (3 files)
- [ ] Update `.claude/commands/nextai-refine.md`
- [ ] Update `resources/templates/commands/refine.md`
- [ ] Update `.nextai/templates/commands/refine.md`

### Agent Definitions (3 files)
- [ ] Update `.claude/agents/nextai/technical-architect.md`
- [ ] Update `resources/agents/technical-architect.md`
- [ ] Update `.nextai/agents/technical-architect.md`

### Verification
- [ ] Verify reviewer agent works with new structure
- [ ] Verify document-writer agent works with new structure
- [ ] Test: create feature → refine → check tasks.md has correct structure
- [ ] Test: implement all tasks → verify implementation phase completes

### Future Work (Out of Scope)
- [ ] Add warning in `/nextai-status` for old task format (see Migration section for details)
- [ ] Add `/nextai-repair` logic to fix old task structures

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| tasks.md contains | Implementation + Manual Testing + Docs + Review | Implementation + Automated Tests only |
| Implementation completion | Blocked by unrelated tasks | Accurate |
| Manual testing tracking | Checkbox in tasks.md | testing.md file |
| Documentation updates | Checkbox in tasks.md | document-writer agent |
| Review feedback | Checkbox in tasks.md | reviewer agent |
| Files to update | N/A | 9 template/agent files |
| Code changes | N/A | None |

---

## Decisions Made

1. **Unit tests and integration tests stay in tasks.md** - These are developer responsibilities during implementation.

2. **Manual testing removed** - This is a human task during the testing phase, tracked in `testing.md`.

3. **Documentation section removed** - The document-writer agent determines what to update based on the spec, not from a checkbox.

4. **Review section removed** - The reviewer agent operates independently; "address review feedback" happens via retry cycles, not checkboxes.

5. **Existing features not auto-migrated** - Users can manually fix or we add repair logic later.
