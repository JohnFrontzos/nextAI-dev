---
description: Resume work on a feature - shows where you left off
---

# NextAI Resume: $ARGUMENTS

Help the operator pick up where they left off.

## Run Command

```bash
nextai resume $ARGUMENTS [options]
```

**Arguments:**
- `id` - Feature ID (required if multiple active features)

**Options:**
- `--sync` - Auto-sync ledger (must be explicit)
- `--no-sync` - Do not sync ledger (default)
- `--no-advance` - Do not auto-advance, just show status
- `-f, --force` - Bypass validation errors

If `$ARGUMENTS` is not provided and only one active feature exists:
```bash
nextai resume
```
This will auto-select the single active feature.

**Note:** If multiple features are active and no ID is provided, the command will error with a list of active features.

## Display Context

The CLI outputs the current state. Present it clearly:

```
Resuming: $ARGUMENTS
══════════════════════════════════════════════════════════

Phase: implementation
Last Activity: 2024-12-06 14:20 (2 hours ago)

Progress:
  ✓ Requirements gathered
  ✓ Spec written
  → Tasks: 3/5 complete

Last Actions:
  • Completed: Add login endpoint
  • Completed: Create user model
  • Completed: Setup JWT middleware
  • Pending: Add password reset
  • Pending: Write integration tests

══════════════════════════════════════════════════════════
```

## Suggest Next Action

Based on the phase, provide a clear next step:

| Phase | Suggestion |
|-------|------------|
| `created` | "Ready to start. Run /nextai-refine $ARGUMENTS" |
| `product_refinement` | "Continue answering questions to complete requirements" |
| `tech_spec` | "Continue writing the technical specification" |
| `implementation` | "Continue implementing. X tasks remaining." |
| `review` | "Review complete. Check verdict and run /nextai-testing $ARGUMENTS if PASS" |
| `testing` | "Testing logged. Run /nextai-complete $ARGUMENTS if passed" |
| `complete` | "This feature is done! Start something new with /nextai-create" |

## Quick Actions

Offer shortcuts:
- "Continue implementing" → Start working on next pending task
- "Show full details" → /nextai-show $ARGUMENTS
- "See all features" → /nextai-list
