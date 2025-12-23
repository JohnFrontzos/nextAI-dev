# Fix Phase Detection

## Overview

Remove the problematic `nextai-guidelines` skill that was meant to enforce NextAI CLI workflow but instead caused workflow bypasses and stale ledger state. This bug manifested as features appearing stuck in early phases despite having all required artifacts created.

## Requirements Summary

From the investigation findings:

1. Feature `20251223_continuous-location-updates` had all artifacts (requirements.md through testing.md) but ledger showed phase stuck at `product_refinement`
2. Root cause: The `nextai-guidelines` skill was bypassed. Claude wrote artifacts directly to filesystem instead of using NextAI CLI commands
3. Without CLI commands, the ledger was never updated despite all artifacts being present
4. The `nextai-guidelines` skill cannot enforce workflow compliance - it's just informational context, not prescriptive guardrails

## Technical Approach

The fix involves returning to the simpler, proven approach:

1. Delete the `nextai-guidelines` skill entirely
2. Add minimal NextAI workflow awareness to the `ai-team-lead` agent
3. Ensure phase skills prompt the next command at completion
4. Rely on user-driven workflow through slash commands

This restores the working model where:
- Users run slash commands to advance phases
- Slash commands invoke CLI commands that update ledger state
- Phase transitions are properly tracked
- Metrics are collected
- History is logged

## Architecture

### Components Affected

1. **Skill System**
   - Remove: `resources/skills/nextai-guidelines/`
   - Verify: Phase skills already prompt next command

2. **Agent System**
   - Modify: `resources/agents/ai-team-lead.md`
   - Add minimal NextAI workflow context

3. **Phase Skills** (verification only)
   - Check: `resources/skills/refinement-product-requirements/SKILL.md`
   - Check: `resources/skills/refinement-technical-specs/SKILL.md`
   - Check: `resources/skills/executing-plans/SKILL.md`
   - Check: `resources/skills/reviewer-checklist/SKILL.md`

### Data Flow

**Before (Broken):**
```
User → Claude → Direct file writes → Ledger not updated
```

**After (Fixed):**
```
User → Slash command → CLI command → File writes + Ledger update
```

## Implementation Details

### 1. Delete nextai-guidelines Skill

**File to Delete:**
- `resources/skills/nextai-guidelines/SKILL.md`
- `resources/skills/nextai-guidelines/` (entire directory)

**Reason:**
- Skills cannot enforce workflow behavior
- The skill is purely informational/educational
- It created confusion about proper workflow
- Previous user-driven approach was working correctly

### 2. Update ai-team-lead Agent

**File:** `resources/agents/ai-team-lead.md`

**Add section after "Project Context" (around line 50):**

```markdown
## NextAI Workflow

When working with NextAI features, use the slash commands to advance phases:
- `/nextai-refine <id>` - Product + technical refinement
- `/nextai-implement <id>` - Execute implementation
- `/nextai-review <id>` - Code review
- `/nextai-testing <id>` - Log manual testing
- `/nextai-complete <id>` - Archive completed work

These commands invoke the CLI which updates ledger state, collects metrics, and logs history.
DO NOT write artifacts (requirements.md, spec.md, tasks.md, etc.) directly - always use the appropriate slash command.
```

**Why this location:**
- After understanding project context, before routing logic
- Provides context without being prescriptive
- Keeps it simple and actionable

### 3. Verify Phase Skills Already Prompt Next Command

Based on code review:
- `refinement-product-requirements/SKILL.md` - MISSING next command prompt
- `refinement-technical-specs/SKILL.md` - Currently in use, MISSING next command prompt
- `executing-plans/SKILL.md` - MISSING next command prompt
- `reviewer-checklist/SKILL.md` - MISSING next command prompt

These skills need to add an explicit completion section that tells the user what command to run next.

**Pattern to Add (at end of each skill):**

```markdown
## Next Steps

After completing this phase, run:
```
/nextai-<next-phase> <id>
```
```

Specific commands:
- refinement-product-requirements → `/nextai-refine <id>` (continues to technical specs)
- refinement-technical-specs → `/nextai-implement <id>`
- executing-plans → `/nextai-review <id>`
- reviewer-checklist → `/nextai-testing <id>` (if PASS) or back to implement (if FAIL)

## API/Interface Changes

None. This is purely a workflow enforcement fix.

## Data Model

No database or state structure changes. The ledger format remains unchanged.

## Security Considerations

None. This fix improves workflow integrity by ensuring state transitions happen through proper CLI channels.

## Error Handling

No new error handling needed. This prevents the error case where artifacts exist but ledger is stale.

## Existing Code to Leverage

- Phase detection logic in `src/core/validation/phase-detection.ts` - Already correct, just not being called
- CLI commands that update ledger - Already working correctly
- Slash command templates - Already properly invoke CLI

## Testing Strategy

1. **Unit Tests**: None required (no code logic changes)

2. **Integration Tests**: Manual testing in consumer project
   - Create a new feature in honestli-android
   - Verify Claude uses slash commands instead of direct file writes
   - Verify ledger updates correctly after each phase
   - Verify phase detection matches actual artifacts

3. **Regression Tests**:
   - Test existing `20251223_continuous-location-updates` feature
   - Run `nextai show <id>` to verify current state
   - Artifacts should remain untouched
   - Ledger state may need manual correction (separate operation)

## Alternatives Considered

### Alternative 1: Enhance nextai-guidelines Skill
Make the skill more prescriptive and mandatory.

**Rejected because:**
- Skills don't have enforcement power over Claude's behavior
- Adding stronger language wouldn't change the fundamental limitation
- Would add complexity without solving the core issue

### Alternative 2: Add Runtime Validation
Detect when artifacts are created outside CLI and warn/block.

**Rejected because:**
- Adds significant complexity to detect file system changes
- Would require file watchers or timestamp comparison
- Better to prevent the issue at the source (remove confusing skill)

### Alternative 3: Make Phase Detection More Robust
Improve `detectPhaseFromArtifacts()` to handle more edge cases.

**Rejected because:**
- The phase detection logic is already correct
- The issue is that it's not being called, not that it's returning wrong results
- Doesn't address the root cause (bypassed CLI commands)

## Why This Approach Works

1. **Simplicity**: Removes a component that wasn't working rather than adding complexity
2. **Proven Pattern**: Returns to the user-driven workflow that was already working
3. **Clear Ownership**: User controls phase transitions via slash commands
4. **Proper State Management**: CLI commands ensure ledger/metrics/history are updated
5. **Maintainability**: Fewer moving parts, clearer responsibilities

## Migration Path

No migration needed. The skill can simply be deleted. Existing features remain unaffected.

For the stuck feature (`20251223_continuous-location-updates`):
- The artifacts are correct
- The ledger state is stale
- User can advance phase manually using `nextai status <id>` or by running appropriate slash command
- Or regenerate the review/testing phases using proper commands
