# Feature: NextAI Usage Guidelines Skill

## Original Request

Create a NextAI usage guidelines skill that provides comprehensive guidance on how to use the NextAI system correctly. The skill should cover:
- CLI usage (global nextai command, not local scripts)
- File structure (nextai/ vs .nextai/)
- What files are auto-managed and should not be manually edited
- Relationship between slash commands and CLI commands
- Common pitfalls and mistakes to avoid

The skill should be created in resources/skills/ and integrated into the ai-team-lead agent.

## Type
feature

## Context

### Problem Statement
An AI client attempted to run `node .nextai/cli/nextai.mjs show <feature-id>` which failed because:
1. No CLI code exists in `.nextai/cli/` - this path was hallucinated
2. NextAI uses a global CLI + local configuration architecture
3. The `nextai` command is globally installed via npm, not a local script

The AI made this mistake because:
- The slash commands say `Run: nextai show ...` but don't clarify it's a global command
- The AI saw `.nextai/` directory and assumed there might be a local CLI there
- No explicit guidance exists about what NOT to do

### Solution
Create a skill that can be loaded by agents (especially ai-team-lead) to understand:
1. How to correctly invoke CLI commands
2. The architecture of NextAI (global CLI + local config)
3. What files/folders are auto-managed
4. What should never be manually edited

## Acceptance Criteria
- [ ] Skill file created at `resources/skills/nextai-guidelines/SKILL.md`
- [ ] Skill covers CLI usage guidelines (global install, correct invocation)
- [ ] Skill explains directory structure (`nextai/` vs `.nextai/`)
- [ ] Skill lists auto-managed files that should not be manually edited
- [ ] Skill explains slash commands vs CLI commands relationship
- [ ] Skill documents common pitfalls and how to avoid them
- [ ] ai-team-lead agent updated to reference/use this skill
- [ ] Skill template synced to active projects via nextai-sync

## Notes

### Key Content to Include

1. **CLI Architecture**
   - `nextai` is a global npm package
   - Run commands directly: `nextai show`, `nextai advance`, `nextai list`
   - Never attempt: `node .nextai/cli/...` (doesn't exist)

2. **Directory Structure**
   - `nextai/` - User/AI-managed content (features, docs, templates)
   - `.nextai/` - System config and state (mostly auto-managed)

3. **Auto-managed Files (DO NOT manually edit)**
   - `.nextai/state/ledger.json` - Feature state tracking
   - `.nextai/state/session.json` - Session metadata
   - `.nextai/metrics/` - Performance metrics

4. **Slash Commands vs CLI**
   - Slash commands (e.g., `/nextai-refine`) - AI orchestration prompts
   - CLI commands (e.g., `nextai advance`) - State management tools
   - Slash commands often call CLI commands internally

5. **Common Pitfalls**
   - Don't manually edit ledger.json
   - Don't create local CLI scripts in .nextai/
   - Don't confuse nextai/ (content) with .nextai/ (config)
   - Always use global `nextai` command for CLI operations

## Attachments
- Reference: See `.claude/commands/nextai-*.md` for current slash command patterns
- Reference: See `resources/templates/` for template structure
