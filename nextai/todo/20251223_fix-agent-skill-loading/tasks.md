# Implementation Tasks

## Pre-implementation
- [x] Review all 5 command files in `.claude/commands/`
- [x] Review all 7 agent files in `.claude/agents/`
- [x] Review skill files that will be injected
- [x] Understand current "First Action" patterns in agents

## Part 1: Framework Skill Pre-Loading in Commands

### Update nextai-refine.md
- [x] Locate Phase 1 (product-owner) Task delegation section
- [x] Replace "FIRST ACTION - Load Your Skill" with "## Your Workflow" heading
- [x] Add instruction to inject `refinement-product-requirements/SKILL.md` content
- [x] Locate Phase 2 (technical-architect) Task delegation section
- [x] Replace "FIRST ACTION - Load Your Skill" with "## Your Workflow" heading
- [x] Add instruction to inject `refinement-technical-specs/SKILL.md` content
- [x] Locate Bug investigation (investigator) Task delegation section
- [x] Replace "FIRST ACTION - Load Your Skills" with "## Your Workflow" heading
- [x] Add instruction to inject `testing-investigator/SKILL.md` content
- [x] Locate Bug fix spec (technical-architect) Task delegation section
- [x] Ensure same replacement as Phase 2 (technical-specs skill)
- [x] Save changes to `.claude/commands/nextai-refine.md`

### Update nextai-implement.md
- [x] Locate Task delegation section for developer agent
- [x] Replace "FIRST ACTION - Load Your Skill" with "## Your Workflow" heading
- [x] Add instruction to inject `executing-plans/SKILL.md` content
- [x] Save changes to `.claude/commands/nextai-implement.md`

### Update nextai-review.md
- [x] Locate Task delegation section for reviewer agent
- [x] Replace "FIRST ACTION - Load Your Skill" with "## Your Workflow" heading
- [x] Add instruction to inject `reviewer-checklist/SKILL.md` content
- [x] Save changes to `.claude/commands/nextai-review.md`

### Update nextai-complete.md
- [x] Locate Step 1 Task delegation section for document-writer
- [x] Replace "FIRST ACTION - Load Your Skill" with "## Your Workflow" heading
- [x] Add instruction to inject `documentation-recaps/SKILL.md` content
- [x] Locate Step 4 Task delegation section for document-writer
- [x] Replace "FIRST ACTION - Load Your Skill" with "## Your Workflow" heading
- [x] Add instruction to inject same `documentation-recaps/SKILL.md` content
- [x] Save changes to `.claude/commands/nextai-complete.md`

### Verify nextai-testing.md
- [x] Confirm this command does NOT have agent skill loading (conversational only)
- [x] No changes needed for this command

## Part 2: User Skill Support in Agents

### Update product-owner.md
- [x] Add tools frontmatter section if missing
- [x] Add Skill to tools list in frontmatter
- [x] Locate "First Action" section (lines 9-13)
- [x] Replace with standardized format: "<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->"
- [x] Remove old Skill("refinement-product-requirements") call
- [x] Remove explanatory text about the skill
- [x] Save changes to `.claude/agents/product-owner.md`

### Update technical-architect.md
- [x] Add tools frontmatter section if missing
- [x] Add Skill to tools list in frontmatter
- [x] Locate "First Action" section (lines 9-13)
- [x] Replace with standardized format: "<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->"
- [x] Remove old Skill("refinement-technical-specs") call
- [x] Remove explanatory text about the skill
- [x] Save changes to `.claude/agents/technical-architect.md`

### Update developer.md
- [x] Add tools frontmatter section if missing
- [x] Add Skill to tools list in frontmatter
- [x] Locate "First Action" section (lines 9-13)
- [x] Replace with standardized format: "<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->"
- [x] Remove old Skill("executing-plans") call
- [x] Remove explanatory text about the skill
- [x] Save changes to `.claude/agents/developer.md`

### Update reviewer.md
- [x] Verify Skill tool already in frontmatter tools (no change needed)
- [x] Locate "First Action" section (lines 18-23)
- [x] Replace with standardized format: "<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->"
- [x] Remove old Skill("reviewer-checklist") and Skill("codex") calls
- [x] Remove explanatory text about the skill
- [x] Save changes to `.claude/agents/reviewer.md`

### Update investigator.md
- [x] Add tools frontmatter section if missing
- [x] Add Skill to tools list in frontmatter
- [x] Locate "First Action" section (lines 9-12)
- [x] Replace with standardized format: "<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->"
- [x] Remove old Skill("root-cause-tracing") and Skill("systematic-debugging") calls
- [x] Save changes to `.claude/agents/investigator.md`

### Update document-writer.md
- [x] Add tools frontmatter section if missing
- [x] Add Skill to tools list in frontmatter
- [x] Locate "First Action" section (lines 9-13)
- [x] Replace with standardized format: "<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->"
- [x] Remove old Skill("documentation-recaps") call
- [x] Remove explanatory text about the skill
- [x] Save changes to `.claude/agents/document-writer.md`

### Update ai-team-lead.md
- [x] Add tools frontmatter section if missing
- [x] Add Skill to tools list in frontmatter (include Task and SlashCommand)
- [x] Locate line 21 (after </EXTREMELY_IMPORTANT> block)
- [x] Add new "First Action" section with standardized format
- [x] Use comment placeholder: "<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->"
- [x] Save changes to `.claude/agents/ai-team-lead.md`

## Verification
- [x] Verify all 5 command files have been updated with skill injection instructions
- [x] Verify all 7 agent files have standardized "First Action" sections
- [x] Verify all 7 agent files (except reviewer) have Skill tool in frontmatter
- [x] Verify no hardcoded framework Skill() calls remain in agent files
- [x] Verify comment placeholder format is consistent across all agents

## Code Review Fixes (Retry Implementation)
- [x] Fix Issue 2: Fix reviewer.md frontmatter - move tools list inside YAML block
- [x] Fix Issue 3: Remove old skill workflow text from investigator.md (lines 37-42)
- [x] Verify Issue 1: Confirm command file placeholders match spec (they do - reviewer misunderstood)

## Unit Tests

This project does not have a test framework configured.
