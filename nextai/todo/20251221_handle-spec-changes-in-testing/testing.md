# Testing

## Manual Test Checklist

### Core Workflow Tests

- [ ] **Spec Change Detected and Approved**
  - Create a test feature and advance to testing phase
  - Run `/nextai-testing <id> --status fail --notes "Expected user redirect to dashboard per spec 3.2, but stays on login page. This requires changing the authentication flow."`
  - Verify Product Owner agent analysis triggers
  - Verify approval prompt displays with:
    - Failure description
    - Agent reasoning
    - Confidence score (should be >70%)
    - Consequences (3 numbered steps)
  - Select "Yes" and verify:
    - Spec change appended to `planning/initialization.md` under "## Spec Changes" section
    - Change number auto-incremented correctly
    - Session number included in change entry
    - Date stamp included
    - Feature phase reset to product_refinement
    - spec-changes.jsonl logged with "approved" decision
    - Instructions displayed: "Run `/nextai-refine <id>`"

- [ ] **Spec Change Detected and Declined**
  - Trigger spec change with description indicating spec change
  - Verify agent detects spec change (>70% confidence)
  - Verify approval prompt appears
  - Select "No" and verify:
    - No changes to initialization.md
    - Feature phase changes to implementation (existing FAIL behavior)
    - spec-changes.jsonl logged with "declined" decision
    - Message: "Treating as bug. Fix issues and run review again."

- [ ] **Spec Change Detected and Cancelled**
  - Trigger spec change with description indicating spec change
  - Verify approval prompt appears
  - Select "Cancel" and verify:
    - No changes to initialization.md
    - Feature phase stays in testing
    - No metrics logged
    - Message: "No action taken. Feature remains in testing phase."

- [ ] **Regular Bug (NOT Spec Change)**
  - Run `/nextai-testing <id> --status fail --notes "Login button has wrong color - should be blue per spec section 2.1"`
  - Verify agent analyzes and determines NOT a spec change (≤70% confidence)
  - Verify NO approval prompt shown
  - Verify standard FAIL behavior: return to implementation phase
  - Verify no initialization.md changes
  - Verify no spec-changes.jsonl entry

### Initialization.md Append Tests

- [ ] **First Spec Change Appended**
  - Feature has no previous spec changes
  - Trigger and approve spec change
  - Open `planning/initialization.md`
  - Verify new section created: "## Spec Changes"
  - Verify entry format: "### Change 1 - Session N (YYYY-MM-DD)"
  - Verify failure description included
  - Verify proper markdown formatting

- [ ] **Multiple Spec Changes Auto-Increment**
  - Approve first spec change (creates Change 1)
  - Complete refinement, advance to testing again
  - Trigger and approve second spec change
  - Verify entry created: "### Change 2 - Session M (YYYY-MM-DD)"
  - Verify both changes preserved in initialization.md
  - Verify correct numbering (1, 2, not duplicate 1)

- [ ] **Session Number Correctness**
  - Trigger spec change on Session 3
  - Verify change entry shows "Session 3"
  - Verify session number extracted from testing.md correctly

- [ ] **Date Format Verification**
  - Trigger and approve spec change
  - Verify date in format YYYY-MM-DD (e.g., 2025-12-21)
  - Verify date matches current date

### Metrics Logging

- [ ] **Approved Spec Change Logged**
  - Trigger and approve spec change
  - Open `nextai/metrics/spec-changes.jsonl`
  - Verify last line is valid JSON
  - Verify contains:
    - timestamp: ISO format
    - featureId: correct ID
    - failureDescription: matching input
    - agentReasoning: agent's explanation
    - agentConfidence: number between 0 and 100
    - userDecision: "approved"
    - originalPhase: "testing"

- [ ] **Declined Spec Change Logged**
  - Trigger spec change and select "No"
  - Check spec-changes.jsonl
  - Verify entry with userDecision: "declined"
  - Verify all fields present

- [ ] **Cancelled Spec Change NOT Logged**
  - Trigger spec change and select "Cancel"
  - Check spec-changes.jsonl
  - Verify no new entry added

- [ ] **JSONL Format Valid**
  - After multiple spec change events
  - Verify each line is valid JSON
  - Verify no trailing commas or malformed data
  - Test with: `cat spec-changes.jsonl | jq .` (should parse all lines)

- [ ] **Metrics Directory Created**
  - Delete `nextai/metrics/` directory
  - Trigger and approve spec change
  - Verify `nextai/metrics/` directory created
  - Verify spec-changes.jsonl created inside

### Edge Cases and Error Handling

- [ ] **Missing spec.md**
  - Delete `spec.md` before triggering FAIL
  - Run `/nextai-testing <id> --status fail --notes "test"`
  - Verify error logged: "Cannot analyze spec change - spec.md not found"
  - Verify NO prompt shown
  - Verify default to bug flow (return to implementation)
  - Verify suggestion to run `/nextai-refine` first

- [ ] **Empty Failure Description**
  - Run `/nextai-testing <id> --status fail --notes ""`
  - Verify warning: "Failure description required for spec change analysis"
  - Verify NO agent analysis triggered
  - Verify default to bug flow
  - Verify no spec-changes.jsonl entry

- [ ] **Default Failure Description ("Logged via CLI")**
  - Run `/nextai-testing <id> --status fail` (no --notes)
  - Verify notes default to "Logged via CLI"
  - Verify analysis skipped (treated as empty)
  - Verify default to bug flow

- [ ] **Missing initialization.md**
  - Delete `planning/initialization.md`
  - Trigger spec change and approve
  - Verify error: "Cannot append spec change - initialization.md not found"
  - Verify suggestion to run `nextai repair <id>`
  - Verify no phase change
  - Verify no metrics logged

- [ ] **Missing testing.md**
  - Delete `testing.md` before triggering FAIL
  - Trigger spec change
  - Verify analysis continues with limited context
  - Verify prompt can still appear if confidence >70%
  - Verify graceful handling (no crash)

- [ ] **Agent Analysis Timeout**
  - Mock agent to delay response >30 seconds
  - Trigger spec change
  - Verify timeout after 30 seconds
  - Verify warning logged: "Spec change analysis failed - treating as bug"
  - Verify default to bug flow
  - Verify no prompt shown

- [ ] **Agent Response Parsing Error**
  - Mock agent to return malformed response
  - Trigger spec change
  - Verify error handling: default to bug flow
  - Verify warning logged
  - Verify no crash

### Phase Validation

- [ ] **Spec Change Only in Testing Phase**
  - Ensure feature is in testing phase
  - Trigger spec change successfully
  - Verify workflow completes
  - (Note: Implementation should validate phase is "testing")

- [ ] **Multiple Consecutive Spec Changes**
  - Approve first spec change (Change 1 in initialization.md)
  - Complete refinement and advance to testing
  - Trigger second spec change (same feature)
  - Approve second spec change
  - Verify Change 2 appended to initialization.md
  - Verify both changes preserved
  - Verify metrics has 2 entries for this feature
  - Verify no retry_count increment (not a retry, intentional restart)

### Integration with Refinement

- [ ] **Re-refinement After Spec Change**
  - Trigger and approve spec change
  - Run `/nextai-refine <id>`
  - Verify refinement process starts from product_refinement phase
  - Verify Product Owner agent has access to initialization.md (including Spec Changes section)
  - Verify new requirements.md generated
  - Verify new spec.md generated after tech_spec phase
  - Verify existing specs were overwritten

- [ ] **Spec Changes Section Visible to Product Owner**
  - Add spec change to initialization.md
  - Run refinement
  - Verify Product Owner agent can read the Spec Changes section
  - Verify refinement accounts for the spec change context

### Confidence Threshold Testing

- [ ] **High Confidence Spec Change (>70%)**
  - Use description: "Need to add export to PDF feature, not mentioned in spec"
  - Verify agent confidence >70%
  - Verify prompt shown

- [ ] **Low Confidence Regular Bug (≤70%)**
  - Use description: "Button text should say 'Save' not 'Submit'"
  - Verify agent confidence ≤70%
  - Verify NO prompt shown, default to bug

- [ ] **Borderline Case (~70%)**
  - Use description that's ambiguous
  - Note agent's confidence score
  - Verify behavior matches threshold logic (>70% = prompt, ≤70% = bug)

### User Experience

- [ ] **Clear Progress Indicators**
  - Trigger spec change
  - Verify "Analyzing failure for spec change..." message shown
  - Verify analysis completes within reasonable time (<30 seconds)

- [ ] **Helpful Error Messages**
  - Trigger various error conditions (missing files, etc.)
  - Verify error messages include next steps
  - Verify error messages are clear and actionable

- [ ] **Prompt Display Clarity**
  - Trigger spec change with confidence >70%
  - Verify prompt shows all required information clearly:
    - Feature ID
    - Failure description
    - Agent reasoning
    - Confidence percentage
    - Consequences (3 steps)
    - Three clear options

---

## Test Sessions
<!-- Test sessions will be logged here during manual testing -->
