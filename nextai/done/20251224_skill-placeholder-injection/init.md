# Feature: Skill Placeholder Injection at Sync Time

## Related Iterations

This feature builds on learnings from previous attempts:

1. **`20251223_fix-agent-skill-loading`** - First iteration exploring the skill loading problem. Analyzed multiple approaches including explicit read instructions and agent frontmatter extension. Produced research docs and identified pre-sync embedding as the recommended solution.

2. **`20251224_update-agent-templates`** - Second iteration focused on updating agent templates. Attempted to make skill loading more explicit in agent definitions.

3. **`20251224_skill-placeholder-injection`** (current) - Final solution: inject skill content at sync time, eliminating runtime agent behavior as a variable.

## Problem Statement

NextAI command templates contain placeholders like:
```
[Insert full content of .claude/skills/reviewer-checklist/SKILL.md here]
```

The current approach expects Claude (as orchestrator) to read these skill files and embed the content when delegating to subagents. This is unreliable - Claude sometimes:
- Passes the literal placeholder text instead of reading the file
- References the skill by name without including the content
- Forgets to include the skill content entirely

This breaks phase-specific workflows because subagents don't receive the detailed checklists, processes, and methodologies they need.

## Proposed Solution

At `nextai sync` time, transform skill placeholders into actual embedded content:

1. During command template processing in `src/core/sync/claude-code.ts`
2. Detect placeholders matching pattern: `[Insert full content of .claude/skills/<skill-name>/SKILL.md here]`
3. Read the referenced skill file
4. Replace the placeholder with the actual skill content

## Benefits

- **Deterministic**: Content is physically present in generated files
- **Reliable**: Eliminates runtime agent behavior as a variable
- **Testable**: Can verify skill content is embedded after sync
- **Low Risk**: Extends existing sync transformer pattern

## Trade-offs

- Command files grow from ~50 to 100-300 lines (acceptable - they're generated)
- Skill updates require `nextai sync` to propagate (already part of workflow)

## Affected Files

- `src/core/sync/claude-code.ts` - Add placeholder transformation logic
- Possibly `src/core/sync/opencode.ts` - Same transformation for OpenCode

## Commands with Skill Placeholders

These commands contain `[Insert full content of .claude/skills/...` placeholders:
- `nextai-refine.md` - refinement-product-requirements, refinement-technical-specs, refinement-questions
- `nextai-review.md` - reviewer-checklist
- `nextai-implement.md` - executing-plans (if applicable)
- Others TBD (need to scan)

## Implementation Approach

```typescript
// In src/core/sync/claude-code.ts
private transformSkillPlaceholders(content: string, projectRoot: string): string {
  const placeholderPattern = /\[Insert full content of \.claude\/skills\/([^/]+)\/SKILL\.md here\]/g;

  return content.replace(placeholderPattern, (match, skillName) => {
    const skillPath = path.join(projectRoot, '.claude', 'skills', skillName, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
      return fs.readFileSync(skillPath, 'utf-8');
    }
    console.warn(`Warning: Skill file not found: ${skillPath}`);
    return match; // Keep placeholder if skill not found
  });
}
```

## Success Criteria

1. After `nextai sync`, command files contain embedded skill content (not placeholders)
2. Subagents receive complete skill methodologies in their delegation prompts
3. Phase workflows (refine, review, implement) execute with proper guidance
