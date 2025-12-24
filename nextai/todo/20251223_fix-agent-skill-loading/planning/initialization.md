# Task: Fix agent skill loading

## Original Request

Agents with skills (reviewer, developer, etc.) don't reliably load their assigned skills when invoked via Task tool from orchestrator/slash commands. The agent knows its system prompt but skips the "First Action" skill loading when given task-focused prompts.

## Type
task

## Initial Context

### Problem Investigation

Testing revealed the following behavior:

| Test | Prompt Style | Skill Loaded? |
|------|--------------|---------------|
| Test 1 | "Describe your first action" | Described correctly (but didn't execute) |
| Test 2 | "Describe conflicts" | Described correctly (but didn't execute) |
| Test 3 | Real task with context | **Skipped skill loading, went straight to files** |
| Test 4 | Explicit "call Skill now" | Actually loaded skills |

### Root Cause

The agent **receives** its system prompt correctly, but when given a **task-focused prompt** (like from slash commands), it prioritizes the task over the "First Action" instruction. It treats skill loading as optional guidance rather than a mandatory first step.

The current instruction in agent definitions like `reviewer.md`:
```markdown
## First Action
Before starting any review, load your skill:
Skill("reviewer-checklist")
```

This is written as guidance, not enforcement. When the Task prompt provides specific work context, the agent prioritizes that context and skips the skill loading step.

### Affected Agents

All agents that have "First Action" skill loading instructions:
- `.claude/agents/reviewer.md` - loads `reviewer-checklist`, `codex`
- `.claude/agents/developer.md` - likely has skills
- `.claude/agents/technical-architect.md` - likely has skills
- `.claude/agents/product-owner.md` - likely has skills
- Other agents in `.claude/agents/` with skill dependencies

**NOT affected:** NextAI flow commands (slash commands) - they work differently

### Potential Solutions

1. **Stronger enforcement in agent definition** - Make the instruction more imperative with explicit blocking language
2. **Include skill loading in the Task prompt itself** - The slash command already tries this, but agent still skips it
3. **Pre-load skills in the prompt** - Instead of telling the agent to load skills, include the skill content directly in the prompt (most reliable but more verbose)

## Acceptance Criteria

- [ ] All agents with skill dependencies actually load their skills before starting work
- [ ] Skill loading works consistently whether invoked directly or via orchestrator/slash commands
- [ ] Solution doesn't require duplicating skill content in multiple places
- [ ] Tested with reviewer agent to confirm fix works

## Notes

- The slash commands (e.g., `/nextai-review`) already include inline instructions to load skills, but agents still bypass them
- This is a behavioral issue with how agents prioritize instructions, not a system prompt loading issue

## NextAI History

The "First Action" pattern was introduced to address this exact issue:

| Commit | Date | Change |
|--------|------|--------|
| `b4279ef` | Dec 7 | Original: `skills:` frontmatter + "Use the skill" in body |
| `4c725b0` | Dec 11 | Added "First Action" pattern to force earlier loading |
| `aed282c` | Dec 23 | Renamed skills, still using "First Action" pattern |
| Current | Dec 24 | Issue identified: agents still skip skill loading |

The "First Action" pattern helped, but didn't fully solve the problem.

## Three Types of Skills

| Type | Example | When Needed | Current Loading |
|------|---------|-------------|-----------------|
| **Phase Skills** | `refinement-product-requirements` | Only during specific workflow phase | Agent `Skill()` call |
| **Role Skills** | What defines a product owner | Always for that agent type | Baked into agent file |
| **Project Skills** | `kotlin`, `android`, `codex` | Context-dependent, user-added | Never loaded by subagents |

The efficiency problem: Old approach (all skills in agent) was bloated. Current approach (agent loads on-demand) is unreliable.

## Framework Research (Updated Dec 24)

Research conducted on 4 frameworks. See full analysis: [attachments/reference/agent-skill-loading-patterns.md](attachments/reference/agent-skill-loading-patterns.md)

### Key Finding: Pre-Load, Don't Post-Load

**None of these frameworks rely on agents following "load this first" instructions.**

| Framework | Pattern | Key Mechanism |
|-----------|---------|---------------|
| **agent-os** | Template composition | `{{workflows/path}}` resolved before agent sees it |
| **opencode** | Skill tool + permissions | Skills listed in tool description, still agent-initiated |
| **BMAD-METHOD** | Step-file architecture | Each step loads focused context fresh |
| **Auto-Claude** | Orchestrator assembly | Prompt fully assembled before agent invocation |

### New Discovery: opencode Skill Tool (Dec 2024)

opencode just shipped a native Skill tool with:
- Skill discovery from `.opencode/skill/` and `.claude/skills/`
- Permission system (`allow`, `deny`, `ask`)
- Skills listed in tool description so agent sees them

**Key insight**: Even with a native Skill tool, opencode still relies on agent choosing to call it. The listing helps but doesn't guarantee loading.

### New Discovery: BMAD Step-File Architecture

BMAD now uses step-file architecture to combat "lost in the middle":
- Each step loads fresh context
- State persists via explicit variables
- No reliance on agent maintaining context across phases

## The Core Tension

| Approach | Pros | Cons |
|----------|------|------|
| **All skills in agent** (old) | Always available | Bloated, inefficient |
| **Agent loads on-demand** (current) | Efficient | Unreliable, agents skip |
| **Orchestrator pre-loads** (recommended) | Reliable + efficient | Requires orchestrator awareness |

## Recommended Solution: Orchestrator-Driven Injection

The slash commands are already the orchestrators. They should:

```
/nextai-refine $id
    │
    ├── Read: agent: product-owner.md (role identity)
    ├── Read: skill: refinement-product-requirements (phase workflow)
    ├── Discover: .nextai/skills/*.md (project skills)
    │
    └── Task(subagent_type: "product-owner")
            prompt: """
            ## Your Role
            [Product owner identity - from agent file]

            ## Your Workflow
            [Phase skill content - PRE-LOADED]

            ## Project Context
            [Project skills - DISCOVERED]

            ## Your Task
            [Specific work to do]
            """
```

### Implementation Phases

**Phase 1: Orchestrator Pre-loading (Immediate)**
- Update slash commands to pre-load phase skills
- Inject skill content directly into Task prompt
- No changes to agent files needed

**Phase 2: Template System (Medium-term)**
- Support `{{skill:name}}` in agent files
- Resolve at sync time
- Update agents to use templates

**Phase 3: Dynamic Project Skill Discovery (Future)**
- Auto-detect relevant project skills
- Based on file types, project structure, user preferences

## Key Insight

> Don't rely on agent instruction-following for critical setup. The orchestrator should handle prompt assembly, not the agent.

## Attachments

- Research: [agent-skill-loading-patterns.md](attachments/reference/agent-skill-loading-patterns.md)
