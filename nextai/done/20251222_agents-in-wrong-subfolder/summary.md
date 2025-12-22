# Feature Summary: Agents in Wrong Subfolder

## Overview

Fixed a bug where agent files were being placed in `.claude/agents/nextai/` instead of directly in `.claude/agents/`, preventing Claude Code from recognizing NextAI agents. This was a simple configuration error that affected both the `nextai sync` and `nextai init` commands.

## Key Changes

### Configuration Fix
- **File:** `src/core/sync/claude-code.ts`
- **Change:** Updated `agentsDir` from `'agents/nextai'` to `'agents'` (line 12)
- **Impact:** Agents now placed in correct flat directory structure as expected by Claude Code

### Test Updates
- **Unit tests:** Updated `tests/unit/core/sync/claude-code.test.ts` (lines 41-46, 60-69)
- **Integration tests:** Updated `tests/integration/cli/sync.test.ts` (lines 74, 90)
- All tests now verify correct directory path `.claude/agents/` instead of nested path

## Implementation Notes

### Root Cause
The `ClaudeCodeConfigurator` class had `agentsDir: 'agents/nextai'` which created a nested directory structure. Claude Code expects agents directly in `.claude/agents/` without subdirectories. The OpenCode integration already had the correct configuration (`agentsDir: 'agent'`), indicating this was a Claude Code-specific issue.

### Migration Handling
No automatic migration implemented. For users who previously ran sync with the buggy version:
- Next sync automatically places agents in correct location
- Old files in `.claude/agents/nextai/` become orphaned but harmless
- Users can manually delete orphaned directory if desired

### Verification
- Manual testing confirmed agents now appear in `.claude/agents/`
- All unit tests pass with updated expectations
- Integration tests verify end-to-end sync behavior
- OpenCode integration remains unaffected

## Files Modified

1. `src/core/sync/claude-code.ts` - Configuration fix
2. `tests/unit/core/sync/claude-code.test.ts` - Unit test updates
3. `tests/integration/cli/sync.test.ts` - Integration test updates

## Related Documentation

No documentation updates required - this is an internal bug fix that corrects existing behavior to match expected functionality.

## Test Results

- Unit tests: PASS
- Integration tests: PASS
- Manual verification: PASS - agents correctly placed in `.claude/agents/`
- Coverage maintained at 70%+ for affected files
