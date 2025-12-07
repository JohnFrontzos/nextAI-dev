---
name: root-cause-tracing
description: Backward bug tracing technique for identifying the source of issues.
---

# Root Cause Tracing

Backward bug tracing technique for identifying the source of issues.

## Purpose
Systematically trace bugs from symptoms back to their root cause.

## When to Use
- Bug reports where the cause isn't obvious
- Intermittent issues that are hard to reproduce
- Complex bugs spanning multiple components

## Process

### Phase 1: Symptom Documentation
1. **Describe the symptom** - What exactly is happening?
2. **Expected behavior** - What should happen instead?
3. **Reproduction steps** - How to make it happen?
4. **Frequency** - Always, sometimes, rarely?
5. **Environment** - Where does it occur?

### Phase 2: Evidence Gathering
1. Collect error messages and stack traces
2. Find relevant log entries
3. Note any recent changes
4. Identify affected data or users

### Phase 3: Backward Trace
Start from the symptom and work backward:

```
[Symptom] → [Immediate Cause] → [Deeper Cause] → [Root Cause]
```

For each step, ask:
- **What directly caused this?**
- **What conditions made that possible?**
- **When was this last working?**

### Phase 4: Root Cause Identification
The root cause should answer:
1. Why did this happen?
2. Why wasn't it caught earlier?
3. Where else might this pattern exist?

### Common Root Cause Categories
- **Logic errors** - Incorrect algorithm or condition
- **State issues** - Race condition, stale data
- **Integration** - Mismatched expectations between components
- **Configuration** - Wrong settings, missing values
- **Resource** - Memory, connections, limits
- **External** - Third-party API, network, database

### Phase 5: Verification
Before declaring root cause:
1. Can you explain the symptom from this cause?
2. Does fixing this prevent the symptom?
3. Are there no other explanations?

## Output Format

Write findings to `planning/investigation.md`:

```markdown
# Bug Investigation: [Title]

## Symptom
[Describe what was observed]

## Trace
1. [Symptom]: User sees error X
2. [Cause]: Function Y returned null
3. [Cause]: Data not loaded before access
4. [Root]: Race condition in initialization

## Root Cause
[Detailed explanation]

## Evidence
- Log entries
- Stack traces
- Reproduction results

## Fix Recommendation
[How to fix the root cause]

## Prevention
[How to prevent similar issues]
```

## Tips
- Don't assume - verify each step
- Check git blame for recent changes
- Look for patterns, not just symptoms
- Consider timing and state
