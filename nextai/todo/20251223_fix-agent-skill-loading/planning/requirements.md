# Requirements: Fix Agent Skill Loading and Add User Skill Support

## Product Context

NextAI uses a multi-agent workflow system where orchestrator commands (slash commands) delegate work to specialized agents via the Task tool. Each agent has a specific role (product-owner, technical-architect, developer, reviewer, document-writer, investigator) and relies on phase-specific skills to guide their work.

The current pattern instructs agents to load their skills using a "First Action" directive in their system prompts, but testing revealed that agents skip this step when given task-focused prompts, treating skill loading as optional guidance rather than a mandatory first step.

### Three Types of Skills

NextAI has three distinct types of skills:

| Type | Example | When Needed | Current Loading |
|------|---------|-------------|-----------------|
| **Phase Skills** | `refinement-product-requirements` | Only during specific workflow phase | Agent Skill() call (unreliable) |
| **Role Skills** | What defines a product owner | Always for that agent type | Baked into agent file |
| **User/Operator Skills** | Custom workflows, project context | User-configured per agent | Not currently supported |

This task addresses TWO problems:
1. **Framework skill reliability** - Phase skills don't load reliably
2. **User skill support** - No mechanism for operators to add custom skills

## Initial Description

**Part 1 (Original):** Agents with skills (reviewer, developer, etc.) don't reliably load their assigned skills when invoked via Task tool from orchestrator/slash commands. The agent knows its system prompt but skips the "First Action" skill loading when given task-focused prompts.

Testing revealed:
- When asked "Describe your first action" - agents describe the skill loading correctly (but don't execute)
- When given real tasks with context - agents skip skill loading entirely and go straight to work
- When explicitly told "call Skill now" - agents actually load skills

Root cause: Agents prioritize task-focused prompts over "First Action" instructions, treating skill loading as optional.

**Part 2 (New Addition):** Operators need the ability to configure custom skills that agents should load. These user-defined skills provide project-specific context, custom workflows, or domain knowledge that the operator wants available to agents. Unlike framework phase skills (which are orchestrator-managed), user skills should be agent-loaded on-demand.

## Requirements Discussion

### Part 1: Framework Skill Pre-Loading

**Q1: Implementation Scope - Which slash commands?**
All slash commands that invoke agents with phase skills:
- `/nextai-refine` (product-owner + technical-architect)
- `/nextai-implement` (developer)
- `/nextai-review` (reviewer)
- `/nextai-complete` (document-writer)
- `/nextai-testing` (investigator)

**Q2: Template Resolution - Implementation Path**
This task focuses ONLY on Phase 1 (orchestrator pre-loading in command templates). Phases 2 and 3 are NOT in scope:
- Phase 1: Orchestrator pre-loads skill content directly into Task prompts
- Phase 2: Template system with `{{skill:name}}` resolution - future
- Phase 3: Dynamic project skill discovery - future

**Q3: Project Skills Discovery**
NOT in scope. Focus ONLY on Phase skills (known at command execution time).

### Part 2: User Skill Support

**Q4: How should user/operator custom skills be configured?**
Each agent definition should have a "First Action" section with an operator comment placeholder:

```markdown
## First Action
Before proceeding, load your skill:
<!-- Operator: Add your custom skills here -->
```

If operators add skills, they replace the comment with Skill() calls:
```markdown
## First Action
Before proceeding, load your skill:
Skill("my-custom-workflow")
Skill("project-specific-context")
```

**Q5: How does this interact with framework skills?**
Framework skills and user skills use DIFFERENT mechanisms and don't conflict:
- **Framework phase skills**: Pre-loaded by orchestrator, injected into Task prompt
- **User custom skills**: Loaded by agent on-demand via Skill() tool call in "First Action"

These are independent and complementary.

**Q6: Should this work for both Claude Code and openCode?**
NO. The Skill tool and "First Action" pattern are ONLY for Claude Code integration:
- **Claude Code agents**: Include Skill tool, can call it in "First Action"
- **openCode agents**: Use openCode's native skill mechanism (different approach)

**Q7: What happens if no user skills are specified?**
The "First Action" section is always present, but if the operator doesn't replace the comment, the agent simply continues without loading user skills. No error, graceful continuation.

**Q8: Should user skills be mandatory or optional?**
Optional. The "First Action" section structure is mandatory (always present in agent files), but populating it with actual skills is optional. Empty = no-op.

**Q9: Does the "First Action" section serve any purpose after orchestrator pre-loading?**
YES. Two purposes:
1. **Direct agent invocation**: When agents are used directly (not via orchestrator), they can still load skills
2. **User skill loading**: Provides a designated place for operators to configure custom skills

### Follow-up Questions

None - all requirements clarified for both parts.

## Existing Code to Reference

### Part 1: Framework Skills (Orchestrator Pre-Loading)

Command templates that need updating:
- `.claude/commands/nextai-refine.md` - Loads `refinement-product-requirements` and `refinement-technical-specs`
- `.claude/commands/nextai-implement.md` - Loads `executing-plans`
- `.claude/commands/nextai-review.md` - Loads `reviewer-checklist`
- `.claude/commands/nextai-complete.md` - Loads `documentation-recaps`
- `.claude/commands/nextai-testing.md` - Loads `testing-investigator`

Phase skills to pre-load:
- `.claude/skills/refinement-product-requirements/SKILL.md`
- `.claude/skills/refinement-technical-specs/SKILL.md`
- `.claude/skills/executing-plans/SKILL.md`
- `.claude/skills/reviewer-checklist/SKILL.md`
- `.claude/skills/documentation-recaps/SKILL.md`
- `.claude/skills/testing-investigator/SKILL.md`

### Part 2: User Skills (Agent Definition Updates)

Agent files that need "First Action" section updates:
- `.claude/agents/product-owner.md` - Currently has basic "First Action", needs operator placeholder
- `.claude/agents/technical-architect.md` - Needs "First Action" section added
- `.claude/agents/reviewer.md` - Currently has "First Action" with multiple skills, needs standardization
- `.claude/agents/developer.md` - Needs "First Action" section added
- `.claude/agents/investigator.md` - Needs "First Action" section added
- `.claude/agents/ai-team-lead.md` - Needs "First Action" section added
- `.claude/agents/document-writer.md` - Needs "First Action" section added

## Visual Assets

No visual assets for this task.

## Requirements Summary

### Problem Statement

Agents do not reliably execute the "First Action" skill loading instruction when invoked via the Task tool. When given task-focused prompts from orchestrators, agents bypass skill loading and proceed directly to work, missing critical workflow guidance contained in their phase skills.

### Root Cause

The "First Action" pattern relies on agent instruction-following, which is unreliable. Framework research (agent-os, opencode, BMAD-METHOD, Auto-Claude) shows that successful systems pre-load context in the orchestrator rather than relying on agents to load it themselves.

### Solution: Orchestrator Pre-Loading

The orchestrator (slash commands) should read skill content and inject it directly into the Task prompt before delegating to agents. This ensures skills are always available without relying on agent behavior.

Current pattern (unreliable):
```markdown
**Instructions for the reviewer subagent:**

FIRST ACTION - Load Your Skill:
Before starting the review, you MUST load your assigned skill:
1. Use the Skill tool: Skill("reviewer-checklist")
2. This skill provides code review checklists and evaluation patterns
3. Follow the skill's guidance for thorough code review
```

New pattern (reliable):
```markdown
**Instructions for the reviewer subagent:**

## Your Workflow

[Full content of reviewer-checklist SKILL.md pre-loaded here]

Then proceed with your work:
1. Follow the checklist above for comprehensive code review
```

### Functional Requirements

#### Part 1: Framework Skill Pre-Loading (Orchestrator Changes)

1. **Skill Content Injection**
   - Orchestrator reads SKILL.md file content before invoking Task tool
   - Full skill content is injected into the Task prompt under a clear heading
   - Agent no longer needs to call Skill() tool for framework phase skills

2. **Command Updates**
   - Update all 5 slash commands to pre-load their respective skills
   - Remove "FIRST ACTION - Load Your Skill" instructions from orchestrator prompts
   - Replace with direct skill content in the Task prompt

3. **Skill-to-Command Mapping**
   - `/nextai-refine` Phase 1 (product-owner): Pre-load `refinement-product-requirements/SKILL.md`
   - `/nextai-refine` Phase 2 (technical-architect): Pre-load `refinement-technical-specs/SKILL.md`
   - `/nextai-implement` (developer): Pre-load `executing-plans/SKILL.md`
   - `/nextai-review` (reviewer): Pre-load `reviewer-checklist/SKILL.md`
   - `/nextai-complete` Step 1 (document-writer): Pre-load `documentation-recaps/SKILL.md`
   - `/nextai-testing` (investigator): Pre-load `testing-investigator/SKILL.md`

4. **Error Handling**
   - If framework skill file cannot be read, command should fail with clear error message
   - Error message should indicate which skill file is missing

#### Part 2: User Skill Support (Agent Definition Changes)

1. **Standard "First Action" Section**
   - Every agent file must include a "First Action" section
   - Section format:
     ```markdown
     ## First Action
     Before proceeding, load your skill:
     <!-- Operator: Add your custom skills here -->
     ```

2. **Operator Customization**
   - Operators can replace the comment with Skill() tool calls
   - Multiple skills allowed (one per line)
   - Example:
     ```markdown
     Skill("project-kotlin-patterns")
     Skill("android-conventions")
     ```

3. **Graceful No-Op**
   - If operator comment remains unchanged, agent continues without loading user skills
   - No error, warning, or interruption
   - Agent proceeds to its normal workflow

4. **Skill Tool Availability**
   - Claude Code agents: Skill tool must be available in frontmatter tools list
   - openCode agents: Do NOT add Skill tool (uses native openCode mechanism)

5. **Independence from Framework Skills**
   - User skills loaded by agent (via Skill tool) are separate from framework skills (pre-loaded by orchestrator)
   - No conflict or overlap between the two mechanisms
   - Both can coexist in the same agent invocation

### Scope Boundaries

**In Scope:**

Part 1 (Framework Skills):
- Direct skill content pre-loading in all 5 slash commands
- Phase skills only (refinement-product-requirements, refinement-technical-specs, etc.)
- Reading SKILL.md files from `.claude/skills/` directory
- Injecting skill content into Task prompt before delegation
- Removing "FIRST ACTION" instructions from orchestrator prompts

Part 2 (User Skills):
- Adding standardized "First Action" section to all 7 agent files
- Operator comment placeholder for custom skill configuration
- Making Skill tool available to Claude Code agents
- Documentation of user skill configuration pattern
- Graceful handling of empty/unconfigured user skills

**Out of Scope:**
- Phase 2: Template system with `{{skill:name}}` syntax in agent files - future
- Phase 3: Dynamic project skill discovery - future
- Role skills (baked into agent definitions) - no changes needed
- openCode-specific skill mechanisms (handled by openCode natively)
- Skill validation, versioning, or permission management
- Auto-discovery of which user skills an agent should load

### Non-Functional Requirements

1. **Performance**
   - Framework skill file reads should not significantly impact command startup time
   - Each skill file is small (typically < 5KB)
   - User skill loading happens on-demand via Skill tool (agent-initiated)

2. **Maintainability**
   - Clear mapping between commands and framework skills
   - Framework skill content injected once per command invocation
   - User skill configuration centralized in "First Action" section
   - No duplication of skill content across multiple locations

3. **Backward Compatibility**
   - Existing skill files remain in their current location
   - No breaking changes to NextAI CLI commands
   - Agent files get additive changes only (adding "First Action" section)

4. **Discoverability**
   - Operators can easily find where to configure custom skills
   - Comment placeholder clearly indicates customization point
   - Pattern is consistent across all agent definitions

5. **Separation of Concerns**
   - Orchestrator handles framework phase skills (reliability-critical)
   - Agent handles user custom skills (flexibility-focused)
   - Clear distinction between the two mechanisms

### Acceptance Criteria

#### Part 1: Framework Skill Pre-Loading

- All 5 slash commands pre-load their respective phase skills before invoking Task tool
- Framework skill content is fully injected into Task prompts under clear headings
- "FIRST ACTION - Load Your Skill" instructions removed from orchestrator prompts
- Agents receive complete framework skill guidance without calling Skill() tool for phase skills
- Error messages displayed if framework skill files cannot be read
- Tested with at least one command (e.g., `/nextai-refine`) to verify skill content is received by agent

#### Part 2: User Skill Support

- All 7 agent files include standardized "First Action" section
- "First Action" section contains operator comment placeholder
- Skill tool is available in Claude Code agent frontmatter (not openCode agents)
- Empty/unconfigured "First Action" section does not cause errors or warnings
- Operators can successfully add custom skills and agents load them via Skill tool
- Framework skills and user skills can coexist without conflict
- Pattern is documented for operator reference

## Files Affected

### Part 1: Framework Skill Pre-Loading

**Command Templates (to be modified):**
- `.claude/commands/nextai-refine.md` - Pre-load phase skills for product-owner and technical-architect
- `.claude/commands/nextai-implement.md` - Pre-load executing-plans for developer
- `.claude/commands/nextai-review.md` - Pre-load reviewer-checklist for reviewer
- `.claude/commands/nextai-complete.md` - Pre-load documentation-recaps for document-writer
- `.claude/commands/nextai-testing.md` - Pre-load testing-investigator for investigator

**Skill Files (to be read, not modified):**
- `.claude/skills/refinement-product-requirements/SKILL.md`
- `.claude/skills/refinement-technical-specs/SKILL.md`
- `.claude/skills/executing-plans/SKILL.md`
- `.claude/skills/reviewer-checklist/SKILL.md`
- `.claude/skills/documentation-recaps/SKILL.md`
- `.claude/skills/testing-investigator/SKILL.md`

### Part 2: User Skill Support

**Agent Files (to be modified):**
- `.claude/agents/product-owner.md` - Update existing "First Action" with operator placeholder
- `.claude/agents/technical-architect.md` - Add "First Action" section
- `.claude/agents/reviewer.md` - Standardize existing "First Action" with operator placeholder
- `.claude/agents/developer.md` - Add "First Action" section
- `.claude/agents/investigator.md` - Add "First Action" section
- `.claude/agents/ai-team-lead.md` - Add "First Action" section
- `.claude/agents/document-writer.md` - Add "First Action" section

**Note:** Skill tool availability in agent frontmatter depends on target environment (Claude Code vs openCode).

## Implementation Notes

### Part 1: Framework Skill Pre-Loading

1. **Reading Skills**
   - Each command should use Read tool to fetch framework skill content
   - Skill files located at `.claude/skills/<skill-name>/SKILL.md`
   - Read should happen before Task tool invocation

2. **Injecting Skills**
   - Skill content should be injected in the Task prompt
   - Inject after "Context to provide" section, before "Instructions" section
   - Use clear heading like "## Your Workflow" or "## Phase Skill Guidance"

3. **Removing "First Action" from Orchestrators**
   - Remove "FIRST ACTION - Load Your Skill" blocks from command prompts
   - Replace with direct skill content injection
   - Agents no longer need to call Skill() for framework phase skills

4. **Maintaining Existing Logic**
   - Keep phase validation, pre-flight checks, and completion logic unchanged
   - Maintain existing prompt structure and delegation patterns
   - Only change: Add skill pre-loading and remove "FIRST ACTION" instructions

### Part 2: User Skill Support

1. **"First Action" Section Format**
   - Standard structure for all agents:
     ```markdown
     ## First Action
     Before proceeding, load your skill:
     <!-- Operator: Add your custom skills here -->
     ```
   - Place immediately after frontmatter/header, before "Your Role" section

2. **Operator Guidance**
   - Comment clearly indicates this is a customization point
   - Operators replace comment with Skill() calls
   - Example in comments or documentation:
     ```markdown
     <!-- Example:
     Skill("project-kotlin-patterns")
     Skill("android-conventions")
     -->
     ```

3. **Skill Tool Availability**
   - Claude Code agents: Add `Skill` to tools list in frontmatter if not present
   - openCode agents: Do NOT add Skill tool (handled differently)

4. **Independence from Framework Skills**
   - User skills are agent-initiated (Skill tool call in "First Action")
   - Framework skills are orchestrator-injected (pre-loaded in Task prompt)
   - Both mechanisms work independently and can coexist

### Testing Strategy

1. **Part 1 Testing**
   - Run `/nextai-refine` on a test feature
   - Verify product-owner agent receives `refinement-product-requirements` skill content
   - Verify technical-architect receives `refinement-technical-specs` skill content
   - Confirm agents don't try to call Skill() for framework skills

2. **Part 2 Testing**
   - Leave "First Action" empty (operator comment intact) - should work with no errors
   - Add a custom user skill - verify agent loads it via Skill tool
   - Test both scenarios with framework skill pre-loading active

3. **Integration Testing**
   - Verify framework skills (pre-loaded) and user skills (agent-loaded) work together
   - Confirm no conflicts between the two mechanisms
   - Test error handling when skill files are missing

## Key Design Decisions

### Decision 1: Separation of Framework and User Skills

**Framework phase skills** (like `refinement-product-requirements`) are workflow-critical and must be reliable. They are pre-loaded by orchestrators.

**User custom skills** (like `project-kotlin-patterns`) are operator-specific and optional. They are loaded on-demand by agents via the Skill tool.

This separation ensures:
- Reliability for critical workflow skills
- Flexibility for operator customization
- No conflict between the two mechanisms

### Decision 2: Keep "First Action" Pattern

Despite moving to orchestrator pre-loading for framework skills, the "First Action" section remains in agent files for:
1. **Direct agent invocation** - When agents are used outside orchestrators
2. **User skill loading** - Provides a designated place for operator customization
3. **Backward compatibility** - Existing pattern is preserved

### Decision 3: Claude Code vs openCode Divergence

The Skill tool and "First Action" pattern are specific to Claude Code integration. openCode has its own native skill mechanism with discovery and permissions.

- **Claude Code**: Use Skill tool in "First Action" for user skills
- **openCode**: Use native openCode skill system (different implementation)

Framework skill pre-loading works the same for both (orchestrator responsibility).

### Decision 4: Graceful Degradation

If the operator doesn't configure custom skills (comment remains unchanged), the agent continues normally. This ensures:
- No breaking changes for existing workflows
- Optional customization doesn't require code changes
- Easy adoption path for operators
