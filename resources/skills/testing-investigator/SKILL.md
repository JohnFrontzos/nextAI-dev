---
name: testing-investigator
description: Use when investigating test failures — provides investigation methodology and report templates for testing.md.
---

# Testing Investigator

Use when investigating test failures — provides investigation methodology and report templates for testing.md.

## Purpose
Investigate test failures systematically and produce actionable investigation reports that are written directly into testing.md.

## Input
- Feature ID
- Test failure notes from operator
- Attachments in `attachments/evidence/` (logs, screenshots, error traces)
- `testing.md` - Current test session with FAIL status
- `spec.md` - Feature specification
- `tasks.md` - Implementation tasks
- Source code and test files

## Process

### Phase 1: Context Gathering
1. Read the current test session in testing.md
2. Read failure notes from operator
3. Review all attachments in attachments/evidence/
4. Read spec.md to understand expected behavior
5. Read tasks.md to understand what was implemented
6. Identify the gap between expected and actual behavior

### Phase 2: Evidence Analysis

**For Log Files:**
- Extract error messages and stack traces
- Identify the first point of failure
- Note any warnings that preceded the error
- Check for environment-specific issues

**For Screenshots:**
- Compare visual output with expected design
- Identify UI rendering issues
- Note any console errors visible in screenshots
- Check for responsive design problems

**For Error Traces:**
- Trace error back to source code
- Identify the exact line and file where failure occurred
- Understand the execution path that led to failure

### Phase 3: Root Cause Identification

Use backward tracing methodology:
1. Start from the symptom (test failure)
2. Trace back through the execution path
3. Identify the immediate cause
4. Continue tracing to find the root cause
5. Distinguish between symptoms and actual root cause

**Common Root Cause Categories:**
- Logic errors (incorrect conditions, missing edge case handling)
- Data issues (null values, type mismatches, missing validation)
- Integration problems (API issues, dependency failures)
- Environment issues (config problems, missing dependencies)
- Design flaws (architectural issues, incorrect assumptions)

### Phase 4: Impact Assessment
- Identify all affected files and functions
- Determine if issue affects other features
- Assess severity (critical, major, minor)
- Note any workarounds or mitigations

### Phase 5: Fix Recommendations
- Provide specific, actionable fix suggestions
- Reference exact file paths and line numbers
- Explain why the fix addresses the root cause
- Note any related changes needed (tests, docs, etc.)
- Consider alternative approaches if applicable

## Output Format

Write investigation report directly to testing.md under the current test session's Investigation Report section.

### Report Template

```markdown
#### Investigation Report

**Root Cause:** <One sentence summary of the root cause>

**Analysis:**
<Detailed explanation of what went wrong and why>

**Affected Files:**
- `path/to/file1.ts:45` - <what's wrong here>
- `path/to/file2.ts:123` - <related issue>

**Evidence Summary:**
- <Key findings from log file 1>
- <Key findings from screenshot 2>
- <Key findings from error trace>

**Suggested Fix:**
1. <Specific step 1 with file path and change description>
2. <Specific step 2>
3. <Additional steps if needed>

**Testing Recommendation:**
- <What to test after fix>
- <How to verify the fix works>
- <Edge cases to check>

**Related Issues:**
- <Any other potential problems discovered>
- <Future improvements to prevent similar failures>
```

## Investigation Guidelines

### Be Specific
- Always include file paths and line numbers
- Quote exact error messages
- Reference specific function names and variables

### Be Actionable
- Fix suggestions must be implementable
- Provide enough context for developer to understand
- Break down complex fixes into steps

### Be Thorough
- Don't stop at surface-level symptoms
- Trace back to actual root cause
- Consider cascading effects

### Be Clear
- Use plain language
- Explain technical terms when necessary
- Structure report for easy scanning

## Common Patterns

### Pattern 1: Null/Undefined Errors
**Symptom:** "Cannot read property X of undefined"
**Investigation:**
1. Find where the property access occurs
2. Trace back where the object comes from
3. Identify why it's null/undefined
4. Check if validation is missing

### Pattern 2: API/Integration Failures
**Symptom:** Request fails, timeout, or returns unexpected data
**Investigation:**
1. Check network logs in attachments
2. Verify API endpoint and parameters
3. Check authentication/authorization
4. Validate request/response format
5. Check error handling

### Pattern 3: UI Rendering Issues
**Symptom:** Elements not displaying correctly
**Investigation:**
1. Compare screenshot with design spec
2. Check CSS/styling code
3. Verify data is being passed correctly
4. Check responsive design breakpoints
5. Review console errors

### Pattern 4: Logic Errors
**Symptom:** Feature behaves incorrectly
**Investigation:**
1. Understand expected behavior from spec.md
2. Trace actual execution path
3. Identify where logic diverges
4. Check conditional statements and loops
5. Verify edge case handling

## Confidence Levels

Include confidence level in your analysis:
- **High Confidence:** Clear evidence points to specific root cause
- **Medium Confidence:** Strong indicators but alternative explanations possible
- **Low Confidence:** Multiple possible causes, further investigation needed

If confidence is low, recommend specific additional debugging steps.

## Writing the Report

After completing investigation:

1. Read the current testing.md file
2. Locate the most recent test session with FAIL status
3. Find the "Investigation Report" placeholder section
4. Replace the placeholder comment with your full investigation report
5. Preserve all other content in testing.md
6. Use the Edit tool to make the replacement

**IMPORTANT:** Do not create a new file or section. Update the existing Investigation Report section within the current test session.

## Example Investigation

**Test Failure:** "Login button doesn't work on mobile"

**Investigation Process:**
1. Read operator notes: "Button click has no effect on Android 12"
2. Review screenshot showing button UI
3. Check error logs for JavaScript errors
4. Trace button click handler in code
5. Discover missing null check for mobile touch events
6. Identify root cause: touch event handler assumes mouse events

**Report:**
```markdown
#### Investigation Report

**Root Cause:** Missing touch event support in login button handler (assumes mouse events only)

**Analysis:**
The login button click handler in `src/components/Login.tsx` only listens for 'click' events, which work on desktop but not reliably on mobile touch devices. On Android 12, the touch event doesn't trigger the click handler, preventing login.

**Affected Files:**
- `src/components/Login.tsx:67` - Button event listener needs touch event support

**Evidence Summary:**
- Screenshot shows button renders correctly but no response to tap
- Console log shows no errors (handler never fires)
- Operator confirmed issue specific to mobile devices

**Suggested Fix:**
1. Add touchstart event listener alongside click event in `src/components/Login.tsx:67`
2. Alternatively, use a touch-friendly library like React's onTouchStart
3. Test on both mobile and desktop to ensure both input methods work

**Testing Recommendation:**
- Test on Android 12 and 14 (both Chrome and native browser)
- Test on iOS devices
- Verify desktop still works (mouse clicks)
- Check that form submission only happens once (prevent double-submit)

**Related Issues:**
- Other buttons may have the same issue - audit all interactive elements
- Consider adding touch event handling to component library
```

## Error Handling

If investigation cannot determine root cause:
1. Document what was checked
2. List possible causes with likelihood
3. Recommend next debugging steps
4. Request additional information from operator
5. Still write partial report to testing.md

## Completion Criteria
- Investigation report written to testing.md
- Root cause identified (or documented as unclear)
- Specific fix recommendations provided
- All evidence analyzed and summarized
