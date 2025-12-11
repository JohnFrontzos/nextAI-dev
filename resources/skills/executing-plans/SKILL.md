# Executing Plans

Use when implementing features — provides systematic task execution patterns for checking off implementation tasks.

## Purpose
Execute implementation tasks systematically, checking each item as completed.

## Input
- `tasks.md` - The implementation task checklist
- `spec.md` - Technical specification for reference

## Process

### Phase 1: Planning
1. Read the entire task list
2. Understand dependencies between tasks
3. Identify the current task (first unchecked item)
4. Read relevant spec sections

### Phase 2: Execution
For each task:

1. **Read the task** - Understand what needs to be done
2. **Check context** - Review related code and documentation
3. **Plan the change** - Determine files to modify
4. **Implement** - Make the changes
5. **Verify** - Test that it works
6. **Mark complete** - Update tasks.md with `[x]`

### Task Execution Guidelines

#### Before Starting
- Read surrounding code to understand patterns
- Check for existing utilities or helpers
- Review related tests for expected behavior

#### During Implementation
- Follow existing code patterns and conventions
- Keep changes focused on the current task
- Add appropriate comments for complex logic
- Handle errors gracefully

#### After Each Task
- Self-review the changes
- Run relevant tests if available
- Update the task checkbox to `[x]`

### Handling Blockers
If a task cannot be completed:
1. Document the blocker in the task
2. Move to the next unblocked task if possible
3. Inform the user of blocking issues

### Multi-File Changes
When a task requires multiple file changes:
1. Plan all changes first
2. Make related changes together
3. Ensure consistency across files
4. Test the complete change, not partial

### Progress Reporting
After each significant milestone:
- Summarize what was completed
- Note any issues encountered
- Indicate next steps

## Output
- Code changes as specified in tasks
- Updated `tasks.md` with checked items
- Any new issues noted inline

## Completion Criteria
All tasks marked `[x]` before moving to review phase.
