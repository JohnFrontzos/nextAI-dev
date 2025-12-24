# Fix Phase-Specific Skill Injection Mechanism

## Context

NextAI's current approach to phase-specific skill injection is experiencing reliability issues. The system uses an "orchestrator pre-loads and embeds" pattern where slash commands (orchestrators) are supposed to:

1. Read the skill file content (e.g., `.claude/skills/reviewer-checklist/SKILL.md`)
2. Inject the full content into the Task prompt under `## Your Workflow`
3. Delegate to the subagent with the skill embedded in the prompt

## The Problem

From the `/nextai-review` command template (line 97):
```markdown
[Insert full content of .claude/skills/reviewer-checklist/SKILL.md here]
```

**This is a placeholder instruction, not actual functionality.** The orchestrator doesn't actually read and inject the skill content—it just passes this literal text to the subagent, who may or may not understand what to do with it.

## Evidence

From the recent commit (04fc82e "feat: add orchestrator-driven skill injection system"):
- Changed all command templates to include `[Insert full content of ...]` instructions
- This was intended to fix the previous "FIRST ACTION - Load Your Skill" pattern
- But it appears the orchestrator still doesn't actually perform the skill loading

The reviewer agent was told "Use the reviewer-checklist skill" but:
- The skill content wasn't included in the prompt
- The agent doesn't automatically know to read `.claude/skills/reviewer-checklist/SKILL.md`
- The review may have been done without the proper checklist/process

## Current State

**Phase-specific skills that need to be injected:**
- `reviewer-checklist` → reviewer agent (during `/nextai-review`)
- `executing-plans` → developer agent (during `/nextai-implement`)
- `refinement-product-requirements` → product-owner agent (during `/nextai-refine`)
- `refinement-technical-specs` → technical-architect agent (during `/nextai-refine`)
- `documentation-recaps` → document-writer agent (during `/nextai-complete`)
- `testing-investigator` → investigator agent (during `/nextai-testing`)

**Current mechanism:**
- Command templates include `[Insert full content of .claude/skills/X/SKILL.md here]`
- This is a literal instruction, not code that executes
- The orchestrator (Claude running the slash command) may or may not understand this instruction
- No enforcement, no validation, no guarantee

## What Needs Clarification

1. **User Perspective**: How should this work from the user's point of view?
   - When they run `/nextai-review`, should they expect the reviewer to automatically have the checklist?
   - Should there be any indication that skills are being loaded?
   - What happens if a skill file is missing?

2. **Reliability Requirements**: What level of reliability is needed?
   - Must phase skills ALWAYS be loaded (100% reliability)?
   - Or is it okay if agents sometimes miss the skills?
   - What's the impact of a review being done without the reviewer-checklist?

3. **Current Behavior**: What actually happens now?
   - Does the orchestrator read and embed the skills?
   - Or does it pass the `[Insert full content...]` instruction to the subagent?
   - How do we know if skills were successfully loaded?

4. **Architecture Constraints**: What are the limitations?
   - Claude Code doesn't have a "pre-processing" step for prompts
   - The orchestrator is just another Claude instance following instructions
   - There's no guarantee it will read files before delegation
   - MCP doesn't provide skill injection capabilities

5. **Alternative Approaches**: What other options exist?
   - Have agents explicitly load skills via Skill() tool calls (previous approach)
   - Bake skill content directly into command templates (static, no updates)
   - Use a different delegation mechanism (not Task tool)
   - Create a pre-processing layer (requires architecture changes)
   - Accept that skills are optional guidance, not mandatory

6. **Scope**: What's actually broken vs what's by design?
   - Is the `[Insert full content...]` instruction supposed to work?
   - Or was this always intended to be a manual step during template creation?
   - Is this a bug or a misunderstanding of how the system works?

## Out of Scope

- User-defined custom skills (separate concern)
- General agent behavior improvements
- Alternative workflow systems

## Success Criteria

By the end of requirements gathering, we should know:
- The intended user experience for skill loading
- The reliability requirements (must-have vs nice-to-have)
- What actually happens now vs what should happen
- The constraints we must work within
- Whether this is solvable within current architecture
- What the right solution approach is (not the implementation, just the approach)
