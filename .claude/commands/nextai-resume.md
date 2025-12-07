---
description: Resume work on a feature - shows where you left off
---

Use the Skill tool to load NextAI skills when needed.

# NextAI Resume: $ARGUMENTS

Help the operator pick up where they left off.

## Run Command

```bash
nextai resume $ARGUMENTS
```

If `$ARGUMENTS` is not provided:
```bash
nextai resume
```
This will show the most recently active feature.

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
