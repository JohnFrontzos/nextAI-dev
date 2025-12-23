# Refinement Product

Use when gathering product requirements — provides Q&A patterns for clarifying feature requests and user needs.

## Purpose
Generate numbered clarifying questions with proposed answers to gather complete product requirements before technical specification.

## Process

### Phase 1: Read Product Context

Before generating questions, understand the broader product context:

1. **Read Product Documentation** (if `nextai/docs/` exists):
   - `nextai/docs/product-overview.md` - Product mission, target users, core problems
   - `nextai/docs/architecture.md` - How the system is structured
   - `nextai/docs/conventions.md` - Coding and design conventions
   - `nextai/docs/technical-guide.md` - Tech stack, testing setup

2. **Review Completed Features** (if `nextai/done/` exists):
   - List folders in `nextai/done/` to see what's been built
   - Read `summary.md` files from recent/relevant completed features
   - Understand patterns and approaches used in similar work

This context helps you:
- Ask more relevant and contextual questions
- Identify existing features that might be reused or referenced
- Ensure the feature aligns with product goals
- Understand established patterns and conventions

### Phase 2: Initial Analysis
1. Read the initialization document thoroughly
2. Identify key ambiguities and gaps
3. Note any missing context from Phase 1

### Phase 3: Question Generation

Generate 4-8 numbered questions covering:
- **Scope**: What's included/excluded
- **User stories**: Who will use this feature and how
- **Edge cases**: Error handling, limits, special conditions
- **Integration**: How it connects with existing features
- **UI/UX**: Visual requirements, interactions
- **Data**: What data is needed, stored, displayed

### Question Format

Each question MUST:
1. Be numbered for easy reference
2. Include a proposed answer based on your analysis
3. Offer an alternative option
4. Use the format: "I assume X. Is that correct, or should we Y?"

Example:
```
Based on your idea for [feature name], I have some clarifying questions:

1. **Authentication method**: I assume we'll use JWT tokens for session management. Is that correct, or should we use session cookies instead?

2. **User roles**: The initialization mentions "admin" access. I assume this is the only role needed. Is that correct, or are there other roles (e.g., viewer, editor)?

3. **Error handling**: I assume validation errors should display inline below each field. Is that correct, or should we use a toast notification instead?
```

### Phase 4: Visual Assets

Always include at the END of your questions:

```
**Visual Assets:**
Do you have any mockups, wireframes, or screenshots to share?

If yes, place them in: `attachments/design/`

Use descriptive filenames like:
- homepage-mockup.png
- dashboard-wireframe.jpg
- form-layout.png
- mobile-view.png
```

**MANDATORY:** After receiving answers, run `ls attachments/design/` to check for images even if user says "no visuals" - users often add files without mentioning them.

If files are found:
- Use Read tool to analyze each visual
- Note key design elements and patterns
- Check filenames for low-fidelity indicators (lofi, wireframe, sketch)

### Phase 5: Reusability Check

Always include this question with your initial questions:

```
**Existing Code Reuse:**
Are there existing features in your codebase with similar patterns we should reference? For example:
- Similar UI components or page layouts
- Comparable forms or workflows
- Related backend logic or services
- Existing models with similar functionality

Please provide file/folder paths or names if they exist.
```

## Output

Write all Q&A results to `planning/requirements.md` with:

```markdown
# Requirements: [Feature Name]

## Product Context
[Summary of relevant info from nextai/docs/ and nextai/done/]

## Initial Description
[User's original description from initialization.md]

## Requirements Discussion

### Questions & Answers

**Q1:** [Question asked]
**Answer:** [User's answer]

**Q2:** [Question asked]
**Answer:** [User's answer]

[Continue for all questions]

### Follow-up Questions (if any)
[Any follow-up Q&A]

## Existing Code to Reference
[Based on user's response about similar features]
- Feature: [Name] - Path: `[path]`
- Components to reuse: [description]

## Visual Assets
[Based on actual ls check, not user statement]
- `filename.png`: [Description from analysis]

## Requirements Summary

### Functional Requirements
- [Core functionality]

### Scope Boundaries
**In Scope:**
- [What will be built]

**Out of Scope:**
- [What won't be built]
```

## Confidence-Based Loop
- After each round of answers, assess confidence level
- If <95% confident, ask 1-3 follow-up questions
- Maximum 3 rounds of questions
- If still <95% after 3 rounds, warn and proceed with noted gaps
