# Requirements: Fix Phase-Specific Skill Injection Mechanism

## Executive Summary

NextAI's phase-specific skill injection mechanism is unreliable. The system intends for orchestrators (slash commands) to pre-load skill content and embed it into subagent prompts, but the current implementation uses placeholder instructions like `[Insert full content of .claude/skills/reviewer-checklist/SKILL.md here]` that may or may not be followed by the orchestrator.

This requirements document clarifies:
1. What the intended behavior should be
2. What the actual current behavior is
3. What constraints exist in the architecture
4. What questions need answers before designing a solution

**Key Finding**: The problem is fundamentally about whether Claude (acting as orchestrator) reliably follows instructions to read files and embed content before delegation, or whether this requires a more explicit/enforced mechanism.

---

## Problem Definition

### The Intended Workflow

When a user runs `/nextai-review <feature-id>`:

1. **Orchestrator receives command** - Claude processes the `/nextai-review` slash command
2. **Orchestrator reads skill content** - Should read `.claude/skills/reviewer-checklist/SKILL.md`
3. **Orchestrator constructs prompt** - Should embed skill content under "## Your Workflow"
4. **Orchestrator delegates** - Invokes Task tool with reviewer subagent and constructed prompt
5. **Subagent receives prompt** - Gets complete skill guidance inline
6. **Subagent executes** - Follows the embedded skill workflow

### The Current Implementation

Command templates contain instructions like:
```markdown
**Instructions for the reviewer subagent:**

## Your Workflow

[Insert full content of .claude/skills/reviewer-checklist/SKILL.md here]

Now proceed with your task using the workflow above.
```

**The critical question**: Does Claude (as orchestrator) actually:
- **Option A**: Read the file and embed the content (as intended)?
- **Option B**: Pass the literal `[Insert full content...]` text to the subagent?
- **Option C**: Sometimes A, sometimes B (unreliable)?

### Evidence of the Problem

From the user's report:
> "The orchestrator forgot to include the skill content, just referencing it by name"

This suggests **Option B or C** - the skill content is not being reliably embedded.

### Impact

If skills aren't loaded:
- **Reviewer** may skip checklist items, missing critical issues
- **Developer** may not follow the execution plan methodology
- **Product Owner** may not ask the right clarifying questions
- **Technical Architect** may skip important spec sections
- **Document Writer** may produce incomplete summaries

Skills are not just nice-to-have guidance - they define the process for each phase.

---

## Architecture Context

### How Skills Work in NextAI

**Three types of skills:**

| Type | Example | Loading Mechanism | Reliability |
|------|---------|-------------------|-------------|
| **Phase Skills** | `reviewer-checklist` | Should be embedded by orchestrator | UNRELIABLE (current problem) |
| **Role Skills** | Product Owner expertise | Baked into agent system prompt | RELIABLE (always present) |
| **User Skills** | Custom workflows | Agent loads via Skill() tool | N/A (separate feature) |

**This issue is specifically about Phase Skills.**

### Current Architecture Constraints

1. **Claude Code Limitations**:
   - No built-in "pre-processing" step for slash commands
   - Orchestrator is just another Claude instance following instructions
   - No enforcement of file reading before delegation
   - Can't guarantee instruction-following behavior

2. **Task Tool Behavior**:
   - Takes a prompt string and subagent type
   - No special handling for skill embedding
   - No validation of prompt content
   - No awareness of skills

3. **Skill Tool Availability**:
   - Subagents CAN use Skill() tool directly
   - But previous approach (FIRST ACTION directive) proved unreliable
   - Subagents prioritize task prompts over "first action" instructions

4. **Generate + Delegate Philosophy**:
   - NextAI doesn't execute code to transform prompts
   - Everything is "Claude following instructions"
   - No compile-time or pre-processing step exists

---

## Clarifying Questions

### 1. User Experience Requirements

**Q1.1**: When a user runs `/nextai-review`, should they expect 100% reliability that the reviewer has the checklist?

**Proposed Answer**: YES - phase skills are critical to process integrity, not optional guidance.

**Q1.2**: Should there be any visible indication that skills were loaded?

**Proposed Answer**: Not necessarily visible to user, but should be verifiable in logs/history.

**Q1.3**: What should happen if a skill file is missing or corrupted?

**Proposed Answer**: Fail fast with clear error, don't proceed with phase.

### 2. Reliability Requirements

**Q2.1**: Is 90% reliability acceptable, or must it be 100%?

**Proposed Answer**: Must be 100% - skills define the process.

**Q2.2**: What's worse - false positive (skill loaded but not used) or false negative (skill missing)?

**Proposed Answer**: False negative is worse - missing skills compromises process quality.

**Q2.3**: Can we accept non-deterministic behavior if it works "most of the time"?

**Proposed Answer**: NO - non-deterministic processes create trust issues.

### 3. Current Behavior Investigation

**Q3.1**: Does the `[Insert full content...]` instruction actually work reliably?

**Needs Investigation**: Test with current implementation to measure actual behavior.

**Q3.2**: If it works sometimes, what factors affect reliability?

**Needs Investigation**: Context length, orchestrator model, prompt complexity?

**Q3.3**: Is there any logging/evidence of whether skills were embedded?

**Needs Investigation**: Check Task tool invocations, subagent context.

### 4. Architecture Feasibility

**Q4.1**: Within Claude Code's architecture, what mechanisms can guarantee skill loading?

**Options to evaluate**:
- Explicit instructions (current approach - may be unreliable)
- Subagent loads via Skill() tool (previous approach - proved unreliable)
- Bake skills into templates (static, breaks updates)
- Build-time injection (requires tooling changes)

**Q4.2**: Can we enforce file reading before delegation?

**Constraint**: No compile-time or pre-execution enforcement in Claude Code.

**Q4.3**: Is there a "checkpoint" where we can validate that skills were loaded?

**Constraint**: Task tool doesn't expose what prompt was actually sent.

### 5. Alternative Approaches

**Q5.1**: Should we reconsider the "orchestrator embeds" pattern?

**Alternatives**:
1. **Subagent loads explicitly** - Agent uses Skill() tool as first action
   - Pro: Explicit, verifiable
   - Con: Previous testing showed unreliable

2. **Baked into templates** - Skills hardcoded in command files
   - Pro: 100% reliable, no runtime dependency
   - Con: Static, breaks when skills update, large files

3. **Hybrid approach** - Template includes Skill() call + fallback embedded content
   - Pro: Best of both worlds
   - Con: Complex, redundant

4. **Build-time injection** - `nextai sync` reads skills and bakes into commands
   - Pro: Reliable, supports updates via re-sync
   - Con: Requires tooling changes, not runtime

5. **Accept optional skills** - Skills are guidance, not mandatory
   - Pro: Simple, no reliability issues
   - Con: Compromises process integrity

**Q5.2**: Is the "pre-load and embed" pattern fundamentally flawed for Claude Code?

**Consideration**: If Claude-as-orchestrator can't reliably follow file-reading instructions, we need a different pattern.

### 6. Scope Boundaries

**Q6.1**: Is this a bug in the implementation or a design flaw in the approach?

**Needs Clarification**: Was `[Insert full content...]` intended to work automatically, or was it a placeholder for manual editing?

**Q6.2**: Is the recent commit (04fc82e) the "finished" implementation or a work-in-progress?

**Needs Clarification**: Check commit message and PR context.

**Q6.3**: Should this fix address all skill types or just phase skills?

**Answer**: ONLY phase skills - user skills are separate concern.

---

## Investigation Needed

Before designing a solution, we need to:

### Test Current Behavior

1. **Run `/nextai-review` on test feature**
2. **Capture Task tool invocation** - What prompt was actually sent?
3. **Check subagent context** - Did it receive embedded skill or placeholder?
4. **Measure reliability** - 10 runs, how many times skill embedded?

### Review Historical Context

1. **Check commit 04fc82e details** - Was this intended as final solution?
2. **Review previous approach** - Why did "FIRST ACTION" fail?
3. **Check issue/PR discussion** - What problem was being solved?

### Analyze Reference Implementations

1. **Other frameworks** - How do agent-os, opencode, BMAD handle this?
2. **Claude Code patterns** - Best practices for reliable file inclusion?
3. **MCP capabilities** - Any skill injection support?

---

## Key Requirements (Derived)

### Functional Requirements

**FR1**: Phase-specific skills MUST be available to subagents 100% of the time
**FR2**: Missing or corrupted skill files MUST cause phase to fail with clear error
**FR3**: Skill content MUST be current (reflect latest skill file content)
**FR4**: Solution MUST work within Claude Code's architecture constraints
**FR5**: Solution MUST support skill updates without breaking existing features

### Non-Functional Requirements

**NFR1**: Reliability - 100% deterministic behavior
**NFR2**: Observability - Ability to verify skills were loaded
**NFR3**: Maintainability - Clear separation between skill content and orchestration logic
**NFR4**: Performance - Skill loading should not significantly impact execution time

### Constraints

**C1**: Cannot modify Claude Code core behavior
**C2**: Cannot rely on LLM instruction-following for critical process steps
**C3**: Cannot break existing "Generate + Delegate" philosophy
**C4**: Must support skill content updates via `nextai sync`

---

## Out of Scope

- User-defined custom skills (separate feature)
- General agent reliability improvements
- Alternative workflow systems
- MCP-based solutions (not available in Claude Code)

---

## Success Criteria

Requirements are complete when we can answer:

1. What is the intended behavior? (ANSWERED: 100% reliable skill embedding)
2. What is the current behavior? (NEEDS INVESTIGATION: Test and measure)
3. What are the constraints? (ANSWERED: Claude Code limitations, no pre-processing)
4. What are the alternatives? (IDENTIFIED: 5 options listed above)
5. What is the recommended approach? (PENDING: Needs investigation results)

---

## Next Steps

1. **Investigation Phase**:
   - Test current behavior (measure reliability)
   - Review commit history (understand intent)
   - Analyze reference implementations (learn patterns)

2. **Requirements Finalization**:
   - Document actual vs expected behavior
   - Identify root cause (implementation bug vs design flaw)
   - Select solution approach based on constraints

3. **Technical Specification**:
   - Design chosen solution
   - Define implementation plan
   - Identify files to change

---

## Questions for Product Owner (You)

**Critical Decision Points:**

1. **Reliability vs Simplicity**: Are you willing to accept increased complexity (e.g., build-time injection) to achieve 100% reliability?

2. **Update Mechanism**: How important is it that skill updates propagate automatically? Or is manual re-sync acceptable?

3. **Failure Handling**: Should missing skills fail the entire phase, or gracefully degrade with warnings?

4. **Backwards Compatibility**: If we change the mechanism, do existing features need to work during transition?

5. **Investigation Budget**: Should we deeply investigate why current approach fails, or assume it's flawed and pick a different pattern?

---

## Appendix: Skill-to-Phase Mapping

| Phase | Orchestrator | Subagent | Skill Required |
|-------|-------------|----------|----------------|
| Product Refinement | `/nextai-refine` | product-owner | `refinement-product-requirements` |
| Tech Spec | `/nextai-refine` | technical-architect | `refinement-technical-specs` |
| Implementation | `/nextai-implement` | developer | `executing-plans` |
| Review | `/nextai-review` | reviewer | `reviewer-checklist` |
| Testing (Investigation) | `/nextai-testing` | investigator | `testing-investigator` |
| Complete | `/nextai-complete` | document-writer | `documentation-recaps` |

All 6 delegation points are affected by this issue.

---

## Appendix: Related Files

**Command Templates** (where `[Insert full content...]` appears):
- `C:\Dev\Git\nextai-dev\resources\templates\commands\refine.md`
- `C:\Dev\Git\nextai-dev\resources\templates\commands\implement.md`
- `C:\Dev\Git\nextai-dev\resources\templates\commands\review.md`
- `C:\Dev\Git\nextai-dev\resources\templates\commands\complete.md`
- `C:\Dev\Git\nextai-dev\resources\templates\commands\testing.md` (if exists)

**Synced Commands** (active in Claude Code):
- `C:\Dev\Git\nextai-dev\.claude\commands\nextai-refine.md`
- `C:\Dev\Git\nextai-dev\.claude\commands\nextai-implement.md`
- `C:\Dev\Git\nextai-dev\.claude\commands\nextai-review.md`
- `C:\Dev\Git\nextai-dev\.claude\commands\nextai-complete.md`

**Skills** (content to be embedded):
- `C:\Dev\Git\nextai-dev\.claude\skills\refinement-product-requirements\SKILL.md`
- `C:\Dev\Git\nextai-dev\.claude\skills\refinement-technical-specs\SKILL.md`
- `C:\Dev\Git\nextai-dev\.claude\skills\executing-plans\SKILL.md`
- `C:\Dev\Git\nextai-dev\.claude\skills\reviewer-checklist\SKILL.md`
- `C:\Dev\Git\nextai-dev\.claude\skills\testing-investigator\SKILL.md`
- `C:\Dev\Git\nextai-dev\.claude\skills\documentation-recaps\SKILL.md`

**Reference Documentation**:
- `C:\Dev\Git\nextai-dev\nextai\docs\architecture.md` (sections on skill loading)
- `C:\Dev\Git\nextai-dev\nextai\done\20251209_subagents-not-using-assigned-s\summary.md` (previous fix attempt)
- `C:\Dev\Git\nextai-dev\nextai\todo\20251223_fix-agent-skill-loading\spec.md` (recent implementation)
