---
description: Remove a feature from nextai/todo/
---

# NextAI Remove

You are helping the operator remove an unwanted or obsolete feature from the NextAI workflow.

## Your Task

The operator wants to remove a feature from `nextai/todo/`. This is a safety-first operation that moves the feature to `nextai/removed/` instead of deleting it permanently.

## Step 1: Get Feature ID

If `$ARGUMENTS` is provided, use it as the feature ID.
If not, ask: "Which feature would you like to remove? Provide the feature ID."

## Step 2: Run CLI Command

Execute the CLI command to remove the feature:

```bash
nextai remove <id>
```

**Arguments:**
- `<id>` (required) - Feature ID (full or partial match)

**No options available** - Confirmation is always required for safety.

## Step 3: Confirm Removal

The CLI will display feature details and prompt for confirmation:

```
Feature: 20251209_old-feature
Title: Old feature
Type: feature
Phase: implementation
Location: nextai/todo/20251209_old-feature/

This will move the feature to nextai/removed/ for manual cleanup.
Are you sure you want to remove this feature? (y/N)
```

**Show this prompt to the operator clearly.** Let them decide whether to proceed.

## Step 4: Handle Response

### If User Confirms (yes)

The CLI will:
1. Move `nextai/todo/<id>/` → `nextai/removed/<id>/`
2. Remove the feature from the ledger
3. Log a `feature_removed` event to history

Success output:
```
✓ Removed feature: 20251209_old-feature

  Moved to        nextai/removed/20251209_old-feature/
  Ledger          Entry removed
  History         Logged removal event

Note: The feature folder is preserved in nextai/removed/ and can be manually deleted later.
```

### If User Cancels (no)

The CLI will exit with:
```
Removal cancelled.
```

No changes are made to the file system or ledger.

## Error Handling

### Feature Not Found

```
Error: Feature '20251209_missing' not found
```

Verify the feature ID and try again. Use `/nextai-list` to see active features.

### Feature Already Removed

```
Error: Target already exists: nextai/removed/20251209_old-feature/
```

The feature may have already been removed. Check `nextai/removed/` folder.

### Critical Error (Partial State)

If the folder moves but ledger update fails:

```
⚠️  CRITICAL: Feature moved but ledger update failed
Error: [specific error message]

Manual recovery required:
  1. Feature is in: nextai/removed/20251209_old-feature/
  2. Ledger still shows the feature as active
  3. Run: nextai repair
```

Run `nextai repair` to fix inconsistent state.

## Important Notes

1. **Non-Destructive** - Files are moved to `nextai/removed/`, not deleted
2. **Confirmation Required** - No force flag or bypass option exists
3. **Active Features Only** - Only removes features from `nextai/todo/`
4. **Audit Trail** - All removals are logged to history
5. **Manual Cleanup** - The operator can manually delete from `nextai/removed/` later

## When to Use This Command

Use `/nextai-remove` when:
- A feature is no longer needed
- A feature was created by mistake
- A feature is obsolete or superseded
- You want to clean up the active workspace

**Do NOT use** for completed features — use `/nextai-complete` instead.

## Example Workflow

```
User: I want to remove the old authentication feature
AI: I'll help you remove that feature. Let me run the remove command.

> nextai remove 20251208_old-auth

Feature: 20251208_old-auth
Title: Old authentication system
Type: feature
Phase: implementation
Location: nextai/todo/20251208_old-auth/

This will move the feature to nextai/removed/ for manual cleanup.
Are you sure you want to remove this feature? (y/N)

User confirms: yes

✓ Removed feature: 20251208_old-auth

  Moved to        nextai/removed/20251208_old-auth/
  Ledger          Entry removed
  History         Logged removal event

Note: The feature folder is preserved in nextai/removed/ and can be manually deleted later.

AI: The feature has been safely removed from your active workspace.
    All files are preserved in nextai/removed/20251208_old-auth/
    and can be manually deleted when you're ready.
```
