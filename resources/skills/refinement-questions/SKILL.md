# Refinement Questions

Product research Q&A loop for gathering requirements.

## Purpose
Generate numbered clarifying questions with proposed answers to gather complete product requirements before technical specification.

## Process

### Phase 1: Initial Analysis
1. Read the initialization document thoroughly
2. Identify key ambiguities and gaps
3. Note any missing context

### Phase 2: Question Generation
Generate 5-10 numbered questions covering:
- **Scope**: What's included/excluded
- **User stories**: Who will use this feature and how
- **Edge cases**: Error handling, limits, special conditions
- **Integration**: How it connects with existing features
- **UI/UX**: Visual requirements, interactions
- **Data**: What data is needed, stored, displayed
- **Reusability**: Existing similar features to leverage

### Question Format
Each question should:
1. Be numbered for easy reference
2. Include a proposed answer based on your analysis
3. Ask for confirmation or correction

Example:
```
1. **Authentication method**: I assume we'll use JWT tokens for session management. Is that correct, or should we use session cookies?

2. **User roles**: The initialization mentions "admin" access. Are there other roles (e.g., viewer, editor)?
```

### Phase 3: Visual Assets
Always ask:
- Do you have any mockups, wireframes, or screenshots to share? → Store in `attachments/design/`
- Are there any existing visual references we should follow?
- Run `ls attachments/design/` to check for any images the user added; describe what you find.

### Phase 4: Reusability Check
Always ask:
- Are there existing features in this codebase that implement similar functionality?
- Should we reuse any existing components or patterns?

## Output
Write all Q&A results to `planning/requirements.md` with:
- Summary of the feature
- Numbered Q&A pairs
- Out of scope section
- Visual assets received
- Reusability notes

## Confidence-Based Loop
- After each round of answers, assess confidence level
- If <95% confident, ask 1-3 follow-up questions
- Maximum 3 rounds of questions
- If still <95% after 3 rounds, warn and proceed with noted gaps
