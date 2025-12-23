# Implementation Tasks

## Pre-implementation
- [x] Review the nextai-guidelines skill content one final time
- [x] Confirm the file path to be deleted
- [x] Review ai-team-lead.md structure to identify insertion point

## Core Implementation

### Delete nextai-guidelines Skill
- [x] Delete `resources/skills/nextai-guidelines/SKILL.md`
- [x] Delete `resources/skills/nextai-guidelines/` directory
- [x] Verify no other files reference this skill

### Update ai-team-lead Agent
- [x] Open `resources/agents/ai-team-lead.md`
- [x] Add "NextAI Workflow" section after "Project Context" section (around line 50)
- [x] Include the workflow context with slash command guidance
- [x] Ensure formatting is consistent with rest of document

### Update Phase Skills to Prompt Next Command

#### Update refinement-product-requirements
- [x] Open `resources/skills/refinement-product-requirements/SKILL.md`
- [x] Add "Next Steps" section at end
- [x] Prompt to run `/nextai-refine <id>` to continue to technical specs

#### Update refinement-technical-specs
- [x] Open `resources/skills/refinement-technical-specs/SKILL.md`
- [x] Add "Next Steps" section at end
- [x] Prompt to run `/nextai-implement <id>` to start implementation

#### Update executing-plans
- [x] Open `resources/skills/executing-plans/SKILL.md`
- [x] Add "Next Steps" section at end
- [x] Prompt to run `/nextai-review <id>` to trigger code review

#### Update reviewer-checklist
- [x] Open `resources/skills/reviewer-checklist/SKILL.md`
- [x] Add "Next Steps" section at end
- [x] Prompt to run `/nextai-testing <id>` if PASS, or back to implement if FAIL

## Verification
- [x] Grep for any remaining references to "nextai-guidelines" in resources/
- [x] Verify all phase skills now have "Next Steps" sections
- [x] Read through updated ai-team-lead.md for clarity
