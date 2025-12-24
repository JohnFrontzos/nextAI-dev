# Agent Skill/Prompt Loading Patterns Research

**Research Date**: 2025-12-24
**Updated**: 2025-12-24 (Added opencode Skill tool, BMAD step-file architecture, NextAI history)
**Problem**: Agents don't reliably load their assigned skills when invoked via orchestrator

---

## Executive Summary

**The Issue**: When agents are spawned via Task tool with task-focused prompts, they skip "First Action" skill loading and jump straight to work.

**History in NextAI**:
- Commit `b4279ef` (Dec 7) - Original approach: `skills:` frontmatter + inline "Use the skill" instructions
- Commit `4c725b0` (Dec 11) - Added "First Action" pattern to force skill loading earlier
- Current state: Agents still skip skill loading despite "First Action" instructions

**Key Finding from Research**: No major framework relies on agents following "load this first" instructions. They all pre-load content before invoking agents.

**New Discovery (Dec 24)**: opencode just shipped a native Skill tool with on-demand loading and permission controls - but it's agent-initiated, not orchestrator-enforced.

---

## The Problem

When an agent (e.g., reviewer) is spawned via Task tool, it receives its system prompt but skips the "First Action" skill loading instruction, jumping straight to the task work.

Example from our reviewer agent:
```markdown
## First Action
Before starting any review, load your skill:
Skill("reviewer-checklist")
```

This instruction is often ignored, causing the agent to work without its specialized knowledge.

### Three Types of Skills in NextAI

| Type | Example | When Needed | Current Loading |
|------|---------|-------------|-----------------|
| **Phase Skills** | `refinement-product-requirements` | Only during specific workflow phase | Agent `Skill()` call |
| **Role Skills** | What defines a product owner | Always for that agent type | Baked into agent file |
| **Project Skills** | `kotlin`, `android`, `codex` | Context-dependent, user-added | Never loaded by subagents |

### The Efficiency Problem

Old approach (all skills in agent) was inefficient:
- Agent loads refinement skill even when just answering a product question
- Bloated prompts with unnecessary context

Current approach (agent loads on-demand) is unreliable:
- Agents skip "First Action" when given task-focused prompts
- Project skills never get loaded by subagents

---

## Framework Analysis

### 1. agent-os (Brian Casel / Builder Methods)

**Architecture**: Template-based prompt composition with workflow injection

**Key Pattern**: Pre-load content via template variables, not "load first" instructions

**How it works**:
```markdown
# Agent file: implementer.md
---
name: implementer
description: Use proactively to implement a feature
tools: Write, Read, Bash, WebFetch, Playwright, Skill
---

You are a full stack software developer...

{{workflows/implementation/implement-tasks}}

{{UNLESS standards_as_claude_code_skills}}
## User Standards & Preferences Compliance
{{standards/*}}
{{ENDUNLESS standards_as_claude_code_skills}}
```

**Skills/Knowledge Injection**:
- Uses Handlebars template variables: `{{workflows/path/to/content}}`
- Content is pre-loaded and compiled into the final prompt
- No runtime "load this file" instructions needed
- Agent receives fully assembled prompt with all knowledge included

**Delegation Pattern**:
```markdown
### PHASE 2: Delegate to implementer subagent

Provide to the subagent:
- The specific task group(s) from `tasks.md`
- The path to spec.md
- The path to requirements.md

Instruct the subagent to:
1. Analyze the provided spec
2. Analyze patterns in codebase
3. Implement the task
```

**Strengths**:
- Predictable: Agent always has full context
- No skipped steps: Everything is pre-loaded
- Clear separation: Orchestrator handles composition, agent handles execution

**Relevant to our issue**: They don't rely on agents following "load X first" instructions

---

### 2. opencode (TypeScript/Node.js) - **NEW: Native Skill Tool (Dec 2024)**

**Architecture**: Configuration-based agent system with native Skill tool

**Major Update**: opencode just shipped a native `skill` tool that provides on-demand skill loading with permission controls.

**Skill Discovery** (`src/skill/skill.ts`):
```typescript
const SKILL_GLOB = new Bun.Glob("skill/**/SKILL.md")

export const state = Instance.state(async () => {
  const directories = await Config.directories()
  const skills: Record<string, Info> = {}

  for (const dir of directories) {
    for await (const match of SKILL_GLOB.scan({ cwd: dir })) {
      const md = await ConfigMarkdown.parse(match)
      skills[parsed.data.name] = {
        name: parsed.data.name,
        description: parsed.data.description,
        location: match,
      }
    }
  }
  return skills
})
```

**Skill Tool** (`src/tool/skill.ts`):
```typescript
export const SkillTool: Tool.Info<typeof parameters> = {
  id: "skill",
  async init(ctx) {
    const skills = await Skill.all()

    // Filter by agent permissions
    let accessibleSkills = skills
    if (ctx?.agent) {
      accessibleSkills = skills.filter((skill) => {
        const action = Wildcard.all(skill.name, ctx.agent.permission.skill)
        return action !== "deny"
      })
    }

    return {
      description: [
        "Load a skill to get detailed instructions for a specific task.",
        "<available_skills>",
        ...accessibleSkills.flatMap((skill) => [
          `  <skill><name>${skill.name}</name><description>${skill.description}</description></skill>`,
        ]),
        "</available_skills>",
      ].join(" "),
      // ... execute loads skill content on demand
    }
  },
}
```

**Skill Locations** (from docs):
- `.opencode/skill/<name>/SKILL.md` - Project-local
- `~/.opencode/skill/<name>/SKILL.md` - Global
- `.claude/skills/<name>/SKILL.md` - Claude-compatible

**Permission System**:
```json
{
  "permission": {
    "skill": {
      "pr-review": "allow",
      "internal-*": "deny",
      "experimental-*": "ask",
      "*": "allow"
    }
  }
}
```

**Key Insight**: opencode's approach is still agent-initiated (agent calls `skill({ name: "X" })`), but:
- Skills are listed in tool description - agent always sees available skills
- Permission system controls access
- Agent can be explicitly denied skill tool: `tools: { skill: false }`

**Relevant to our issue**: Even with a native Skill tool, opencode still relies on agent choosing to call it. The tool description includes available skills, which may help agents remember to use them, but doesn't guarantee it.

---

### 3. BMAD-METHOD (Step-File Architecture) - **UPDATED Dec 2024**

**Architecture**: Step-file workflow architecture for focused execution

**Major Update**: BMAD now uses step-file architecture to combat "lost in the middle" problem.

**New Workflow Pattern** (`quick-dev/workflow.md`):
```markdown
# Quick Dev Workflow

## WORKFLOW ARCHITECTURE

This uses **step-file architecture** for focused execution:

- Each step loads fresh to combat "lost in the middle"
- State persists via variables: `{baseline_commit}`, `{execution_mode}`
- Sequential progression through implementation phases

## INITIALIZATION

### Configuration Loading
Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:
- `user_name`, `communication_language`, `user_skill_level`
- `output_folder`, `sprint_artifacts`

### Related Workflows
- `create_tech_spec_workflow` = `{project-root}/_bmad/bmm/workflows/.../workflow.yaml`
- `party_mode_exec` = `{project-root}/_bmad/core/workflows/party-mode/workflow.md`

## EXECUTION
Load and execute `steps/step-01-mode-detection.md` to begin the workflow.
```

**Step Files** (each step is a separate file):
- `step-01-mode-detection.md` - Detect execution mode
- `step-02-context-gathering.md` - Load relevant context
- `step-03-execute.md` - Perform the work
- `step-04-self-check.md` - Validate work
- `step-05-adversarial-review.md` - Critical review
- `step-06-resolve-findings.md` - Fix issues

**Key Insight**: BMAD moved from monolithic agent files to step-file architecture because:
1. Each step loads fresh - no "lost in the middle" degradation
2. State persists via explicit variables, not implicit context
3. Agent focus stays sharp on current step only

**Compilation Process** (still exists for agents):
```
agent.yaml → Handlebars processing → XML generation → frontmatter.md
```

**Skills/Knowledge Injection**:
- Agent YAML defines persona, prompts, menu items
- Compiler processes Handlebars variables at install time
- Final `.md` file contains complete XML structure with all prompts embedded
- Agent receives fully compiled prompt, no external loading needed

**Relevant to our issue**:
1. Content is pre-compiled, not loaded on demand
2. Step-file architecture addresses "lost in middle" (similar to our issue)
3. Each phase loads its own focused context rather than trying to maintain it all

---

### 4. Auto-Claude (Python)

**Architecture**: Function-based prompt assembly with dynamic context injection

**How it works**:
```python
# prompts_pkg/prompts.py
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

def get_planner_prompt(spec_dir: Path) -> str:
    """Load planner agent prompt with spec path injected."""
    prompt_file = PROMPTS_DIR / "planner.md"
    prompt = prompt_file.read_text()

    # Inject spec context at the beginning
    spec_context = f"""## SPEC LOCATION
Your spec file: `{spec_dir}/spec.md`

FILES YOU MUST CREATE:
- `{spec_dir}/implementation_plan.json`
- `{spec_dir}/build-progress.txt`
---
"""
    return spec_context + prompt

def get_coding_prompt(spec_dir: Path) -> str:
    """Load coding agent prompt with spec path injected."""
    prompt_file = PROMPTS_DIR / "coder.md"
    prompt = prompt_file.read_text()

    spec_context = f"""## SPEC LOCATION
Your files:
- Spec: `{spec_dir}/spec.md`
- Plan: `{spec_dir}/implementation_plan.json`
---
"""

    # Add recovery context if exists
    recovery_context = _get_recovery_context(spec_dir)
    if recovery_context:
        spec_context += recovery_context

    return spec_context + prompt
```

**Agent Runner**:
```python
# spec/pipeline/agent_runner.py
class AgentRunner:
    async def run_agent(
        self,
        prompt_file: str,
        additional_context: str = "",
        prior_phase_summaries: str | None = None,
    ) -> tuple[bool, str]:

        # Load prompt
        prompt = prompt_path.read_text()

        # Add context
        prompt += f"\n\n---\n\n**Spec Directory**: {self.spec_dir}\n"
        prompt += f"**Project Directory**: {self.project_dir}\n"

        # Add prior phase summaries (compaction)
        if prior_phase_summaries:
            prompt += f"\n{prior_phase_summaries}\n"

        if additional_context:
            prompt += f"\n{additional_context}\n"

        # Create client and send complete prompt
        client = create_client(...)
        await client.query(prompt)
```

**Skills/Knowledge Injection**:
- Orchestrator loads base prompt from file
- Orchestrator injects dynamic context (paths, summaries, recovery info)
- Complete prompt assembled before sending to agent
- Agent receives fully prepared prompt

**Strengths**:
- Flexible context injection
- Recovery context automatically added
- Human intervention support
- All assembly happens before agent invocation

**Relevant to our issue**: System assembles complete prompt, agent doesn't load anything

---

## Common Patterns Across Frameworks

### 1. Pre-Loading, Not Post-Loading
All frameworks load content BEFORE sending to agent, not asking agent to load it

### 2. System Responsibility
The orchestrator/system is responsible for prompt assembly, not the agent

### 3. Template/Variable Injection
- **agent-os**: `{{workflows/path}}`
- **BMAD-METHOD**: Handlebars + compilation
- **Auto-Claude**: Python string composition
- **opencode**: Config property + file imports

### 4. No "Load First" Instructions
None rely on agents following "Before you start, load X" instructions

### 5. Configuration-Driven
Agent capabilities defined in config/manifest, not in runtime instructions

---

## Our Current Approach vs. Best Practices

### What We Do (Current)
```markdown
# .nextai/agents/reviewer.md
---
name: reviewer
---

## First Action
Before starting any review, load your skill:
Skill("reviewer-checklist")

## Your Role
- Review code changes
...
```

**Problem**: Agent often skips "First Action" and goes straight to task

### What We Should Do (Recommended)

**Option 1: Pre-load skills in orchestrator**
```typescript
// When spawning reviewer agent
const skillContent = await loadSkill("reviewer-checklist");
const agentPrompt = reviewerAgent.prompt;
const fullPrompt = `${agentPrompt}\n\n${skillContent}`;

Task(fullPrompt, { task: "Review implementation" });
```

**Option 2: Template variable substitution**
```markdown
# .nextai/agents/reviewer.md
---
name: reviewer
skills:
  - reviewer-checklist
---

You are the Reviewer agent.

{{skill:reviewer-checklist}}

## Your Role
- Review code changes
```

Then orchestrator resolves `{{skill:*}}` before invoking agent.

**Option 3: Compile skills into agent manifest**
```typescript
// At sync time
const agentFile = readFile('.nextai/agents/reviewer.md');
const skills = extractSkillReferences(agentFile);
const compiledPrompt = agentFile;

for (const skill of skills) {
  const skillContent = readFile(`.nextai/skills/${skill}/SKILL.md`);
  compiledPrompt += `\n\n## ${skill} Knowledge\n${skillContent}`;
}

writeFile('.claude/agents/reviewer.md', compiledPrompt);
```

---

## Recommendations for NextAI

### Immediate Fix (Low Effort)

**Modify orchestrator to pre-load skills**:

1. Parse agent file for `Skill()` calls
2. Load referenced skills before spawning agent
3. Inject skill content into task prompt

```typescript
// src/core/orchestration/task-spawner.ts
function spawnAgent(agentName: string, task: string) {
  const agent = loadAgent(agentName);
  const skills = extractSkillCalls(agent.prompt);

  let fullPrompt = agent.prompt;
  for (const skill of skills) {
    const skillContent = loadSkill(skill);
    fullPrompt += `\n\n## ${skill}\n${skillContent}`;
  }

  Task(fullPrompt, { task });
}
```

### Medium-term Solution (Moderate Effort)

**Template variable system**:

1. Support `{{skill:name}}` in agent files
2. Resolve at sync time (compile) or runtime (dynamic)
3. Update sync command to handle resolution

```markdown
# .nextai/agents/reviewer.md
---
name: reviewer
---

{{skill:reviewer-checklist}}

You are the Reviewer agent...
```

### Long-term Solution (Higher Effort)

**Full compilation pipeline** (like BMAD-METHOD):

1. Source agents use YAML with references
2. Sync command compiles to final markdown
3. All skills/workflows embedded at compile time
4. No runtime loading needed

---

## Key Insights

1. **Don't rely on agent instruction-following for critical setup**
   - Agents may skip "First Action" sections
   - System should handle setup, not agent

2. **Pre-load beats post-load**
   - Load content before invoking agent
   - Agent receives complete context immediately

3. **Configuration over convention**
   - Define agent needs in metadata (frontmatter, YAML)
   - System reads metadata and fulfills requirements

4. **Template systems work well**
   - Variable substitution is predictable
   - Can be static (compile-time) or dynamic (runtime)

5. **Orchestrator should orchestrate**
   - Assembling context is orchestrator's job
   - Agent's job is to execute with given context

---

## Next Steps

1. Implement quick fix: Pre-load skills in Task spawning code
2. Add `{{skill:name}}` template support to agent files
3. Update sync command to resolve templates
4. Consider YAML-based agent definitions for future
5. Document new agent creation patterns

---

## Files to Modify

1. `src/core/orchestration/task-spawner.ts` - Add skill pre-loading
2. `src/core/sync/claude-code.ts` - Add template resolution
3. `.nextai/agents/*.md` - Update to use templates instead of Skill() calls
4. `docs/agent-development.md` - Document new pattern

---

## Synthesis: What This Means for NextAI

### The Core Tension

| Approach | Pros | Cons |
|----------|------|------|
| **All skills in agent** (old) | Always available | Bloated, inefficient |
| **Agent loads on-demand** (current) | Efficient | Unreliable, agents skip |
| **Orchestrator pre-loads** (recommended) | Reliable + efficient | Requires orchestrator awareness |

### Why "First Action" Doesn't Work

1. **LLM attention economics**: When given a task-focused prompt, agents prioritize the task over setup instructions
2. **Lost in the middle**: Even if the instruction is there, it may be deprioritized
3. **No enforcement**: There's no mechanism to REQUIRE skill loading before work

### What Other Frameworks Do Differently

| Framework | Pattern | Key Mechanism |
|-----------|---------|---------------|
| agent-os | Template composition | `{{workflows/path}}` resolved before agent sees it |
| opencode | Skill tool + permissions | Skills listed in tool description, but still agent-initiated |
| BMAD | Step-file architecture | Each step loads focused context fresh |
| Auto-Claude | Orchestrator assembly | Prompt fully assembled before agent invocation |

### Recommended Hybrid Approach for NextAI

**Phase 1: Orchestrator-Driven Injection (Immediate)**

The slash commands are already the orchestrators. They should:
1. Read agent definition to get role identity
2. Pre-load the phase skill based on what phase is being run
3. Discover project skills from `.nextai/skills/`
4. Inject all relevant content into the Task prompt

```
/nextai-refine $id
    │
    ├── Read: agent: product-owner.md (role)
    ├── Read: skill: refinement-product-requirements (phase)
    ├── Discover: .nextai/skills/*.md (project)
    │
    └── Task(subagent_type: "product-owner")
            prompt: """
            ## Your Role
            [Product owner identity]

            ## Your Workflow
            [Phase skill content - PRE-LOADED]

            ## Project Context
            [Project skills - DISCOVERED]

            ## Your Task
            [Specific work]
            """
```

**Phase 2: Template System (Medium-term)**

Support `{{skill:name}}` in agent files, resolved at sync time:
```markdown
# .nextai/agents/reviewer.md
---
name: reviewer
---

{{skill:reviewer-checklist}}

You are the Reviewer agent...
```

**Phase 3: Dynamic Project Skill Discovery (Future)**

Auto-detect and inject relevant project skills based on:
- File types in changes (e.g., `.kt` → inject `kotlin` skill)
- Project structure (e.g., `android/` → inject `android` skill)
- User preferences (e.g., always include `codex`)

---

## References

- **agent-os**: https://github.com/buildermethods/agent-os
- **opencode**: https://github.com/sst/opencode
- **BMAD-METHOD**: https://github.com/bmad-code-org/BMAD-METHOD
- **Auto-Claude**: https://github.com/AndyMik90/Auto-Claude

---

## NextAI History

| Commit | Date | Change |
|--------|------|--------|
| `b4279ef` | Dec 7 | Original: `skills:` frontmatter + "Use the skill" in body |
| `4c725b0` | Dec 11 | Added "First Action" pattern to force earlier loading |
| `aed282c` | Dec 23 | Renamed skills, still using "First Action" pattern |
| Current | Dec 24 | Issue identified: agents still skip skill loading |
