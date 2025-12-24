# Requirements: Skill Placeholder Injection at Sync Time

## Product Context

### From Product Documentation

**NextAI Overview:**
NextAI is a Generate + Delegate workflow orchestrator that adds a 7-phase structured workflow to AI coding assistants. It manages feature lifecycle while delegating AI work to the user's existing AI client (Claude Code/OpenCode). The system uses agents (Product Owner, Developer, Reviewer, etc.) and skills (step-by-step methodologies) to guide work through phases.

**Architecture:**
- **Generate + Delegate**: NextAI generates slash commands, user's AI client handles LLM interactions
- **Sync System**: Templates in `.nextai/` are synced to AI client directories (`.claude/` or `.opencode/`)
- **Transformer Pattern**: Existing transformers convert base formats to client-specific formats (see `src/core/sync/transformers/agent.ts`)

**Relevant Completed Features:**
- **20251209_version-aware-auto-update-sync** - Established version-aware sync with resource management patterns
- **20251223_nextai-usage-guidelines-skill** - Recent skill addition demonstrating skill integration workflow

### From Related Iterations

This is the third iteration addressing the skill loading problem:

1. **20251223_fix-agent-skill-loading** - Research phase, identified pre-sync embedding as recommended solution
2. **20251224_update-agent-templates** - Attempted explicit skill loading in agent definitions
3. **20251224_skill-placeholder-injection** (current) - Final solution to eliminate runtime variability

## Initial Description

**Problem:** Command templates in `resources/templates/commands/*.md` contain placeholders like:
```
[Insert full content of .claude/skills/reviewer-checklist/SKILL.md here]
```

These placeholders expect Claude (as orchestrator) to read skill files and embed content when delegating to subagents. This is unreliable - Claude sometimes:
- Passes the literal placeholder text instead of reading the file
- References the skill by name without including the content
- Forgets to include the skill content entirely

This breaks phase-specific workflows because subagents don't receive the detailed checklists, processes, and methodologies they need.

**Proposed Solution:** At `nextai sync` time, transform skill placeholders into actual embedded content in `src/core/sync/claude-code.ts`.

**Affected Commands:**
- `refine.md` - refinement-product-requirements, refinement-technical-specs, testing-investigator
- `review.md` - reviewer-checklist
- `implement.md` - executing-plans
- `complete.md` - documentation-recaps

**Current Evidence:**
Grep found 8 placeholder instances across 4 command templates in `resources/templates/commands/`.

## Requirements Discussion

### Questions & Answers

Based on the initialization document and related iterations, I have some clarifying questions:

**Q1: Placeholder Pattern Scope**
The initialization document shows placeholders referencing `.claude/skills/` paths, but the sync system processes templates before they reach client directories. I assume the regex pattern should match the current `.claude/skills/` format in templates, and the transformer will resolve skills from `resources/skills/` (source of truth). Is that correct, or should we update template placeholders to reference `.nextai/skills/` first?

**Answer:** Yes - match `.claude/skills/` in templates, resolve from `resources/skills/`.

**Q2: OpenCode Compatibility**
The sync system supports both Claude Code and OpenCode. I assume the skill placeholder transformation should work for both clients (same transformation, applied in both `claude-code.ts` and `opencode.ts`). Is that correct, or is this Claude Code specific?

**Answer:** Yes - both platforms. OpenCode reads skills from `.claude/skills/` (from previous iteration 20251224_update-agent-templates).

**Q3: Transformation Timing**
Looking at `claude-code.ts`, command templates are processed in the `generateCommands()` method via `transformCommandTemplate()`. I assume the skill placeholder transformation should be added to this existing `transformCommandTemplate()` method. Is that correct, or should we create a separate transformation step?

**Answer:** Yes - add to existing `transformCommandTemplate()` method.

**Q4: Missing Skill Handling**
The initialization shows a warning for missing skills (`console.warn`). I assume if a skill file doesn't exist, we should:
- Log a warning to console
- Keep the placeholder in the generated command
- Continue processing other placeholders

Is that correct, or should we fail the sync operation when skills are missing?

**Answer:** Warn and continue (from previous iteration error handling pattern).

**Q5: Multiple Placeholder Instances**
Some commands have multiple skill placeholders (e.g., `refine.md` has 4 instances). I assume all placeholders in a single command should be replaced in one pass using `String.replace()` with a global regex flag. Is that correct, or should we process them sequentially?

**Answer:** Yes - single-pass global regex with `/g` flag.

**Q6: Skill Content Format**
When embedding skill content, I assume we should:
- Read the raw SKILL.md content without transformation
- Preserve all markdown formatting (headers, lists, code blocks)
- No special escaping or wrapping needed

Is that correct, or should the embedded content receive any special formatting?

**Answer:** Yes - raw markdown content, no transformation.

**Q7: Testing Strategy**
I assume testing should include:
- Unit tests for the transformation function with mock skill content
- Integration tests verifying actual skill files are embedded correctly
- Manual testing by running `nextai sync` and inspecting generated commands

Is that correct, or are there specific test scenarios you want to prioritize?

**Answer:** Yes - unit tests for transformer + manual sync verification.

**Q8: Backward Compatibility**
After this change, generated command files will have embedded skill content instead of placeholders. I assume:
- Existing projects should run `nextai sync` to get updated commands
- No migration script needed (sync handles it)
- Version-aware auto-update will handle propagation

Is that correct, or do we need a migration strategy?

**Answer:** Yes - just run `nextai sync`, no migration script needed (from previous iteration).

### Existing Code to Reference

**Reusability Check:**
Are there existing features or components with similar patterns we should reference? For example:

- **Agent Transformer** (`src/core/sync/transformers/agent.ts`) - Already has a transformer pattern for converting base formats
- **Version-aware Sync** (feature 20251209) - Has resource management patterns we might reuse
- **Skill Sync Logic** (`claude-code.ts:syncSkills()`) - Already handles skill file reading and transformation

Should we follow the agent transformer pattern (separate file in `transformers/`) or keep it inline in `claude-code.ts`?

**Answer:** Use transformer pattern in `src/core/sync/transformers/` (established pattern from previous iteration).

## Visual Assets

None required - this is a backend sync transformation.

## Requirements Summary

### Functional Requirements

1. **Placeholder Detection**: Detect placeholders matching `[Insert full content of .claude/skills/<skill-name>/SKILL.md here]`
2. **Skill Resolution**: Resolve skill content from `resources/skills/<skill-name>/SKILL.md`
3. **Content Embedding**: Replace placeholder with raw skill content (preserve markdown)
4. **Multi-platform Support**: Apply transformation in both `claude-code.ts` and `opencode.ts`
5. **Error Handling**: Warn on missing skills, keep placeholder, continue processing

### Scope Boundaries

**In Scope:**
- Add skill placeholder transformation to `transformCommandTemplate()`
- Create transformer in `src/core/sync/transformers/`
- Handle multiple placeholders per file (global regex)
- Unit tests for transformer function
- Manual testing via `nextai sync`

**Out of Scope:**
- Migration scripts (sync handles it)
- Changes to placeholder format in templates
- Changes to skill file structure
