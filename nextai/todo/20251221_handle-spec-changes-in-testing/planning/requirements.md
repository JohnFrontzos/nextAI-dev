# Requirements: Handle Spec Changes in Testing

## Feature Summary
Extend the testing-investigator skill to detect specification changes during failure investigation. When an operator marks a test as FAIL, the Investigator agent analyzes the failure and determines if it's a bug (write investigation report) or a spec change (prompt for approval). This integrates spec change detection into the existing investigator workflow rather than adding a separate agent.

## Scope Definition

### In Scope
- Testing phase only (not implementation, review, or other phases)
- FAIL status triggers Investigator agent (existing flow)
- **Investigator extended** to classify: BUG vs SPEC CHANGE
- If BUG → writes investigation report → return to implementation (existing)
- If SPEC CHANGE → user approval flow with Yes/No/Cancel options
- Reset and overwrite workflow on approval (no archiving)
- Append spec change description to initialization.md
- Metrics tracking for spec change events

### Out of Scope (Future Enhancements)
- Implementation phase spec changes
- Review phase spec changes
- Explicit `--spec-change` flag on commands
- Archiving previous specs before overwrite
- Spec diff viewer
- Separate Product Owner agent for spec change detection (using Investigator instead)

## User Stories

### Primary User Story
**As a** feature operator running manual tests
**I want** the system to detect when test failures indicate spec changes
**So that** I can restart refinement with updated requirements instead of treating spec changes as bugs

### Secondary User Story
**As a** product owner
**I want** visibility into how often specs change during testing
**So that** I can improve the refinement process to catch issues earlier

## Detailed Requirements

### 1. Trigger Integration

**Q1: How does the trigger integrate with existing `/nextai-testing` command?**
**A:** The trigger activates when the operator runs `/nextai-testing <id> --status fail --notes "<description>"`. The existing `triggerInvestigator()` function (currently a placeholder at line 64-76 in `testing.ts`) will be enhanced to invoke the Investigator agent via the testing-investigator skill.

**Integration points:**
- Enhance `triggerInvestigator()` in `src/cli/commands/testing.ts` (lines 64-76)
- Invoke **Investigator agent** (not Product Owner) after FAIL is logged
- Pass failure notes, attachments, spec.md, and testing.md to the agent
- Investigator returns classification: BUG or SPEC_CHANGE

### 2. Investigator Agent Analysis

**Q2: What criteria should the Investigator agent use to classify failures?**
**A:** The Investigator agent analyzes the failure and classifies it as BUG or SPEC_CHANGE:

**IS a spec change (prompt user for approval):**
- Changes agreed-upon behavior/features described in spec.md
- Adds NEW functionality not mentioned in original spec.md
- Requires significant code changes (not single-line fixes)
- Confidence threshold: >70% confident it's a spec change

**IS a bug (write investigation report):**
- Simple fixes like changing sort order or formatting
- Bug fixes that restore original intended behavior from spec.md
- Single-line code changes or minor adjustments
- Code does not match what spec.md describes (implementation error)
- Confidence threshold: <70% spec change confidence → default to bug

**Q3: What information does the Investigator need?**
**A:** The Investigator receives (same as existing skill):
- Failure description from `--notes`
- Current spec.md content
- Current testing.md content
- tasks.md (to understand what was implemented)
- Source code and test files
- Attachments in `attachments/evidence/`

**Q3b: What does the Investigator output?**
**A:** The Investigator outputs:
1. **Classification**: BUG or SPEC_CHANGE
2. **Confidence**: 0-100% confidence in classification
3. **Reasoning**: Why this is a bug or spec change
4. **Investigation Report** (for bugs): Root cause, affected files, fix suggestions
5. **Spec Change Description** (for spec changes): What needs to change in the spec

### 3. Reset Workflow (No Archiving)

**Q4: What happens when spec change is approved?**
**A:** Follow the same pattern as existing `/nextai-refine` re-run behavior:
1. Append spec change description to `initialization.md` (under a new "## Spec Changes" section)
2. Reset phase to `product_refinement`
3. Overwrite existing files when refinement re-runs (requirements.md, spec.md, tasks.md, testing.md)

**No archiving** - this keeps it simple and consistent with current behavior. Previous specs are lost, but the spec change reason is preserved in initialization.md.

**Files affected:**
- `planning/initialization.md` - Appended with spec change description
- `planning/requirements.md` - Overwritten by new refinement
- `spec.md` - Overwritten by new refinement
- `tasks.md` - Overwritten by new refinement
- `testing.md` - Overwritten by new refinement

### 4. User Approval Flow

**Q6: How should the approval prompt be presented?**
**A:** Present a detailed prompt using the existing `selectOption()` pattern from `src/cli/utils/prompts.ts`.

**Prompt format:**
```
Spec change detected in feature <feature-id>

Failure Description:
<failure notes from operator>

Analysis:
<agent's reasoning why this is a spec change>

Confidence: <percentage>%

This will:
1. Append the spec change to initialization.md
2. Reset to product_refinement phase
3. Re-run refinement (overwrites existing specs)

How would you like to proceed?
> Yes - Approve spec change and restart refinement
  No - Treat as bug, return to implementation
  Cancel - Stop and wait for manual input
```

**Q7: What happens for each option?**

**Option: Yes (Approve spec change)**
1. Append spec change description to `initialization.md` (under "## Spec Changes" section)
2. Reset phase to `product_refinement`
3. Log spec change event to metrics
4. Print next command: `/nextai-refine <id>`

**Option: No (Treat as bug)**
1. Continue existing behavior: return to `implementation` phase
2. Log decision to metrics as "declined_spec_change"
3. Print next command: Fix issues and run review again

**Option: Cancel**
1. Exit without changes
2. Feature remains in `testing` phase
3. No metrics logged
4. Print message: "Waiting for manual input. Run `/nextai-testing <id>` when ready."

### 5. Failure Description Requirements

**Q8: What quality of failure description is needed for analysis?**
**A:** Minimum required for effective analysis:
- What was expected (based on spec.md or testing.md)
- What actually happened
- Relevant context (which test case, user flow, etc.)

**Optional but helpful:**
- Steps to reproduce
- Related test cases that also fail
- Screenshots/attachments

**Guidance for operators:**
The command template should include examples of good failure descriptions:
```
Good: "Expected user to be redirected to /dashboard after login per spec section 3.2, but instead stays on /login page. This conflicts with the authentication flow described in spec."

Bad: "Login broken"
```

### 6. Metrics Tracking

**Q9: Where and how should metrics be stored?**
**A:** Create `nextai/metrics/spec-changes.jsonl` at the project root. Use JSON Lines format (one JSON object per line) for easy parsing and appending.

**Metrics schema:**
```json
{
  "timestamp": "2025-12-21T14:30:22.123Z",
  "featureId": "20251221_example-feature",
  "failureDescription": "Expected X but got Y...",
  "agentReasoning": "This requires adding new functionality...",
  "agentConfidence": 0.85,
  "userDecision": "approved|declined|cancelled",
  "originalPhase": "testing"
}
```

### 7. Phase Transition Rules

**Current flow (no spec change detection):**
- FAIL → return to `implementation` phase
- PASS → ready for `/nextai-complete`

**New flow (with integrated Investigator):**
```
FAIL logged
  ↓
Investigator analyzes (reads spec.md, code, failure notes)
  ↓
Investigator classifies: BUG or SPEC_CHANGE?
  ↓
BUG (or <70% confidence) → Write investigation report → Return to implementation
  ↓
SPEC_CHANGE (>70% confidence) → Prompt user
  ↓
User selects:
  - Yes → Append to initialization.md + Reset to product_refinement
  - No → Write investigation report → Return to implementation
  - Cancel → Stay in testing, no changes
```

**Key difference:** If user says "No" to spec change, Investigator still writes a bug report so work isn't lost.

## Integration with Existing Features

### Reusability Analysis

**Q10: What existing features can be reused?**

**Testing-investigator skill:**
- Reuse: `resources/skills/testing-investigator/SKILL.md` - existing investigation methodology
- Extend: Add spec change classification to the investigation output
- The skill already reads spec.md, testing.md, code - perfect for classification

**User prompts:**
- Reuse: `selectOption()` from `src/cli/utils/prompts.ts` (line 31-39)
- Use for Yes/No/Cancel prompt when spec change detected

**Testing command integration:**
- Modify: `triggerInvestigator()` placeholder in `src/cli/commands/testing.ts` (line 64-76)
- Invoke Investigator agent with skill
- Handle classification result (BUG vs SPEC_CHANGE)

**Phase management:**
- Reuse: `updateFeaturePhase()` from `src/core/state/ledger.ts`
- Reset phase to `product_refinement` on approval

**File operations:**
- Append to initialization.md using standard fs operations
- No archive functionality needed

### Changes to Testing-Investigator Skill

**Current skill outputs:**
- Investigation report written to testing.md

**Extended skill outputs:**
1. **Classification**: BUG or SPEC_CHANGE (with confidence %)
2. **Reasoning**: Why classified this way
3. **Investigation Report** (always generated, written to testing.md for bugs)
4. **Spec Change Description** (if SPEC_CHANGE, what needs to change)

**Skill modification approach:**
- Add new section to SKILL.md: "Phase 0: Classification"
- Before deep investigation, quick analysis to classify
- If SPEC_CHANGE with high confidence → return early for user prompt
- If BUG → continue with full investigation report

## Visual Assets

**Q11: Are there mockups or screenshots for the CLI flow?**
**A:** No visual assets provided. The CLI output should follow existing NextAI patterns:
- Use `logger.warn()` for spec change detection
- Use `logger.keyValue()` for structured information
- Use `selectOption()` for the approval prompt
- Use `logger.success()` for confirmation messages

**Example CLI output:**
```
⚠ Spec change detected in feature 20251221_example-feature

Failure Description:
Expected user to be redirected to /dashboard after login per spec
section 3.2, but instead stays on /login page.

Analysis:
The failure description indicates a change to the authentication flow
described in spec.md section 3.2. This requires modifying core user
journey logic, which is a specification change rather than a bug fix.

Confidence: 85%

This will:
1. Append the spec change to initialization.md
2. Reset to product_refinement phase
3. Re-run refinement (overwrites existing specs)

? How would you like to proceed? (Use arrow keys)
❯ Yes - Approve spec change and restart refinement
  No - Treat as bug, return to implementation
  Cancel - Stop and wait for manual input
```

## Edge Cases and Error Handling

### Edge Case 1: Missing spec.md
**Scenario:** Agent tries to analyze but spec.md doesn't exist
**Handling:**
- Log error: "Cannot analyze spec change - spec.md not found"
- Default to "No" (treat as bug)
- Suggest running `/nextai-refine` first

### Edge Case 3: Empty Failure Description
**Scenario:** Operator runs with `--notes ""`
**Handling:**
- Warn: "Failure description is required for spec change analysis"
- Prompt for description or skip analysis
- Default to bug if skipped

### Edge Case 4: User Approval Timeout
**Scenario:** User doesn't respond to prompt
**Handling:**
- Default to Cancel after standard prompt timeout
- Feature stays in testing phase
- No changes made

### Edge Case 5: Multiple Consecutive Spec Changes
**Scenario:** User approves spec change, then testing fails again with another spec change
**Handling:**
- Allow unlimited spec change cycles (no retry limit)
- Each spec change is appended to initialization.md
- Metrics track all events for analysis

## Non-Functional Requirements

### Performance
- Agent analysis should complete within 30 seconds
- Phase reset should be instant
- Metrics logging should not block user interaction

### Reliability
- Metrics must be written before confirming success
- Initialization.md append must complete before phase reset

### Usability
- Clear, concise prompts with context
- Visible progress indicators for long operations
- Helpful error messages with next steps

### Maintainability
- Reuse existing utilities (prompts, phase management)
- Follow NextAI architectural patterns
- Document agent analysis criteria for future tuning

## Acceptance Criteria

### Must Have
1. FAIL status triggers Product Owner agent analysis
2. Agent correctly identifies spec changes vs bugs using defined criteria
3. User approval prompt shows all required information (failure, reasoning, confidence)
4. Approved spec changes append to initialization.md and reset phase to product_refinement
5. Declined spec changes return to implementation (existing behavior)
6. Cancelled requests leave feature unchanged in testing phase
7. All events logged to metrics/spec-changes.jsonl

### Should Have
1. Agent confidence score displayed to user
2. Graceful handling of missing/invalid spec.md
3. Helpful operator guidance for writing good failure descriptions

### Nice to Have
1. Summary report of spec change frequency by feature
2. Agent learning from user approval/decline decisions
3. Configurable confidence threshold (default 70%)

## Technical Constraints

### File Paths
- All paths must be absolute (per agent notes)
- Support cross-platform path handling (Windows + Unix)

### Existing Code
- Must integrate with current testing.ts structure
- Cannot break existing PASS/FAIL flow
- Must preserve initialization.md structure (only append to it)

### Agent Integration
- Product Owner agent receives proper context (spec.md, testing.md, failure notes)
- Agent responses must be parseable (confidence score, reasoning, decision)
- Timeout handling for agent non-response

## Questions and Assumptions

### Confirmed Decisions
- Testing phase only (not other phases) ✓
- FAIL trigger only (not PASS) ✓
- **Investigator agent** handles both bug investigation AND spec change detection ✓
- No separate Product Owner agent for spec change ✓
- No archiving - just overwrite (like existing re-run behavior) ✓
- Append spec change to initialization.md ✓
- Yes/No/Cancel options (No still writes bug report) ✓
- >70% confidence threshold for spec change ✓

### Assumptions
- Operators will provide meaningful failure descriptions (guidance provided)
- Investigator agent can access and analyze spec.md, testing.md, and code
- Users understand that "Yes" restarts refinement from scratch (overwrites existing specs)
- Users understand that "No" still generates a bug investigation report

### Open Questions for Implementation
- Should metrics include hash/diff of spec changes?
- Should the system suggest spec changes proactively based on failure patterns?

## Success Metrics

### Quantitative
- 95% of spec changes correctly identified by agent
- <5% false positives (bugs incorrectly flagged as spec changes)
- 100% of approved spec changes successfully reset phase
- <30 seconds agent analysis time

### Qualitative
- Operators find the failure description guidance helpful
- Users feel confident in agent's spec change recommendations
- Clear understanding of reset/overwrite consequences before approval

## Related Documentation

### Files to Reference
- `nextai/todo/20251221_handle-spec-changes-in-testing/planning/initialization.md` - Original feature request
- `src/cli/commands/testing.ts` - Integration point (triggerInvestigator)
- `src/cli/utils/prompts.ts` - User prompt utilities
- `src/core/state/ledger.ts` - Phase management
- `resources/skills/testing-investigator/SKILL.md` - Skill to extend

### Skills to Modify
- `testing-investigator` - **Extend** to include spec change classification (main change)

### Skills Used in Refinement
- `refinement-questions` - This requirements gathering session
- `refinement-spec-writer` - Next step: technical spec creation

## Next Steps
1. Technical spec writer reviews these requirements
2. Creates spec.md with implementation details (focus on skill extension)
3. Generates tasks.md with specific development tasks
4. Implementation begins with testing-investigator skill modification
