# Bug Investigation: Manual Verification Section in tasks.md

## Symptom

The tasks.md file generated during refinement incorrectly includes a "## Manual Verification" section with verification tasks. Example from `nextai/done/20251212_fix-docs-output-path/tasks.md` lines 26-32:

```markdown
## Manual Verification

- [x] Test on fresh project: Initialize new NextAI project and run `/nextai-analyze`
- [x] Verify docs appear in `nextai/docs/` (not `.nextai/`)
- [x] Test on existing project: Run `/nextai-analyze` and verify docs update correctly
- [x] Verify session.json reading still works (check for timestamp in documentation)
- [x] Check that completion message displays correctly
```

This section duplicates content from spec.md Testing Strategy and pollutes the implementation task list with non-implementation tasks.

## Expected Behavior

tasks.md should ONLY contain:
- Pre-implementation tasks
- Core implementation tasks
- Unit tests (if applicable)

Manual verification/testing tasks belong in spec.md Testing Strategy section, not in tasks.md.

## Trace

### 1. Symptom: Manual Verification appears in tasks.md
Evidence: `nextai/done/20251212_fix-docs-output-path/tasks.md` lines 26-32

### 2. Cause: Technical-architect agent adds this section during refinement
The technical-architect subagent is responsible for generating both spec.md and tasks.md during Phase 2 of refinement.

### 3. Cause: Spec.md contains comprehensive Testing Strategy
Evidence: `nextai/done/20251212_fix-docs-output-path/spec.md` lines 190-249 shows detailed Testing Strategy with Manual Testing section. The agent appears to be duplicating this into tasks.md.

### 4. Root: Skill instructions lack explicit prohibition

The `refinement-spec-writer` skill (`.claude/skills/refinement-spec-writer/SKILL.md`) provides the guidance for generating tasks.md.

**Current instructions** (lines 86-89):
```markdown
**IMPORTANT:** Do NOT include these sections - they are handled by other phases:
- Manual testing → `/nextai-testing` phase (human task)
- Documentation → document-writer agent during `/nextai-complete`
- Review/feedback → reviewer agent during `/nextai-review`
```

**Analysis**:
- The prohibition exists but is NOT explicit enough
- States "Manual testing → `/nextai-testing` phase" but doesn't clearly say "DON'T CREATE A MANUAL VERIFICATION SECTION"
- The arrow notation (→) implies these go elsewhere, but doesn't explicitly forbid creating the section
- Agents may interpret this as informational rather than prescriptive

## Root Cause

The `refinement-spec-writer` skill contains instructions prohibiting manual testing in tasks.md, but the wording is **implicit rather than explicit**. The current phrasing:

```
- Manual testing → `/nextai-testing` phase (human task)
```

Is interpreted by agents as "manual testing happens in a different phase" rather than "DO NOT create a Manual Verification section in tasks.md".

The technical-architect agent sees:
1. Comprehensive Testing Strategy in spec.md (which correctly belongs there)
2. Manual testing tasks in that strategy
3. Instructions that say manual testing "goes to" another phase
4. Interprets this as: "I should include these tasks in tasks.md and note they're for manual testing"

Rather than the intended interpretation: "I should NOT include manual testing tasks in tasks.md at all"

## Evidence

### File: `.claude/skills/refinement-spec-writer/SKILL.md`
- Lines 63-84: Defines tasks.md structure (Pre-implementation, Core Implementation, Unit Tests)
- Lines 86-89: Lists what NOT to include, but uses implicit "→" notation
- Missing: Explicit prohibition statement like "DO NOT add Manual Verification/Manual Testing sections"

### File: `.nextai/templates/commands/refine.md`
- Lines 137-142: Defines tasks.md structure at command level
- Line 142: "Do NOT include documentation or review tasks"
- Missing: Does not mention manual testing/verification prohibition

### File: `nextai/done/20251212_fix-docs-output-path/spec.md`
- Lines 190-249: Contains comprehensive Testing Strategy with Manual Testing subsection
- This is CORRECT placement for testing strategy
- Agent appears to duplicate this into tasks.md

### File: `nextai/done/20251212_fix-docs-output-path/tasks.md`
- Lines 26-32: Shows the problematic "## Manual Verification" section
- Tasks are nearly identical to spec.md Testing Strategy manual testing items

## Fix Recommendation

### Primary Fix: Strengthen skill instructions

**Location**: `.claude/skills/refinement-spec-writer/SKILL.md` lines 86-89

**Current**:
```markdown
**IMPORTANT:** Do NOT include these sections - they are handled by other phases:
- Manual testing → `/nextai-testing` phase (human task)
- Documentation → document-writer agent during `/nextai-complete`
- Review/feedback → reviewer agent during `/nextai-review`
```

**Proposed**:
```markdown
**IMPORTANT:** Do NOT include these sections in tasks.md - they are handled by other phases:
- Manual testing/verification → Belongs in spec.md Testing Strategy, executed in `/nextai-testing` phase
- Documentation tasks → Handled by document-writer agent during `/nextai-complete`
- Review/feedback tasks → Handled by reviewer agent during `/nextai-review`

DO NOT create "Manual Verification", "Manual Testing", or similar sections in tasks.md.
Testing strategy belongs in spec.md only.
```

### Secondary Fix: Reinforce in command template

**Location**: `.nextai/templates/commands/refine.md` lines 137-142

**Current**:
```markdown
### tasks.md structure:
- Pre-implementation tasks
- Core implementation tasks (checkbox format)
- Unit tests (only if project has test framework - check nextai/docs/technical-guide.md)

> Do NOT include documentation or review tasks - these are handled by their respective phases.
```

**Proposed**:
```markdown
### tasks.md structure:
- Pre-implementation tasks
- Core implementation tasks (checkbox format)
- Unit tests (only if project has test framework - check nextai/docs/technical-guide.md)

> Do NOT include:
> - Manual testing/verification sections (belongs in spec.md Testing Strategy)
> - Documentation tasks (handled by `/nextai-complete`)
> - Review tasks (handled by `/nextai-review`)
```

## Prevention

### Immediate
1. Update skill instructions to be explicitly prohibitive rather than implicitly directive
2. Add clear examples of what NOT to include

### Future
1. Consider adding validation step in refinement completion that checks for prohibited sections in tasks.md
2. Add examples of correct tasks.md structure to skill documentation
3. Review other skills for similar implicit vs explicit instruction issues

## Verification Steps

After implementing fix:
1. Run `/nextai-refine` on a new feature
2. Check generated tasks.md does NOT contain "## Manual Verification" or similar sections
3. Verify spec.md still contains comprehensive Testing Strategy (this should remain)
4. Confirm tasks.md only has: Pre-implementation, Core Implementation, Unit Tests (if applicable)

## Related Issues

None identified. This is an isolated instruction clarity issue in the spec-writer skill.

## Success Criteria

1. No "Manual Verification" or "Manual Testing" sections appear in newly generated tasks.md files
2. Testing strategy remains comprehensive in spec.md
3. Task lists remain focused on implementation-only work
4. No confusion about where testing tasks belong
