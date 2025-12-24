# Bug: Missing investigator skills

## Description

The `root-cause-tracing` and `systematic-debugging` skills exist in `resources/skills/` but are NOT being injected into the investigator agent template. According to documentation (`nextai/docs/conventions.md`), the investigator agent should have these skills.

## Analysis

### Skills Available (8 total in `resources/skills/`)

| Skill | Injected Via Placeholder | Where |
|-------|-------------------------|-------|
| `documentation-recaps` | ✅ | complete.md (2x) |
| `executing-plans` | ✅ | implement.md |
| `refinement-product-requirements` | ✅ | refine.md |
| `refinement-technical-specs` | ✅ | refine.md (2x) |
| `testing-investigator` | ✅ | refine.md |
| `reviewer-checklist` | ✅ | review.md |
| `root-cause-tracing` | ❌ | **NOT INJECTED** |
| `systematic-debugging` | ❌ | **NOT INJECTED** |

### Expected Behavior

Per `nextai/docs/conventions.md:311`:
```
| investigator | root-cause-tracing, systematic-debugging, testing-investigator | Bug and test failure investigation |
```

### Current State

- `resources/agents/investigator.md` has `skillDependencies: []` (empty array)
- No placeholder in investigator.md body for these skills
- The sync process (`syncAgents`) doesn't call `embedSkillPlaceholders` on agent content

## Root Cause

1. The investigator agent template doesn't have skill placeholders
2. The `syncAgents` function doesn't embed skill placeholders into agents (only `transformCommandTemplate` does)

## Proposed Fix

1. Update `resources/agents/investigator.md`:
   - Add `root-cause-tracing` and `systematic-debugging` to `skillDependencies`
   - Add skill placeholders in the body content

2. Update sync to embed skills in agents:
   - Modify `syncAgents` in `claude-code.ts` and `opencode.ts` to call `embedSkillPlaceholders`

## Acceptance Criteria

- [ ] investigator.md includes skill placeholders for root-cause-tracing and systematic-debugging
- [ ] skillDependencies array is populated correctly
- [ ] Sync generates agent files with embedded skill content
- [ ] Works for both Claude Code and OpenCode sync targets

## Notes

This was discovered during verification that all skills are being injected in the appropriate phases.
