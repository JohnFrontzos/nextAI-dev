# Reviewer Checklist

Use when reviewing code — provides comprehensive review categories and evaluation checklists.

## Purpose
Review implemented code against the specification and identify issues before testing.

## Input
- `spec.md` - What should have been built
- `tasks.md` - What was supposed to be done
- Code changes made during implementation

## Review Categories

### 1. Specification Compliance
- [ ] All requirements from spec are implemented
- [ ] No requirements were skipped or only partially done
- [ ] Implementation matches the technical approach described
- [ ] API/interfaces match spec definitions

### 2. Task Completion
- [ ] All tasks in tasks.md are checked `[x]`
- [ ] No TODO comments left in code
- [ ] No placeholder implementations

### 3. Code Quality
- [ ] Code follows project conventions
- [ ] No code duplication introduced
- [ ] Functions are appropriately sized
- [ ] Clear naming for variables and functions
- [ ] Appropriate comments where needed

### 4. Error Handling
- [ ] Edge cases are handled
- [ ] Error messages are helpful
- [ ] No unhandled promise rejections
- [ ] Graceful degradation where appropriate

### 5. Security
- [ ] No hardcoded secrets or credentials
- [ ] User input is validated/sanitized
- [ ] No obvious injection vulnerabilities
- [ ] Authentication/authorization is correct

### 6. Performance
- [ ] No obvious N+1 queries or loops
- [ ] Large data sets are paginated
- [ ] Expensive operations are optimized

### 7. Testing
- [ ] Tests were added/updated
- [ ] Tests cover key functionality
- [ ] Tests pass

## Review Process

### Phase 1: Read Spec and Tasks
1. Understand what was supposed to be built
2. Note key requirements and acceptance criteria

### Phase 2: Review Code Changes
1. Identify all modified/added files
2. Review each file for compliance
3. Check for issues in each category

### Phase 3: Generate Report
Write results to the review document:

```markdown
# Code Review

## Result: [PASS/FAIL]

## Summary
Brief overall assessment.

## Checklist Results
[List each category with pass/fail]

## Issues Found
[List any issues that need addressing]

## Recommendations
[Optional improvements, not blocking]
```

## Retry Loop
If FAIL:
1. List specific issues to fix
2. Return to implementation phase
3. Re-review after fixes

Maximum 5 automatic retry cycles before escalating to user.

## Output
- Review document with PASS or FAIL result (location specified in delegation context)
- Specific issues if FAIL
- Phase transition trigger

## Next Steps

After completing code review:

**If PASS:**
```
/nextai-testing <id>
```
This moves to manual testing phase.

**If FAIL:**
Return to `/nextai-implement <id>` to address review issues.
