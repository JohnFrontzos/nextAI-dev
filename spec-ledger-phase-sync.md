# Technical Specification: Ledger Phase Synchronization for Slash Commands

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.7 | 2024-12-08 | Fixed test checklist: wrong phase errors now match per-command validation logic |
| 1.6 | 2024-12-08 | Fixed /nextai-complete completion flow: uses `nextai complete` CLI command, not `nextai advance` |
| 1.5 | 2024-12-08 | Added resume support to /nextai-refine, documented resume mode exception in generic advance section |
| 1.4 | 2024-12-08 | Added resume support to /nextai-review and /nextai-testing command blocks to match mapping table |
| 1.3 | 2024-12-08 | Fixed /nextai-complete mapping table (no start advance, only completion advance) |
| 1.2 | 2024-12-08 | Consolidated advance timing rules, added resume support, added /nextai-complete block, clarified failure handling |
| 1.1 | 2024-12-08 | Fixed gaps: explicit `--to` for all advance calls, artifact validation for /nextai-testing, failure handling, corrected happy path flow |
| 1.0 | 2024-12-08 | Initial specification |

## Problem Statement

### Current Behavior

The NextAI framework has two parallel systems for tracking feature progress:

1. **Artifact-based detection**: The system detects phase by checking which files exist (`initialization.md`, `spec.md`, `tasks.md`, `review.md`, etc.)
2. **Ledger phase tracking**: The `ledger.json` stores an explicit `phase` field that must be updated via CLI commands.

Currently, slash commands (`/nextai-refine`, `/nextai-implement`, etc.) only create/modify artifacts but **do not update the ledger**. The ledger is only updated when the user explicitly runs `nextai advance <id>`.

### The UX Problem

When a user runs slash commands directly:

```
/nextai-create "My Feature"     → ledger: created
/nextai-refine my-feature       → ledger: created (should be tech_spec)
/nextai-implement my-feature    → ledger: created (should be implementation)
```

The ledger becomes out of sync with actual progress. This causes:

1. **Confusion**: `nextai list` shows wrong phases
2. **Broken flow**: AI review not triggered because system thinks feature is still at `created`
3. **Poor UX**: User expects running `/nextai-implement` to be their approval to move to implementation phase

### Root Cause

The slash commands were designed with the assumption that users would run `nextai advance` after each phase. However, running a phase-specific command (like `/nextai-implement`) **is** the user's approval to advance - there's no need for a separate step.

## Proposed Solution

### Design Principle

**Running a phase command IS the user's approval to advance to that phase.**

- `/nextai-refine` = "I approve moving to refinement"
- `/nextai-implement` = "I approve moving to implementation"
- `/nextai-review` = "I approve moving to review"

### Solution Components

1. **Pre-flight validation**: Each slash command validates the ledger phase before proceeding
2. **Auto-advance on start**: Commands advance the ledger to their phase at the start
3. **Auto-advance on completion**: Commands advance the ledger after successful completion
4. **Clear error messages**: If phase is wrong, show what command to run instead

## Technical Specification

### Phase Command Mapping

| Slash Command | Required Ledger Phase | Also Accepts (Resume) | Required Artifact Check | Advances To (on start) | Advances To (on completion) |
|---------------|----------------------|----------------------|------------------------|------------------------|----------------------------|
| `/nextai-refine` | `created` | `product_refinement` | `initialization.md` exists | `product_refinement` | `tech_spec` |
| `/nextai-implement` | `tech_spec` | `implementation` | `spec.md` + `tasks.md` exist | `implementation` | (stays at `implementation`) |
| `/nextai-review` | `implementation` | `review` | All tasks `[x]` in `tasks.md` | `review` | (stays at `review`) |
| `/nextai-testing` | `review` | `testing` | `review.md` with PASS verdict | `testing` | (stays at `testing`) |
| `/nextai-complete` | `testing` | - | `testing.md` with PASS status | (no start advance) | `complete` |

**Important**:
- Each command explicitly uses `--to <phase>` for all advance calls. We never rely on auto-detection to determine the target phase.
- "Also Accepts (Resume)" means the command can be re-run if already at that phase (to resume interrupted work).

### Pre-flight Check Logic

Each slash command must add this validation block after the existing pre-flight checks:

```markdown
## Phase Validation

Check the feature's current ledger phase:

1. Run: `nextai show $ARGUMENTS --json`
2. Parse the `phase` field from output

### Expected Phase Check

**For /nextai-refine:**
- Expected: `created` OR `product_refinement` (resume)
- If `created`: Normal start - proceed to advance phase
- If `product_refinement`: Resume mode - continue refinement from current progress
- If `tech_spec`: Already refined, skip to implement
- If beyond `tech_spec`: Already past refinement

**For /nextai-implement:**
- Expected: `tech_spec` OR `implementation` (resume)
- If `created` or `product_refinement`: Need refinement first
- If `implementation`: Resume mode - continue from current progress
- If `review` or beyond: Already past implementation

**For /nextai-review:**
- Expected: `implementation` OR `review` (resume)
- If before `implementation`: Need to implement first
- If `review`: Resume mode - check for existing review.md
- If beyond `review`: Already past review

**For /nextai-testing:**
- Expected ledger phase: `review` OR `testing` (resume)
- Expected artifact: `review.md` with PASS verdict (must check file, not just ledger)
- If ledger before `review`: Need review first
- If ledger is `review` but `review.md` missing or has FAIL: Need to fix and re-review
- If `testing`: Resume mode - continue with testing workflow
- NOTE: Both ledger AND artifact must be valid - ledger alone is insufficient

**For /nextai-complete:**
- Expected: `testing`
- If before `testing`: Need testing first

### Error Messages

If phase is BEHIND expected:
```
Error: Cannot run /nextai-implement - feature is at phase 'created'.

Required phase: tech_spec

Run this command first:
  /nextai-refine $ARGUMENTS
```

If phase is AHEAD of expected:
```
Error: Cannot run /nextai-refine - feature is already at phase 'implementation'.

This phase has already been completed.

Suggested next command:
  /nextai-review $ARGUMENTS
```
```

### Advance Calls

Each slash command must call `nextai advance` at specific points. **Always use explicit `--to <phase>`** to avoid auto-detection picking an unexpected phase.

#### On Start (before doing work)

```markdown
## Advance Phase (Start)

Before beginning work, advance the ledger to mark the phase as started:

Run: `nextai advance $ARGUMENTS --to <start_phase> --quiet`

Where <start_phase> is the phase this command operates in (e.g., `implementation` for /nextai-implement).

This updates the ledger to reflect that this phase is now in progress.

**IMPORTANT - Resume Mode Exception:**
If the ledger is already at this phase (resume mode), SKIP the start advance.
The ledger is already correct; advancing again would be a no-op or error.

Example: If `/nextai-implement` is run when ledger is already at `implementation`,
skip the advance call and proceed directly to the work.
```

#### On Completion (after successful work)

```markdown
## Advance Phase (Completion)

After successfully completing all work for this phase:

Run: `nextai advance $ARGUMENTS --to <completion_phase> --quiet`

Where <completion_phase> is explicitly specified per command:
- /nextai-refine: `nextai advance $ARGUMENTS --to tech_spec --quiet`
- /nextai-implement: (no completion advance - stays at implementation)
- /nextai-review: (no completion advance - stays at review)
- /nextai-testing: (no completion advance - stays at testing)
- /nextai-complete: `nextai complete $ARGUMENTS` (special case - uses CLI complete command, not advance)

IMPORTANT:
- Never use `nextai advance` without `--to`. Auto-detection could jump phases unexpectedly.
- /nextai-complete uses `nextai complete` instead of `nextai advance` because the CLI command handles archiving files to done/ folder in addition to updating the ledger.
```

### Failure Handling and Rollback

If a slash command fails or is aborted mid-execution, the ledger may be ahead of artifacts. **This is expected behavior** and has well-defined recovery paths.

#### Why Ledger-Ahead-of-Artifacts Can Happen

Commands that advance on start (to show "in progress" status) may fail before completing:
- User aborts mid-execution
- AI agent encounters an error
- Network/system failure

In these cases, the ledger shows a phase but the required artifacts for that phase don't exist.

#### This Is Expected - Not a Bug

We intentionally advance on start for long-running commands because:
1. It provides accurate "in progress" visibility in `nextai list`
2. It prevents concurrent execution of the same phase
3. Recovery is simple and well-defined (see below)

#### Recovery Paths

**Option 1: Re-run the same command**
Most commands support resume mode. If the ledger is at `implementation` but tasks aren't complete:
```
/nextai-implement $ARGUMENTS
→ "Resuming implementation - X/Y tasks already complete"
```

**Option 2: Use `nextai repair`**
If re-running doesn't work or you want to sync ledger to artifacts:
```bash
nextai repair $ARGUMENTS
→ Detects phase mismatch, offers to sync ledger to artifact state
```

**Option 3: Manual rollback (advanced)**
```bash
nextai advance $ARGUMENTS --to <previous_phase> --force
```

#### Error Message on Failure

When a slash command fails mid-execution, show:
```
Error: Command failed during execution.

The ledger may be out of sync with artifacts.

Recovery options:
1. Re-run this command to resume: /nextai-implement $ARGUMENTS
2. Sync ledger to artifacts: nextai repair $ARGUMENTS
```

#### Advance Timing Rules

To minimize failure impact, some commands advance only on completion:

| Command | Advance On Start? | Advance On Completion? | Rationale |
|---------|-------------------|------------------------|-----------|
| `/nextai-refine` | Yes (`product_refinement`) | Yes (`tech_spec`) | Long-running, show progress |
| `/nextai-implement` | Yes (`implementation`) | No | Long-running, show progress |
| `/nextai-review` | Yes (`review`) | No | Show review in progress |
| `/nextai-testing` | Yes (`testing`) | No | Quick, but tracks state |
| `/nextai-complete` | No | Yes (`complete`) | Final step, only on success |

### Command-Specific Implementation

#### `/nextai-refine`

```markdown
## Pre-flight Checks

Before starting refinement, verify:
1. Feature folder exists in `nextai/todo/$ARGUMENTS`
2. `nextai/todo/$ARGUMENTS/planning/initialization.md` exists

## Phase Validation

Check current phase:
1. Run: `nextai show $ARGUMENTS --json`
2. Expected phase: `created` OR `product_refinement` (resume)

If phase is `created`:
- Normal start - proceed to advance phase

If phase is `product_refinement`:
- Resume mode - continue refinement from current progress
- Log: "Resuming refinement - checking previous progress..."

If phase is `tech_spec`:
- Already refined - warn user and ask to confirm re-run
- "Tech spec already exists. Do you want to re-run refinement?"

If phase is `implementation` or beyond:
- Error: "Feature past refinement. Run /nextai-review $ARGUMENTS or check status with /nextai-show $ARGUMENTS"

## Advance Phase (Start)

Only if phase was `created` (not resuming):
Run: `nextai advance $ARGUMENTS --to product_refinement --quiet`

[... existing refinement work ...]

## Completion

When both phases complete successfully:

1. Advance to tech_spec phase:
   Run: `nextai advance $ARGUMENTS --to tech_spec --quiet`

2. Inform the user:
   ```
   Feature $ARGUMENTS is ready for implementation.

   Next: Run /nextai-implement $ARGUMENTS
   ```
```

#### `/nextai-implement`

```markdown
## Pre-flight Checks

Before starting:
1. Verify `nextai/todo/$ARGUMENTS/spec.md` exists with content
2. Verify `nextai/todo/$ARGUMENTS/tasks.md` exists with content

## Phase Validation

Check current phase:
1. Run: `nextai show $ARGUMENTS --json`
2. Expected phase: `tech_spec` OR `implementation` (resume)

If phase is `tech_spec`:
- Normal start - proceed to advance phase

If phase is `implementation`:
- Resume mode - skip advance, continue from current progress
- Log: "Resuming implementation - X/Y tasks already complete"

If phase is `created` or `product_refinement`:
- Error: "Feature needs refinement. Run /nextai-refine $ARGUMENTS"

If phase is `review` or beyond:
- Error: "Feature past implementation. Run /nextai-review $ARGUMENTS"

## Advance Phase (Start)

Only if phase was `tech_spec` (not resuming):
Run: `nextai advance $ARGUMENTS --to implementation --quiet`

[... existing implementation work ...]

## Completion

When all tasks are complete:

1. DO NOT advance phase yet (review comes next, triggered separately)

2. Inform the user:
   ```
   Implementation complete for $ARGUMENTS.

   Next: Run /nextai-review $ARGUMENTS
   ```
```

#### `/nextai-review`

```markdown
## Pre-flight Checks

Before starting:
1. Verify `nextai/todo/$ARGUMENTS/spec.md` exists
2. Verify `nextai/todo/$ARGUMENTS/tasks.md` exists
3. Count tasks - verify all tasks are checked `- [x]`

## Phase Validation

Check current phase:
1. Run: `nextai show $ARGUMENTS --json`
2. Expected phase: `implementation` OR `review` (resume)

If phase is `implementation`:
- Normal start - proceed to advance phase

If phase is `review`:
- Resume mode - check for existing review.md
- If review.md exists with verdict, show previous result and ask to re-run
- Log: "Resuming review - checking previous review status..."

If phase is before `implementation`:
- Error: "Feature needs implementation. Run /nextai-implement $ARGUMENTS"

If phase is beyond `review`:
- Error: "Feature past review. Check status with /nextai-show $ARGUMENTS"

## Advance Phase (Start)

Only if phase was `implementation` (not resuming):
Run: `nextai advance $ARGUMENTS --to review --quiet`

[... existing review work ...]

## Handle Result

### If PASS:
1. Do NOT advance phase yet (testing comes next, triggered by /nextai-testing)
2. Inform the user:
   ```
   Review PASSED for $ARGUMENTS.

   Next: Run /nextai-testing $ARGUMENTS to log test results
   ```

### If FAIL:
1. Transition back to implementation:
   Run: `nextai advance $ARGUMENTS --to implementation --quiet`

2. Increment retry count:
   Run: `nextai status $ARGUMENTS --retry-increment`

3. Inform the user with issues to fix
```

#### `/nextai-testing`

```markdown
## Pre-flight Checks

Before starting:
1. Verify `nextai/todo/$ARGUMENTS/review.md` exists
2. Parse review.md to verify PASS verdict (check for "## Verdict" section with "PASS")

## Phase Validation

Check current phase AND artifact state:
1. Run: `nextai show $ARGUMENTS --json`
2. Expected ledger phase: `review` OR `testing` (resume)
3. Read `nextai/todo/$ARGUMENTS/review.md` and verify PASS verdict

If phase is `review`:
- Normal start - verify review.md has PASS, then advance

If phase is `testing`:
- Resume mode - continue with testing workflow
- Log: "Resuming testing - checking previous test status..."

If phase is before `review`:
- Error: "Feature needs review. Run /nextai-review $ARGUMENTS"

If phase is beyond `testing`:
- Error: "Feature past testing. Check status with /nextai-show $ARGUMENTS"

If ledger is `review` but review.md missing or has FAIL verdict:
- Error: "Review not passed. Run /nextai-review $ARGUMENTS to complete review."

IMPORTANT: Both conditions must be met - ledger at `review` (or `testing` for resume) AND artifact shows PASS.

## Advance Phase (Start)

Only if phase was `review` (not resuming):
Run: `nextai advance $ARGUMENTS --to testing --quiet`

[... testing workflow: log test results, update testing.md ...]

## Completion

After test results logged:

1. Do NOT advance phase (complete comes next via /nextai-complete)
2. Inform the user:
   ```
   Testing logged for $ARGUMENTS.

   Next: Run /nextai-complete $ARGUMENTS to archive the feature
   ```
```

#### `/nextai-complete`

```markdown
## Pre-flight Checks

Before starting:
1. Verify `nextai/todo/$ARGUMENTS/testing.md` exists
2. Parse testing.md to verify PASS status (check for "Status: pass" or "**Status:** pass")

## Phase Validation

Check current phase AND artifact state:
1. Run: `nextai show $ARGUMENTS --json`
2. Expected ledger phase: `testing`
3. Read `nextai/todo/$ARGUMENTS/testing.md` and verify PASS status

If ledger phase is not `testing`:
- If before `testing`: "Feature needs testing. Run /nextai-testing $ARGUMENTS"
- If `complete`: "Feature already completed."

If ledger is `testing` but testing.md missing or doesn't have PASS status:
- "Testing not passed. Run /nextai-testing $ARGUMENTS to log test results."

IMPORTANT: Both conditions must be met - ledger at `testing` AND artifact shows PASS.

## Advance Phase (On Completion Only)

This command does NOT advance on start - only on successful completion.

[... generate summary, archive feature ...]

## Completion

After successfully archiving the feature:

1. Run CLI to complete:
   Run: `nextai complete $ARGUMENTS`
   (This moves files to done/, updates ledger to `complete`)

2. Inform the user:
   ```
   Feature $ARGUMENTS completed and archived.

   Summary: nextai/done/$ARGUMENTS/summary.md
   ```
```

### CLI Command Updates

The `nextai advance` command already supports `--to <phase>` and handles validation. No changes needed to the CLI.

However, ensure `nextai show <id> --json` outputs parseable JSON with the phase field:

```json
{
  "id": "20251207_my-feature",
  "title": "My Feature",
  "phase": "created",
  "type": "feature",
  ...
}
```

### Files to Modify

1. `.claude/commands/nextai-refine.md` - Add phase validation and advance calls
2. `.claude/commands/nextai-implement.md` - Add phase validation and advance calls
3. `.claude/commands/nextai-review.md` - Add phase validation and advance calls
4. `.claude/commands/nextai-testing.md` - Add phase validation (already has some)
5. `.claude/commands/nextai-complete.md` - Add phase validation and advance calls

### Edge Cases

#### Resuming Mid-Phase

If a user runs `/nextai-implement` when phase is already `implementation`:
- Don't error
- Log: "Resuming implementation - X/Y tasks already complete"
- Continue from where they left off

#### Re-running Completed Phase

If a user runs `/nextai-refine` when phase is `tech_spec`:
- Warn: "Tech spec already exists. Do you want to re-run refinement?"
- If yes, proceed (this is already handled in current commands)
- Don't roll back the phase unless they confirm

#### Force Flag

Consider adding `--force` support to slash commands for edge cases:
- `/nextai-implement --force` would skip phase validation
- Useful for recovery scenarios

## Testing Strategy

### Manual Testing Checklist

1. **Happy path - full flow:**
   - Create feature → phase: `created`
   - Run `/nextai-refine` → phase advances to `product_refinement` (start), then `tech_spec` (completion)
   - Run `/nextai-implement` → phase advances to `implementation` (start), stays at `implementation` (completion)
   - Run `/nextai-review` → phase advances to `review` (start), stays at `review` (completion with PASS)
   - Run `/nextai-testing` → phase advances to `testing` (start), stays at `testing` (completion)
   - Run `/nextai-complete` → phase advances to `complete`

2. **Wrong phase errors:**
   - At `created`, run `/nextai-implement` → should error with "Feature needs refinement. Run /nextai-refine"
   - At `created`, run `/nextai-review` → should error with "Feature needs implementation. Run /nextai-implement"
   - At `created`, run `/nextai-testing` → should error with "Feature needs review. Run /nextai-review"
   - At `implementation`, run `/nextai-refine` → should error with "Feature past refinement"
   - At `review`, run `/nextai-implement` → should error with "Feature past implementation. Run /nextai-review"

3. **Resume scenarios:**
   - At `implementation`, run `/nextai-implement` again → should resume, not error
   - At `tech_spec` with partial tasks, run `/nextai-implement` → should work

4. **Re-run scenarios:**
   - At `tech_spec`, run `/nextai-refine` → should warn and ask for confirmation

5. **Artifact validation (ledger vs file mismatch):**
   - Force ledger to `review` but delete `review.md` → `/nextai-testing` should error "Review not passed"
   - Force ledger to `review` but `review.md` has FAIL verdict → `/nextai-testing` should error "Review not passed"
   - Force ledger to `testing` but `testing.md` missing → `/nextai-complete` should error

6. **Failure/abort scenarios:**
   - Start `/nextai-implement`, abort mid-way → ledger at `implementation` but tasks incomplete
   - Run `nextai repair` → should offer to sync ledger back to `tech_spec`
   - Or re-run `/nextai-implement` → should resume from current progress

## Migration / Backwards Compatibility

Existing features with out-of-sync ledgers can be fixed using:

```bash
nextai repair <id>
```

Or manually with:

```bash
nextai advance <id>  # Run multiple times until synced
```

No breaking changes to CLI commands. Only slash command behavior changes.

## Success Criteria

1. Running `/nextai-refine` on a `created` feature advances ledger to `tech_spec` on completion
2. Running `/nextai-implement` on a `created` feature shows clear error with guidance
3. `nextai list` always shows accurate phases after using slash commands
4. AI review is automatically suggested after `/nextai-implement` completes (because phase is correct)
5. Users never need to manually run `nextai advance` when using slash commands
