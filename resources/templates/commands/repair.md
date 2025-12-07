---
description: Diagnose and fix issues with NextAI state
---

# NextAI Repair: $ARGUMENTS

Diagnose and repair issues with NextAI state or feature artifacts.

## Run Command

For a specific feature:
```bash
nextai repair $ARGUMENTS [options]
```

For overall health check:
```bash
nextai repair [options]
```

**Arguments:**
- `id` - Feature ID (repairs specific feature if provided)

**Options:**
- `--check-only` - Only check, don't fix (default if no --apply)
- `--apply` - Apply automatic fixes
- `-v, --verbose` - Show detailed checks

**Exit Codes:**
- `0` - No issues found, or issues were fixed successfully
- `1` - Issues found (without --apply), or errors occurred

## Display Results

### Health Check (no arguments)

```
NextAI Health Check
══════════════════════════════════════════════════════════

Configuration:
  ✓ .nextai/config.json valid
  ✓ .nextai/profile.json valid
  ✓ Agents: 7 loaded
  ✓ Skills: 7 loaded

State:
  ✓ Ledger: 5 features tracked
  ✓ History: 142 events logged
  ✓ Session: Valid

Client Sync:
  ✓ Claude Code: In sync
  ○ OpenCode: Not configured

Features:
  ✓ 20251206_add-user-auth: Healthy
  ⚠ 20251205_fix-login-bug: Missing review.md (phase: review)
  ✓ 20251204_refactor-api: Healthy

══════════════════════════════════════════════════════════
Issues found: 1
Run: nextai repair 20251205_fix-login-bug --fix
```

### Feature Repair (with ID)

```
Repairing: 20251205_fix-login-bug
══════════════════════════════════════════════════════════

Checking artifacts...
  ✓ planning/initialization.md
  ✓ planning/requirements.md
  ✓ spec.md
  ✓ tasks.md
  ✗ review.md (missing, but phase is 'review')

Checking ledger...
  ⚠ Phase mismatch: ledger says 'review' but review.md missing

Suggested fix:
  Option 1: Roll back phase to 'implementation'
  Option 2: Create empty review.md template

══════════════════════════════════════════════════════════
```

## Applying Fixes

If issues are found that can be automatically fixed, run:
```bash
nextai repair $ARGUMENTS --apply
```

The `--apply` flag is required to apply fixes. Without it, the command will only report issues and exit with code 1.

For AI-driven workflows, always use `--apply` to fix issues automatically:
```bash
nextai repair $ARGUMENTS --apply
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Missing artifact | Interrupted workflow | Create template or roll back |
| Phase mismatch | Manual file deletion | Sync phase to artifacts |
| Ledger corruption | Manual editing | Rebuild from artifacts |
| Orphan folder | Ledger entry deleted | Add to ledger or delete folder |
