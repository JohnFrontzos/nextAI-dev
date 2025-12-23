# Bug Investigation: Fix Phase Detection

## Summary

Two related issues identified:

1. **Phase Detection Bug**: Feature with all artifacts through testing phase is incorrectly detected as `product_refinement`
2. **Workflow Enforcement Issue**: The `nextai-guidelines` skill doesn't enforce use of NextAI commands, leading to direct artifact creation and stale ledger state

## Symptom Documentation

### Issue 1: Incorrect Phase Detection

**What exactly is happening:**
- Feature `20251223_continuous-location-updates` in `research/projects-with-nextai/honestli-android`
- Ledger shows `phase: "product_refinement"`
- Feature has all artifacts: initialization.md, requirements.md, spec.md, tasks.md, review.md (PASS), testing.md (2 sessions)

**Expected behavior:**
- Phase should be `testing` (review passed, testing.md exists)

**Reproduction:**
- Verified in `research/projects-with-nextai/honestli-android/.nextai/state/ledger.json`
- Confirmed all artifacts exist in `nextai/todo/20251223_continuous-location-updates/`
- `review.md` contains "## Verdict" header with "PASS" verdict
- `testing.md` exists with content (2 test sessions, both FAIL - expected for in-progress testing)

**Frequency:** Always - the phase detection logic consistently returns wrong phase

**Environment:** NextAI v0.2.3/v0.2.4

### Issue 2: Guidelines Skill Not Enforcing Workflow

**What exactly is happening:**
- User created `resources/skills/nextai-guidelines/SKILL.md` to guide Claude to use NextAI commands
- Claude bypassed the commands and wrote artifacts directly (requirements.md, spec.md, tasks.md, review.md, testing.md)
- This caused ledger not to be updated, metrics not collected, history not logged

**Expected behavior:**
- Claude should use `/nextai-refine`, `/nextai-implement`, `/nextai-review`, `/nextai-testing` commands
- These commands trigger CLI operations that update ledger, collect metrics, log history

**Root cause hypothesis:**
- The skill content is informational/educational, not prescriptive
- Skills don't have enforcement power over Claude's behavior
- The skill explains "what NextAI is" but doesn't mandate "you must use these commands"

## Evidence Gathered

### 1. Ledger State (Actual)

```json
{
  "features": [
    {
      "id": "20251223_continuous-location-updates",
      "phase": "product_refinement",
      "updated_at": "2025-12-23T12:43:56.669Z"
    }
  ]
}
```

### 2. Artifacts Present

```
nextai/todo/20251223_continuous-location-updates/
├── planning/
│   ├── initialization.md ✓
│   └── requirements.md ✓
├── spec.md ✓
├── tasks.md ✓
├── review.md ✓ (Verdict: PASS)
└── testing.md ✓ (2 sessions, both FAIL - in progress)
```

### 3. Review Verdict Detection

The `review.md` file contains:
```markdown
## Verdict

PASS
```

This should be detected by `getReviewOutcome()` function (phase-detection.ts:73-95).

### 4. Testing File Content

The `testing.md` file has 2 test sessions:
- Session 1: Status FAIL (design refinement needed)
- Session 2: Status FAIL (further design refinements needed)

However, the file exists with meaningful content, which should signal the feature is in testing phase.

## Backward Trace

### Issue 1: Phase Detection Bug

```
[Symptom]: Ledger shows phase = "product_refinement"
    ↓
[Cause]: detectPhaseFromArtifacts() returns "product_refinement"
    ↓
[Deeper Cause]: Function checks phases in reverse order but stops at first match
    ↓
[Root Cause]: Logic error in detectPhaseFromArtifacts() - checking for review PASS but not advancing to testing
```

### Detailed Analysis of detectPhaseFromArtifacts()

**File:** `src/core/validation/phase-detection.ts:341-391`

The function checks phases in reverse order:
1. Complete (summary.md in done/)
2. Testing (testing.md with PASS/FAIL status)
3. Review (review.md with PASS verdict)
4. Implementation (all tasks complete)
5. Tech spec (spec.md + tasks.md exist)
6. Product refinement (requirements.md exists)
7. Created (initialization.md exists)

**The Bug - Lines 351-359:**

```typescript
// Check for testing.md with PASS or FAIL status (testing phase)
const testingPath = join(featurePath, 'testing.md');
if (existsWithContent(testingPath)) {
  const content = readFileSync(testingPath, 'utf-8').toLowerCase();
  if (content.includes('status: pass') || content.includes('**status:** pass') ||
      content.includes('status: fail') || content.includes('**status:** fail')) {
    return 'testing'; // Testing phase (pass or fail), ready for complete or retry
  }
}
```

**The Issue:**
- This checks for SPECIFIC status format: `status: pass` or `status: fail`
- The actual testing.md format uses:
  ```markdown
  ### Session 1
  **Status:** FAIL
  ```
- The pattern matching is case-insensitive (`toLowerCase()`) but requires exact format
- When testing.md exists but doesn't match the pattern, the function continues to next check
- It finds review.md with PASS verdict (line 362-365) and returns 'review'
- But this is WRONG - if review passed AND testing.md exists, phase should be 'testing'

**Wait, let me re-check the logic:**

Actually, looking at line 362-365:
```typescript
const reviewOutcome = getReviewOutcome(join(featurePath, 'review.md'));
if (reviewOutcome.isComplete && reviewOutcome.verdict === 'pass') {
  return 'review'; // Review passed, ready for testing
}
```

This returns 'review' when review PASSED. But according to the phase model:
- When review PASSES, the feature completes the 'review' phase
- The next phase is 'testing'
- The function should return the COMPLETED phase, not the next phase

**Re-reading the function documentation (line 332-340):**

```typescript
/**
 * Detect the actual phase a feature is in based on artifact existence.
 * This checks artifacts in reverse order (highest phase first) to find
 * the most advanced phase the feature has reached.
 *
 * Note: This detects what phase the feature has COMPLETED, not what phase
 * it should transition TO. The caller should use getNextPhase() to determine
 * the target phase for advancement.
 */
```

So the function returns the COMPLETED phase. This means:
- If review.md exists with PASS verdict, it means 'review' phase is COMPLETE
- The function should return 'review'
- But wait, that's what it's doing...

**Let me trace through the actual case:**

1. Feature has: initialization.md, requirements.md, spec.md, tasks.md, review.md (PASS), testing.md (with sessions)
2. detectPhaseFromArtifacts() checks:
   - complete? No (no summary.md in done/)
   - testing? Check testing.md... exists with content
   - Does content match `status: pass` or `status: fail`? Let me check the actual format

Looking at the evidence (testing.md content from earlier read):
```markdown
### Session 1
**Date:** 2025-12-23
**Status:** FAIL
```

The pattern checking is:
```typescript
if (content.includes('status: pass') || content.includes('**status:** pass') ||
    content.includes('status: fail') || content.includes('**status:** fail')) {
```

This checks for:
- `status: pass` (lowercase after toLowerCase())
- `**status:** pass` (lowercase after toLowerCase())
- `status: fail`
- `**status:** fail`

The actual content has `**Status:** FAIL` which becomes `**status:** fail` after toLowerCase().

So the pattern SHOULD match! Let me verify by checking if there's whitespace...

Actually, the pattern is `**status:** fail` but needs to check if the actual format matches exactly. Let me re-examine.

**WAIT - I see the issue now!**

Looking more carefully at line 355-356:
```typescript
if (content.includes('status: pass') || content.includes('**status:** pass') ||
    content.includes('status: fail') || content.includes('**status:** fail')) {
```

The pattern for bold is `**status:** fail` but in testing.md the actual format is:
```markdown
**Status:** FAIL
```

After `toLowerCase()` this becomes: `**status:** fail`

This SHOULD match the pattern `content.includes('**status:** fail')`.

Unless... let me check if there are extra spaces or different formatting.

Actually, I need to re-read the testing.md file content more carefully. From the evidence:

```markdown
**Status:** FAIL
```

After toLowerCase(): `**status:** fail`

The includes check: `content.includes('**status:** fail')`

This should return TRUE and the function should return 'testing'.

**But the ledger shows 'product_refinement', not 'testing' or 'review'.**

This means the function is NOT being called, or the ledger is not being updated after the artifacts were created.

**AH! This is the REAL root cause - Issue 2 causes Issue 1!**

When Claude wrote the artifacts directly without using the CLI commands:
1. The artifacts (requirements.md, spec.md, tasks.md, review.md, testing.md) were created
2. The ledger was NOT updated (because no CLI commands were run)
3. The ledger still shows the LAST state that was set by a CLI command
4. That last state was `phase: "product_refinement"` from when the feature was created

The phase detection logic is probably CORRECT, but it's not being called to update the ledger!

Let me verify this hypothesis by checking when detectPhaseFromArtifacts() is called.

## Root Cause Identification

### Issue 1: Stale Ledger Due to Bypassed CLI

**Root Cause:**
- The ledger was last updated at "2025-12-23T12:43:56.669Z" when the feature was created or advanced to product_refinement
- Claude then wrote all artifacts (requirements.md through testing.md) directly to the filesystem
- Because the CLI commands were NOT used, the ledger was NEVER updated
- The phase detection function `detectPhaseFromArtifacts()` is only called by CLI commands
- Without CLI command execution, the ledger remains stale

**Why did this happen?**
- The `nextai-guidelines` skill was supposed to guide Claude to use the CLI commands
- But the skill is purely informational/educational, not prescriptive
- Claude interpreted the skill as "background knowledge" not "mandatory workflow"

**Why wasn't it caught earlier?**
- This is the first real-world test of the nextai-guidelines skill
- The skill was added in recent versions (v0.2.3/v0.2.4)
- The skill design assumed Claude would follow the guidelines, but doesn't enforce them

**Where else might this pattern exist?**
- Any feature where artifacts are written manually instead of through CLI commands
- Any time Claude decides to "be helpful" and write files directly
- This is a systemic issue with relying on skills to enforce workflow

### Issue 2: Guidelines Skill Design Flaw

**Root Cause:**
- The `nextai-guidelines` skill (resources/skills/nextai-guidelines/SKILL.md) is written as documentation
- It explains "what NextAI is", "how it works", "common pitfalls"
- It does NOT mandate "you MUST use these commands" in a prescriptive way
- Skills don't have enforcement power - they're just context/knowledge

**Why wasn't it caught earlier?**
- Skill was recently added
- Not tested in real-world usage before deployment
- Assumed Claude would interpret documentation as mandatory workflow

## Verification

### Can I explain the symptom from this cause?

YES:
1. Feature created via CLI → ledger set to phase: "created" or "product_refinement"
2. Claude writes requirements.md, spec.md, tasks.md, review.md, testing.md directly
3. Ledger is never updated because CLI commands were not used
4. Ledger shows stale phase: "product_refinement"
5. Feature appears stuck despite having all artifacts

### Does fixing this prevent the symptom?

YES - Two-part fix:
1. Remove the nextai-guidelines skill (stop trying to enforce workflow via skills)
2. Return to simpler approach: agent prompts guide the next command at phase completion
3. This ensures CLI commands are used, which updates the ledger

### Are there no other explanations?

The only alternative explanation would be:
- The phase detection logic has a bug and returns wrong phase even when called

But based on code review, the logic appears correct:
- testing.md with "**Status:** FAIL" should match the pattern
- Even if it doesn't match, review.md with PASS should return 'review' (not 'product_refinement')

So the most likely explanation is that detectPhaseFromArtifacts() is simply not being called because CLI commands are not being used.

## Fix Recommendation

### Primary Fix: Remove nextai-guidelines Skill

**Files to Delete:**
- `resources/skills/nextai-guidelines/SKILL.md`
- `resources/skills/nextai-guidelines/` (entire directory)

**Files to Modify:**
- `src/core/scaffolding/project.ts` - Remove nextai-guidelines from default skills (already done - it's not in the list)

**Reason:**
- Skills cannot enforce workflow compliance
- The guidelines skill is informational only
- Trying to enforce workflow via skills adds complexity without benefit
- Previous approach (simpler, user-driven) was working correctly

### Secondary Fix: Enhance Phase Skills to Prompt Next Command

**Files to Modify:**
- Phase completion skills should explicitly tell the user what command to run next
- Example: "Next: Run `/nextai-implement <id>`" at end of refinement

**Files to Check:**
- `resources/skills/refinement-product-requirements/SKILL.md`
- `resources/skills/refinement-technical-specs/SKILL.md`
- `resources/skills/executing-plans/SKILL.md`
- `resources/skills/reviewer-checklist/SKILL.md`
- `resources/skills/testing-investigator/SKILL.md`

### Tertiary Fix: Update ai-team-lead Agent

**File to Modify:**
- `resources/agents/ai-team-lead.md`

**Changes:**
- Add minimal context about NextAI workflow
- Emphasize that phase transitions happen through CLI commands
- Keep it simple and prescriptive (not educational)

### Verify Testing Phase Detection Pattern

**File to Review:**
- `src/core/validation/phase-detection.ts:351-359`

**Check:**
- Confirm the pattern matching for testing.md status is robust
- The current pattern checks for specific formats:
  - `status: pass` or `**status:** pass`
  - `status: fail` or `**status:** fail`
- Consider if this should be more flexible (e.g., regex for "Status:" followed by "PASS"/"FAIL")

**Current Pattern:**
```typescript
if (content.includes('status: pass') || content.includes('**status:** pass') ||
    content.includes('status: fail') || content.includes('**status:** fail')) {
```

**Analysis:**
- The testing.md format uses `**Status:** FAIL` which becomes `**status:** fail` after toLowerCase()
- This SHOULD match the pattern `content.includes('**status:** fail')`
- If there's a mismatch, it might be due to extra whitespace or different punctuation
- Consider using regex for more robust matching

**Recommended Enhancement:**
```typescript
const statusPattern = /\*\*status:\*\*\s+(pass|fail)/i;
const hasStatus = statusPattern.test(content);
if (hasStatus) {
  return 'testing';
}
```

But first, verify if the current pattern actually fails to match before making changes.

## Prevention

### How to prevent similar issues:

1. **Don't rely on skills for workflow enforcement**
   - Skills are context/knowledge, not guardrails
   - Use agent prompts to guide the next action explicitly

2. **Keep the workflow user-driven**
   - User runs CLI commands to advance phases
   - CLI commands update ledger, collect metrics, log history
   - Don't try to make Claude automatically chain commands

3. **Test workflow enforcement in real projects**
   - Before adding new workflow features, test them in realistic scenarios
   - The nextai-guidelines skill was untested in real-world usage

4. **Make phase completion prompts explicit**
   - At end of each phase, show exactly what command to run next
   - Don't assume Claude will infer the correct next step

5. **Monitor for direct artifact writes**
   - Could add logging to detect when artifacts are created outside CLI
   - Could add warnings if ledger is stale compared to artifact timestamps
   - This would be a future enhancement for debugging

## Files to Modify/Delete

### Delete:
1. `resources/skills/nextai-guidelines/` - Remove the entire skill directory

### Modify:
1. `resources/agents/ai-team-lead.md` - Add minimal NextAI workflow context
2. `resources/skills/refinement-product-requirements/SKILL.md` - Prompt next command
3. `resources/skills/refinement-technical-specs/SKILL.md` - Prompt next command
4. `resources/skills/executing-plans/SKILL.md` - Prompt next command
5. `resources/skills/reviewer-checklist/SKILL.md` - Prompt next command
6. `resources/skills/testing-investigator/SKILL.md` - Prompt next command (if exists)

### Optional (verify first):
1. `src/core/validation/phase-detection.ts` - Enhance testing.md status pattern matching (only if current pattern actually fails)

## Next Steps

1. Confirm the fix approach with the user
2. Implement the deletion of nextai-guidelines skill
3. Update agent and skill prompts to guide next command
4. Test in the honestli-android project
5. Verify ledger updates correctly when CLI commands are used
6. Document the user-driven workflow approach

## Confidence

**High confidence in root cause:**
- Evidence clearly shows ledger was not updated after artifacts were created
- This can only happen if CLI commands were not used
- The guidelines skill was supposed to enforce this but failed

**Medium confidence in phase detection logic:**
- The code appears correct, but hasn't been tested with the exact testing.md format
- May need to verify the pattern matching works as expected
- Could be enhanced for robustness

**High confidence in fix approach:**
- Removing the guidelines skill removes the source of confusion
- Returning to user-driven workflow is proven to work
- Simpler approach is more maintainable
