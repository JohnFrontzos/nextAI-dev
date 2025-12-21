# Feature: MCP installation prompt

## Original Request
During NextAI initialization or setup, prompt the user to install recommended MCP (Model Context Protocol) servers that enhance the AI workflow experience:

1. **Context7 MCP** - For up-to-date library documentation lookup
2. **Jira MCP** - If user uses Jira for issue tracking
3. **Linear MCP** - If user uses Linear for issue tracking

The goal is to make it easy for users to set up a productive AI-assisted development environment with relevant integrations.

## Type
feature

## Initial Context
MCP servers extend Claude's capabilities by providing real-time access to external tools and data sources. Core MCPs that would benefit NextAI users include:

- **Context7**: Provides current documentation for libraries/frameworks, essential for accurate coding assistance
- **Issue Tracker MCPs**: Enable direct integration with project management tools (Jira, Linear) for reading/updating issues

The feature should:
- Detect which MCP servers are already installed (check Claude config)
- Present a selection UI for recommended MCPs
- Ask which issue tracker the user uses (if any)
- Provide installation guidance or automate installation where possible
- Handle the case where user has no issue tracker

## Acceptance Criteria
- [ ] Detect existing MCP server configurations in Claude settings
- [ ] Prompt user to install Context7 MCP if not present
- [ ] Ask user if they use Jira or Linear for issue tracking
- [ ] Offer appropriate MCP installation based on user's issue tracker choice
- [ ] Provide clear installation instructions or automated setup
- [ ] Allow user to skip/defer MCP installation
- [ ] Work across supported platforms (Windows, macOS, Linux)

## Notes
- Consider adding this to `nextai init` flow
- May need to handle different Claude Code configuration locations
- Should be non-blocking - users should be able to proceed without MCPs
- Future: Could extend to other useful MCPs (GitHub, filesystem, etc.)

## Attachments
None
