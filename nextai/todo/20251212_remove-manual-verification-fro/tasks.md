# Implementation Tasks

## Pre-implementation

- [x] Review current refinement-spec-writer skill structure
- [x] Review current testing command template and implementation
- [x] Review current refine command template
- [x] Identify all locations where testing.md format is referenced

## Core Implementation

### Part 1: Fix tasks.md Generation

- [x] Update `.claude/skills/refinement-spec-writer/SKILL.md` Phase 3 section
  - Add explicit prohibition: "DO NOT create Manual Verification, Manual Testing, or similar sections in tasks.md"
  - Replace arrow notation with explicit "Belongs in" language
  - Clarify that testing strategy belongs in spec.md only

- [x] Update `.nextai/templates/commands/refine.md` tasks.md structure section
  - Add explicit prohibition of manual testing/verification sections
  - Structure as bulleted list for clarity
  - Reference spec.md Testing Strategy as correct location

### Part 2: Add testing.md Generation to Refinement

- [x] Add Phase 4 to `.claude/skills/refinement-spec-writer/SKILL.md`
  - Include testing.md template structure
  - Add Manual Test Checklist section with instructions
  - Add Test Sessions placeholder section
  - Emphasize this is where manual verification belongs

- [x] Update `.nextai/templates/commands/refine.md` completion verification
  - Add testing.md to list of required files
  - Update success message to mention testing.md creation
  - Add testing.md to verification step

- [x] Update skill output documentation
  - Change from "spec.md and tasks.md" to "spec.md, tasks.md, and testing.md"
  - Update Phase 2 instructions for technical-architect

### Part 3: Enhance /testing Command

- [x] Modify `src/cli/commands/testing.ts` to make --status optional
  - Change `requiredOption` to `option` for --status
  - Add logic to handle missing --status (conversational mode)

- [x] Add attachments folder auto-check function
  - Create `checkAttachmentsFolder()` function
  - Check attachments/evidence/ directory
  - Return array of file paths found
  - Handle case where folder doesn't exist

- [x] Add session numbering logic
  - Create `getNextSessionNumber()` function
  - Parse existing testing.md for session headers
  - Return next sequential session number

- [x] Update test entry generation
  - Rename `generateTestEntry()` to `generateTestSessionEntry()`
  - Add session number parameter
  - Update format to match new structure (Session N - timestamp)
  - Add placeholder for investigation report on FAIL

- [x] Integrate investigator trigger on FAIL
  - Create `triggerInvestigator()` function (placeholder for now)
  - Call after logging FAIL session
  - Log investigator invocation
  - Note: Full investigator integration will be completed after command template is ready

- [x] Update testing.md creation logic
  - Modify `appendTestEntry()` to handle new structure
  - Update header format to match new testing.md structure
  - Preserve existing Manual Test Checklist if it exists

### Part 4: Update Testing Command Template

- [x] Redesign `.nextai/templates/commands/testing.md` Step 4 (Gather Test Results)
  - Add logic to check if --status was provided
  - Skip conversational questions if status is provided
  - Keep conversational fallback for when status is missing

- [x] Update Step 5 (Log Results)
  - Add quick PASS flow (no questions)
  - Add FAIL flow with investigator trigger
  - Document auto-check of attachments folder
  - Update CLI command examples

- [x] Update Step 6 (Next Steps)
  - Keep existing PASS → complete flow
  - Keep existing FAIL → implementation flow
  - Add note about investigation report in testing.md

### Part 5: Create Testing Investigator Skill

- [x] Create `.claude/skills/testing-investigator/` directory
  - Use flat structure (direct child of skills/)

- [x] Create `.claude/skills/testing-investigator/SKILL.md`
  - Add skill frontmatter (name, description)
  - Document investigation methodology for test failures
  - Include report template for testing.md
  - Add attachment analysis patterns
  - Document root cause identification steps

- [x] Add investigator integration to testing template
  - Add delegation instructions for investigator
  - Specify investigation report format
  - Include context about test failure and attachments
  - Document how report is written to testing.md

## Unit Tests

- [x] Add tests for session numbering logic
  - Test `getNextSessionNumber()` with empty testing.md
  - Test session number increment with existing sessions
  - Test parsing of existing session headers

- [x] Add tests for attachments folder checking
  - Test `checkAttachmentsFolder()` with files present
  - Test with empty folder
  - Test with non-existent folder

- [x] Add tests for test entry generation
  - Test `generateTestSessionEntry()` format
  - Test PASS session structure
  - Test FAIL session structure with investigation placeholder
  - Verify timestamp format

- [x] Update existing testing command tests
  - Verify --status is now optional
  - Test conversational mode fallback
  - Ensure backward compatibility with existing behavior
