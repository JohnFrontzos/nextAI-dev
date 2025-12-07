---
name: systematic-debugging
description: 4-phase debugging framework for methodical problem-solving.
---

# Systematic Debugging

4-phase debugging framework for methodical problem-solving.

## Purpose
Provide a structured approach to debugging complex issues.

## The 4 Phases

### Phase 1: REPRODUCE
Make the bug happen consistently.

**Goals:**
- Identify exact reproduction steps
- Find minimal reproduction case
- Note environmental factors

**Actions:**
1. Follow reported steps exactly
2. Try variations to find boundaries
3. Document what does and doesn't trigger it
4. Create a test case if possible

**Output:**
- Reliable reproduction steps
- Minimal test case
- Environmental requirements

### Phase 2: ISOLATE
Narrow down where the bug lives.

**Goals:**
- Identify the component(s) involved
- Find the exact code path
- Eliminate possibilities

**Actions:**
1. Add logging at key points
2. Use binary search on code
3. Comment out sections
4. Check recent commits
5. Compare working vs broken state

**Techniques:**
- **Binary search**: Disable half the code, check if bug persists
- **Delta debugging**: Minimize the diff that causes the issue
- **Bisect**: Find the commit that introduced it

**Output:**
- Specific file(s) and function(s)
- Code path that triggers the bug
- Eliminated possibilities

### Phase 3: UNDERSTAND
Know exactly why it's happening.

**Goals:**
- Understand the mechanism
- Know why the fix works
- Identify related risks

**Actions:**
1. Read the code carefully
2. Trace data flow
3. Check assumptions
4. Understand the intended behavior
5. Identify the gap between intended and actual

**Questions:**
- What should happen at each step?
- What actually happens?
- Why is there a difference?
- What conditions cause this?

**Output:**
- Explanation of the bug
- Diagram if helpful
- Root cause statement

### Phase 4: FIX
Implement a correct and complete solution.

**Goals:**
- Fix the root cause
- Not introduce new bugs
- Add regression test
- Document the fix

**Actions:**
1. Plan the fix before coding
2. Consider edge cases
3. Implement the fix
4. Add tests to prevent regression
5. Review the change

**Checklist:**
- [ ] Fixes the root cause, not just symptoms
- [ ] Doesn't break existing functionality
- [ ] Has test coverage
- [ ] Is the simplest correct solution
- [ ] Is documented if non-obvious

**Output:**
- Working fix
- Regression test
- Documentation update if needed

## When Stuck

If stuck at any phase:
1. Take a break (rubber duck moment)
2. Explain the problem to someone
3. Question your assumptions
4. Try a completely different approach
5. Look for similar issues/solutions

## Documentation

Throughout debugging, update `planning/investigation.md`:

```markdown
# Debugging Log

## Issue
[Brief description]

## Reproduction
[Steps to reproduce]

## Investigation Log
### [Timestamp]
- Tried: [what you tried]
- Result: [what happened]
- Next: [what to try next]

## Root Cause
[Explanation when found]

## Fix
[Description of the fix]
```

## Tips
- Keep notes as you go
- Don't change multiple things at once
- Verify each hypothesis
- Trust the evidence over intuition
