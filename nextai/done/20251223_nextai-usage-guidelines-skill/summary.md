# Feature Summary: NextAI Usage Guidelines Skill

## Overview

Created a comprehensive usage guidelines skill to prevent AI agents from making common mistakes when working with NextAI. The skill addresses a critical issue where an AI client attempted to run a non-existent local CLI script (`node .nextai/cli/nextai.mjs`) due to confusion about NextAI's architecture.

The skill provides essential knowledge about:
- CLI architecture (global npm install, not local scripts)
- Directory structure distinction (nextai/ vs .nextai/)
- Auto-managed files that must not be manually edited
- Relationship between slash commands and CLI commands
- Common pitfalls with Do/Don't examples

## Key Changes

### New Skill Created
- **File**: `resources/skills/nextai-guidelines/SKILL.md`
- **Purpose**: Educate AI agents about proper NextAI usage
- **Target Audience**: Primarily ai-team-lead agent, extensible to other agents
- **Design**: AI client agnostic (supports both Claude Code and OpenCode)

### Agent Integration
- **File Modified**: `.nextai/agents/ai-team-lead.md`
- **Change**: Added Skills section with `Skill("nextai-guidelines")` reference
- **Timing**: Loaded at agent initialization for consistent availability

### Content Highlights

**CLI Architecture Section**
- Explains NextAI is globally installed via npm (`@frontztech/nextai-dev`)
- Provides practical examples of common commands
- Explicitly warns against attempting local script execution
- Clarifies command invocation pattern: `nextai <command> [options]`

**Directory Structure Section**
- Clear separation: `nextai/` (user/AI workspace) vs `.nextai/` (system state)
- Visual directory trees for both structures
- Guidance on where to work and what to avoid

**Auto-Managed Files Section**
- Comprehensive 9-row table listing all CLI-managed files
- Columns: File/Directory, Purpose, Why Not to Edit
- Covers state files, metrics, config, synced resources
- Prominent DO NOT EDIT warnings throughout

**Slash Commands vs CLI Relationship Section**
- 11-row comparison table mapping slash commands to CLI commands
- Explains orchestration (slash) vs execution (CLI) model
- Memorable analogy: "CLI = The engine, Slash commands = The steering wheel"

**Common Pitfalls Section**
- 10-row Do/Don't table with practical examples
- Directly addresses the original error scenario
- Covers state editing, directory confusion, sync expectations

**Key Reminders Section**
- Consolidates critical points by category
- Provides "When in Doubt" escalation guidance
- Reinforces AI client support (Claude Code and OpenCode)

## Implementation Notes

### Design Decisions

1. **AI Client Agnostic Language**: Uses "AI client" terminology instead of assuming Claude-only usage, ensuring compatibility with both Claude Code and OpenCode users.

2. **Skill Loading Pattern**: Integrated into ai-team-lead agent initialization to ensure knowledge is available throughout all workflow phases, rather than loaded on-demand.

3. **Error Prevention Focus**: Content structured to prevent common mistakes before they happen, rather than just documenting correct usage.

4. **Table Format for Clarity**: Heavy use of tables (auto-managed files, slash command mapping, Do/Don't examples) for scannable, actionable guidance.

5. **No Exhaustive Documentation**: Focused on practical examples and common commands rather than complete CLI parameter reference, matching the skill's educational purpose.

### Testing Results

- All manual test checklist items passed (56/56)
- Code review: PASS (no blocking issues found)
- Manual testing: 3 sessions total
  - Session 1: PASS (initial skill file validation)
  - Session 2: FAIL (agent integration missing, subsequently fixed)
  - Session 3: PASS (complete validation)

### Integration Quality

The skill successfully:
- Prevents the original error scenario (local CLI script execution)
- Provides clear warnings about auto-managed files
- Clarifies NextAI architecture for AI agents
- Maintains consistency with existing skill patterns
- Supports both Claude Code and OpenCode workflows

## Related Documentation

### Files Created
- `resources/skills/nextai-guidelines/SKILL.md` (215 lines)

### Files Modified
- `.nextai/agents/ai-team-lead.md` (added Skills section, lines 30-34)

### Reference Materials
- Other skills: `systematic-debugging/`, `refinement-product-requirements/`, `reviewer-checklist/`
- Slash commands: `.claude/commands/nextai-*.md`
- Sync mechanism: `src/core/sync/` (base, claude-code, opencode configurators)

### Next Steps

After archiving this feature:
1. Run `nextai sync` to propagate skill to active projects
2. Skill will be available in `.claude/skills/` or `.opencode/agent/` depending on AI client
3. ai-team-lead agent will automatically load skill at initialization
4. Monitor for any additional common mistakes that should be added to the skill

## Impact

This skill addresses a fundamental knowledge gap that led to execution errors. By loading it at ai-team-lead initialization, all NextAI workflows benefit from consistent understanding of:
- How to properly invoke CLI commands
- What files are safe to modify
- The relationship between slash commands and CLI operations
- The separation between user content and system state

The skill's AI client agnostic design ensures it serves both Claude Code and OpenCode users equally, supporting NextAI's multi-client architecture.
