# Requirements: Update Agent Templates

## Product Context

NextAI is a framework that syncs agents and skills to different AI client platforms (Claude Code, OpenCode). The current sync implementation copies files directly without transformation, requiring platform-specific files to be maintained manually.

**Related completed features:**
- `20251223_orchestrator-skill-injection` - Skill injection system
- `20251220_refinement-skills` - Skill structure and naming conventions

## Initial Description

Create separate agent and skill templates for Claude Code and OpenCode platforms with proper frontmatter formats. Update the sync process to generate platform-specific files from a canonical base format.

## Requirements Discussion

### Questions & Answers

**Q1:** Template placement - base template approach vs separate files?
**Answer:** Use a base template format and generate platform-specific files via code during sync. The technical architect recommends Option C: Neutral Base Format with Code Generation.

**Q2:** Skill template scope?
**Answer:** Both skills AND agents need templates for both platforms.

**Q3:** Sync process - detect platforms or generate all?
**Answer:** Sync should detect which platforms are enabled and generate the appropriate format for each.

**Q4:** OpenCode compatibility - use Claude paths or duplicate?
**Answer:** OpenCode supports Claude-compatible skill paths. Only generate in `.claude/skills/` - OpenCode will discover them there. Ensure sync for OpenCode puts agent files in `.opencode/agent/`.

**Q5:** Name validation for OpenCode compliance?
**Answer:** Yes, add validation to warn about non-compliant skill names (must be lowercase, hyphen-separated, 1-64 chars).

**Q6:** Agent field mapping - single source or per-platform?
**Answer:** Single source in `resources/agents/` with neutral base format, transform during sync.

**Q7:** Migration strategy for existing agents?
**Answer:** Rename old files with `.old` extension, write new ones in base format. Migration is in scope.

**Q8:** Model configuration?
**Answer:** Prefer inheritance/default. Omit model field in base format - both platforms support inheritance when model is not specified. Users can override if needed.

**Q9:** OpenCode skill path?
**Answer:** Option A - only generate in `.claude/skills/`, OpenCode will find them there.

**Q10:** Resources vs NextAI folder?
**Answer:** Keep canonical templates in `resources/` (source code). The `nextai/` folder is generated during init & sync.

## Existing Code to Reference

- `src/core/sync/index.ts` - Main sync orchestration
- `src/core/sync/opencode.ts` - OpenCode sync logic
- `src/core/sync/claude.ts` - Claude sync logic
- `src/utils/md.ts` - Markdown/frontmatter utilities
- `resources/agents/*.md` - Current agent templates
- `resources/skills/*/SKILL.md` - Current skill templates

## Visual Assets

Official documentation added to `attachments/reference/`:
- `claude_agent.md` - Claude Code agent template format
- `opencode_agents.mdx` - OpenCode agents documentation
- `opencode_skills.mdx` - OpenCode skills documentation

## Requirements Summary

### Functional Requirements

1. **Base Format Definition**
   - Create NextAI canonical format for agents in `resources/agents/`
   - Create NextAI canonical format for skills in `resources/skills/`
   - Base format should be platform-agnostic and transformable to both targets

2. **Platform Transformers**
   - Implement Claude Code transformer (base → Claude format)
   - Implement OpenCode transformer (base → OpenCode format)
   - Handle field mapping differences (tools list vs object, etc.)

3. **Model Inheritance**
   - Omit model field in base format by default
   - Claude Code: Omit or use `inherit`
   - OpenCode: Omit model (inherits from primary agent)

4. **Sync Process Updates**
   - Parse base format from `resources/`
   - Transform to platform-specific format
   - Write to appropriate directories:
     - Claude: `.claude/agents/`, `.claude/skills/`
     - OpenCode: `.opencode/agent/` (skills via Claude path)

5. **Skill Name Validation**
   - Validate skill names against OpenCode rules
   - Warn on non-compliant names (regex: `^[a-z0-9]+(-[a-z0-9]+)*$`)

6. **Migration**
   - Rename existing agent files to `.old` extension
   - Create new agents in base format

### Scope Boundaries

**In Scope:**
- Define base format schema for agents and skills
- Implement transformers for Claude Code and OpenCode
- Update sync process to use transformers
- Add skill name validation
- Migrate existing agents to new format
- Update existing skills if format changes needed

**Out of Scope:**
- Support for additional platforms (Cursor, Windsurf, etc.) - future work
- Changes to CLI command interface
- Changes to init process (beyond sync updates)
- Documentation updates (handled by /nextai-complete)

### Technical Constraints

- Base format in `resources/` folder (source code)
- Generated files in `.claude/` and `.opencode/` folders
- OpenCode skills use Claude-compatible path (`.claude/skills/`)
- Both platforms support model inheritance via field omission
