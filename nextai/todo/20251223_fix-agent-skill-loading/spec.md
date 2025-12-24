# Fix Agent Skill Loading and Add User Skill Support

## Overview

NextAI uses a multi-agent workflow system where orchestrators (slash commands) delegate work to specialized agents. Each agent relies on phase-specific skills to guide their work. Currently, agents fail to reliably load framework skills when instructed via "First Action" directives because agents prioritize task-focused prompts over workflow instructions.

This specification addresses two distinct problems:
1. **Framework skill reliability** - Phase skills don't load reliably when agents are invoked
2. **User skill support** - No mechanism for operators to configure custom skills

The solution involves two separate approaches:
- **Framework skills**: Orchestrator pre-loads skill content and injects it directly into Task prompts (reliable, mandatory)
- **User skills**: Standardized "First Action" section in agents for operator-configured skills (flexible, optional)

## Requirements Summary

### Part 1: Framework Skill Pre-Loading
- Orchestrators (slash commands) must pre-load framework skill content before delegating to agents
- Skill content injected into Task prompts under "## Your Workflow" heading
- Remove unreliable "FIRST ACTION - Load Your Skill" instructions from orchestrator prompts
- Framework skills are workflow-critical and must be guaranteed to be available
- Error handling for missing skill files (fail fast with clear message)

### Part 2: User Skill Support
- All agent files include standardized "First Action" section with operator comment placeholder
- Operators can configure custom skills by replacing placeholder with Skill() calls
- Skill tool added to agent frontmatter for Claude Code (not openCode)
- Empty/unconfigured "First Action" section gracefully continues without errors
- Framework skills and user skills are independent and complementary mechanisms

## Technical Approach

### Framework Skill Pre-Loading (Orchestrator-Side)

The orchestrator commands will read framework skill files and inject the full content into the Task prompt before delegating to agents. This ensures skills are always available without relying on agent behavior.

**Implementation pattern:**
1. Before Task delegation, orchestrator reads skill file using Read tool
2. Skill content injected into Task prompt after context, under "## Your Workflow" heading
3. Agent receives complete skill guidance inline with their instructions
4. Remove old "FIRST ACTION" instructions from orchestrator prompts

### User Skill Support (Agent-Side)

Each agent file will include a standardized "First Action" section that provides a designated location for operator customization. This section is always present but optional to populate.

**Standard format:**
```markdown
## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
```

If operators add custom skills, they replace the comment:
```markdown
## First Action
Before proceeding, load your skill:
Skill("project-kotlin-patterns")
Skill("android-conventions")
```

## Architecture

### Three Types of Skills

| Type | Example | Loading Mechanism | When Available |
|------|---------|-------------------|----------------|
| **Phase Skills** | `refinement-product-requirements` | Orchestrator pre-loads | During specific phase |
| **Role Skills** | Product owner expertise | Baked into agent file | Always for that agent |
| **User Skills** | Custom workflows | Agent loads on-demand | When configured by operator |

### Data Flow

```
Orchestrator Command (e.g., /nextai-refine)
  |
  ├─> Read framework skill file (e.g., refinement-product-requirements/SKILL.md)
  |
  ├─> Construct Task prompt:
  |     - Context (feature ID, input/output paths)
  |     - ## Your Workflow
  |     - [Full framework skill content injected here]
  |     - Specific instructions for this task
  |
  └─> Invoke Task tool with subagent_type and constructed prompt
        |
        └─> Agent receives prompt with embedded skill
              |
              ├─> (Optional) Executes "First Action" if user skills configured
              |
              └─> Proceeds with workflow guided by framework skill
```

## Implementation Details

### Part 1: Orchestrator Command Updates

Five command files need updating to pre-load framework skills:

#### 1. `.claude/commands/nextai-refine.md`

**Phase 1 (product-owner) - Lines 82-92:**

REPLACE:
```markdown
FIRST ACTION - Load Your Skill:
Before starting refinement, you MUST load your assigned skill:
1. Use the Skill tool: Skill("refinement-product-requirements")
2. This skill provides question generation patterns and refinement best practices
3. Follow the skill's guidance for generating clarifying questions

Then proceed with your workflow:
1. Follow the refinement-product-requirements skill for Q&A-based requirements gathering
```

WITH:
```markdown
## Your Workflow

[Insert full content of .claude/skills/refinement-product-requirements/SKILL.md here]

Now proceed with your task using the workflow above.
```

**Phase 2 (technical-architect) - Lines 112-122:**

REPLACE:
```markdown
FIRST ACTION - Load Your Skill:
Before creating the specification, you MUST load your assigned skill:
1. Use the Skill tool: Skill("refinement-technical-specs")
2. This skill provides codebase analysis patterns, technical Q&A, and spec writing templates
3. Follow the skill's guidance for technical analysis, writing spec.md, tasks.md, and testing.md

Then proceed with your workflow:
1. Follow the refinement-technical-specs skill for codebase exploration, technical Q&A, and writing spec.md, tasks.md, and testing.md
```

WITH:
```markdown
## Your Workflow

[Insert full content of .claude/skills/refinement-technical-specs/SKILL.md here]

Now proceed with your task using the workflow above.
```

**Bug investigation (investigator) - Lines 202-209:**

REPLACE:
```markdown
FIRST ACTION - Load Your Skills:
Before starting investigation, you MUST load your assigned skills:
1. Use the Skill tool: Skill("root-cause-tracing")
2. Use the Skill tool: Skill("systematic-debugging")
3. These skills provide debugging methodologies and tracing patterns
4. Follow the skills' guidance throughout the investigation

Then proceed with your workflow:
```

WITH:
```markdown
## Your Workflow

[Insert full content of .claude/skills/testing-investigator/SKILL.md here]

Now proceed with your task using the workflow above.
```

**Bug fix spec (technical-architect) - Lines 236-243:**

Same replacement as Phase 2 above (technical-specs skill).

#### 2. `.claude/commands/nextai-implement.md`

**Lines 91-97:**

REPLACE:
```markdown
FIRST ACTION - Load Your Skill:
Before starting implementation, you MUST load your assigned skill:
1. Use the Skill tool: Skill("executing-plans")
2. This skill provides implementation patterns and task execution best practices
3. Follow the skill's guidance throughout your work

Then proceed with your workflow:
```

WITH:
```markdown
## Your Workflow

[Insert full content of .claude/skills/executing-plans/SKILL.md here]

Now proceed with your task using the workflow above.
```

#### 3. `.claude/commands/nextai-review.md`

**Lines 95-101:**

REPLACE:
```markdown
FIRST ACTION - Load Your Skill:
Before starting the review, you MUST load your assigned skill:
1. Use the Skill tool: Skill("reviewer-checklist")
2. This skill provides code review checklists and evaluation patterns
3. Follow the skill's guidance for thorough code review

Then proceed with your workflow:
```

WITH:
```markdown
## Your Workflow

[Insert full content of .claude/skills/reviewer-checklist/SKILL.md here]

Now proceed with your task using the workflow above.
```

#### 4. `.claude/commands/nextai-complete.md`

**Step 1 (document-writer) - Lines 101-108:**

REPLACE:
```markdown
FIRST ACTION - Load Your Skill:
Before generating the summary, you MUST load your assigned skill:
1. Use the Skill tool: Skill("documentation-recaps")
2. This skill provides summary writing patterns and documentation standards
3. Follow the skill's guidance throughout the summary generation

Then proceed with your workflow:
```

WITH:
```markdown
## Your Workflow

[Insert full content of .claude/skills/documentation-recaps/SKILL.md here]

Now proceed with your task using the workflow above.
```

**Step 4 (document-writer) - Lines 151-158:**

Same replacement as Step 1 above (documentation-recaps skill).

#### 5. `.claude/commands/nextai-testing.md`

This command does NOT currently have skill loading instructions because it's conversational, not agent-based. The investigator skill is loaded in nextai-refine for bug investigation. No changes needed for nextai-testing.

### Part 2: Agent File Updates

Seven agent files need standardization:

#### 1. `.claude/agents/product-owner.md`

**Current "First Action" section (lines 9-13):**
```markdown
## First Action
Before starting any requirements gathering, load your skill:
Skill("refinement-product-requirements")

This skill guides you through confidence-based Q&A loops (max 3 rounds, target 95% confidence).
```

**REPLACE WITH:**
```markdown
## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
```

**Add Skill to frontmatter tools:**
```yaml
---
name: product-owner
description: Gathers requirements via confidence-based Q&A loop
role: product_research
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
---
```

#### 2. `.claude/agents/technical-architect.md`

**Current "First Action" section (lines 9-13):**
```markdown
## First Action
Before starting any specification work, load your skill:
Skill("refinement-technical-specs")

This skill guides you through codebase exploration, technical Q&A, and creating spec.md, tasks.md, and testing.md with proper structure.
```

**REPLACE WITH:**
```markdown
## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
```

**Add Skill to frontmatter tools:**
```yaml
---
name: technical-architect
description: Creates technical specifications and implementation plans
role: tech_spec
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
---
```

#### 3. `.claude/agents/developer.md`

**Current "First Action" section (lines 9-13):**
```markdown
## First Action
Before starting any implementation, load your skill:
Skill("executing-plans")

This skill provides step-by-step task execution patterns.
```

**REPLACE WITH:**
```markdown
## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
```

**Add Skill to frontmatter tools:**
```yaml
---
name: developer
description: Implements tasks from the task list
role: developer
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
---
```

#### 4. `.claude/agents/reviewer.md`

**Current "First Action" section (lines 18-23):**
```markdown
## First Action
Before starting any review, load your skill:
Skill("reviewer-checklist")
Skill("codex")

This skill provides comprehensive code review categories and evaluation patterns.
```

**REPLACE WITH:**
```markdown
## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
```

**Frontmatter already has Skill tool - no change needed.**

#### 5. `.claude/agents/investigator.md`

**Current "First Action" section (lines 9-12):**
```markdown
## First Action
Before starting any investigation, load your skills:
1. Skill("root-cause-tracing") - for backward tracing from symptoms to cause
2. Skill("systematic-debugging") - for structured 4-phase debugging
```

**REPLACE WITH:**
```markdown
## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
```

**Add Skill to frontmatter tools:**
```yaml
---
name: investigator
description: Root-cause analysis for bugs
role: investigator
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
---
```

#### 6. `.claude/agents/document-writer.md`

**Current "First Action" section (lines 9-13):**
```markdown
## First Action
Before starting any documentation work, load your skill:
Skill("documentation-recaps")

This skill operates in two modes: Analyze (create/update project docs) and Complete (generate feature summaries).
```

**REPLACE WITH:**
```markdown
## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
```

**Add Skill to frontmatter tools:**
```yaml
---
name: document-writer
description: Updates documentation and changelog
role: documentation
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
---
```

#### 7. `.claude/agents/ai-team-lead.md`

**ADD "First Action" section after line 21 (after </EXTREMELY_IMPORTANT> block):**
```markdown
## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here, e.g., Skill("my-project-skill") -->
```

**Add Skill to frontmatter tools:**
```yaml
---
name: ai-team-lead
description: Main orchestrator that routes work to specialized agents
role: orchestrator
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - SlashCommand
  - Skill
---
```

## Error Handling

### Missing Framework Skill Files

When an orchestrator cannot read a required framework skill file, the command must fail immediately with a clear error message:

```
Error: Framework skill not found

Could not read: .claude/skills/refinement-product-requirements/SKILL.md

This skill is required for the refinement phase.

Please ensure the skill file exists and is readable.
```

Implementation: Use Read tool with error checking before constructing Task prompt.

### Empty/Missing User Skills

When an agent's "First Action" section contains only the placeholder comment (no user skills configured), the agent simply continues to its normal workflow. No error, warning, or special handling required.

The placeholder comment is ignored by the LLM, resulting in a graceful no-op.

## Testing Strategy

### Part 1: Framework Skill Pre-Loading

**Manual Testing:**
1. Run `/nextai-refine <test-feature-id>`
2. Observe Task delegation to product-owner
3. Verify product-owner receives full skill content in prompt
4. Confirm product-owner follows skill workflow without calling Skill() tool
5. Repeat for technical-architect phase
6. Test all 5 commands with their respective skills

**Error Testing:**
1. Temporarily rename a skill file
2. Run command that requires it
3. Verify clear error message displayed
4. Restore skill file

### Part 2: User Skill Support

**Empty Configuration Test:**
1. Leave "First Action" section with placeholder comment
2. Invoke agent directly or via orchestrator
3. Verify agent continues normally without errors

**Custom Skill Test:**
1. Create a test skill in `.claude/skills/test-custom-skill/SKILL.md`
2. Add to agent's "First Action": `Skill("test-custom-skill")`
3. Invoke agent
4. Verify agent loads and follows custom skill

**Combined Test:**
1. Configure user skill in agent's "First Action"
2. Invoke agent via orchestrator (which pre-loads framework skill)
3. Verify both skills are available to agent
4. Confirm no conflicts between framework and user skills

### Integration Testing

**Complete Workflow Test:**
1. Run full workflow: `/nextai-refine` → `/nextai-implement` → `/nextai-review`
2. Verify each phase receives appropriate framework skill
3. Observe skill guidance being followed
4. Confirm all phases complete successfully

## Alternatives Considered

### Alternative 1: Template System with {{skill:name}} Syntax

**Approach:** Agent files include `{{skill:name}}` placeholders that are resolved at runtime.

**Rejected because:**
- Adds complexity for Phase 2 (not in current scope)
- Requires template resolution logic in orchestrator
- Doesn't solve immediate reliability problem
- Can be added later if needed

### Alternative 2: Dynamic Project Skill Discovery

**Approach:** Orchestrator scans project for skills and auto-injects relevant ones.

**Rejected because:**
- Out of scope for this task (Phase 3)
- Requires skill metadata and matching logic
- Doesn't address user skill customization
- Can be future enhancement

### Alternative 3: Agent-Side Skill Loading with Mandatory Enforcement

**Approach:** Keep current pattern but add validation that skills were loaded.

**Rejected because:**
- Doesn't solve root cause (agents skip "First Action")
- Adds complexity to detect whether skill was loaded
- Still relies on unreliable agent behavior
- Framework research shows pre-loading is more reliable

### Alternative 4: Merge User Skills into Framework Skills

**Approach:** Operators configure all skills (framework + custom) in one location.

**Rejected because:**
- Mixes concerns (workflow-critical vs. optional customization)
- Requires orchestrator to know about user-configured skills
- Less flexible for operators
- Framework skills should remain orchestrator-managed for reliability

## API/Interface Changes

No external API changes. All changes are internal to NextAI command templates and agent definitions.

## Data Model

No database or data structure changes. All changes are to markdown configuration files.

## Security Considerations

- Skill files are read from trusted `.claude/skills/` directory
- No user input directly injected into skill paths (skill names are hardcoded in orchestrators)
- User-configured skills in "First Action" are operator-controlled (trusted)
- No elevation of privileges or access to sensitive data

## Existing Code to Leverage

**Patterns to follow:**
- Current Task delegation pattern in orchestrator commands
- Current Read tool usage for file access
- Current agent frontmatter structure for tools configuration
- Current skill file structure (frontmatter + markdown content)

**Components to reuse:**
- Existing Read tool for skill file access
- Existing Task tool for agent delegation
- Existing skill files (no modifications to skill content)
- Existing agent role definitions

**Services to extend:**
- None - this is configuration-only change

## Notes for Implementation

1. **Order of operations:** Update command files first (Part 1), then agent files (Part 2)
2. **Testing between parts:** Part 1 can be tested independently before Part 2
3. **Skill content injection:** Use Read tool to get full skill content, then inject verbatim
4. **Line number references:** May shift during implementation; use content matching
5. **Frontmatter format:** Preserve existing YAML structure when adding tools list
6. **Comment format:** Use HTML comment syntax `<!-- -->` for operator placeholder
