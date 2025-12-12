# Requirements: Add README badges

## Summary
Add professional community badges to the README.md file and create necessary supporting infrastructure (LICENSE file) to signal project credibility, professionalism, and invite community contributions. This enhancement will make the project appear more established and trustworthy to potential users and contributors.

## User Stories
- As a potential user exploring the project, I want to see professional badges so I can quickly assess the project's package version, Node.js requirements, license, and technology stack
- As a potential contributor, I want to see "PRs Welcome" and GitHub stars badges so I understand the project welcomes contributions and has community engagement
- As a maintainer, I want a LICENSE file in the repository root so the license badge works correctly and legal terms are explicitly documented
- As a developer evaluating tools, I want to see TypeScript and Node version badges so I can quickly determine compatibility with my environment

## Functional Requirements

### FR1: LICENSE File Creation
- Create a LICENSE file in the repository root (`c:\Dev\Git\nextai-dev\LICENSE`)
- File must contain the full MIT license text
- License copyright holder should match the project maintainer
- File must be plain text format

### FR2: Badge Row in README.md
- Add a badge row at the top of README.md, immediately after the title/heading
- Include 6 badges in the following order:
  1. npm version badge
  2. Node version badge
  3. License badge
  4. TypeScript badge
  5. PRs Welcome badge
  6. GitHub stars badge
- Badges must be in markdown format using shields.io
- Each badge must be clickable and link to the appropriate destination

### FR3: Badge Configuration
**npm version badge**
- URL: `https://img.shields.io/npm/v/@frontztech/nextai-dev.svg?style=flat-square`
- Link: `https://www.npmjs.com/package/@frontztech/nextai-dev`

**Node version badge**
- URL: `https://img.shields.io/node/v/@frontztech/nextai-dev?style=flat-square`
- Link: `https://nodejs.org`
- Must reflect the requirement: >=18.0.0

**License badge**
- URL: `https://img.shields.io/npm/l/@frontztech/nextai-dev.svg?style=flat-square`
- Link: `https://github.com/JohnFrontzos/nextAI-dev/blob/main/LICENSE`
- Must display MIT license

**TypeScript badge**
- URL: `https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript`
- Link: `https://www.typescriptlang.org/`
- Must show TypeScript 5.7 version

**PRs Welcome badge**
- URL: `https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square`
- Link: `https://github.com/JohnFrontzos/nextAI-dev/pulls`

**GitHub stars badge**
- URL: `https://img.shields.io/github/stars/JohnFrontzos/nextAI-dev?style=flat-square&logo=github`
- Link: `https://github.com/JohnFrontzos/nextAI-dev/stargazers`

## Non-Functional Requirements

### NFR1: Visual Consistency
- All badges must use the `flat-square` style for consistent appearance
- Badges should be horizontally aligned in a single row
- Badge colors should follow shields.io conventions for their badge types

### NFR2: Maintainability
- Badge URLs should be self-updating where possible (e.g., npm version pulls from registry)
- Links must be absolute URLs, not relative paths
- Badge configuration should be easy to update if package name or repository changes

### NFR3: Performance
- Badges should load from shields.io CDN (no local SVG files)
- Badge URLs should use HTTPS protocol
- Minimal impact on README rendering time

## Acceptance Criteria

### AC1: LICENSE File
- [ ] LICENSE file exists at repository root (`c:\Dev\Git\nextai-dev\LICENSE`)
- [ ] File contains complete MIT license text
- [ ] Copyright notice includes appropriate year and holder name
- [ ] File is committed to the repository

### AC2: README Badge Integration
- [ ] README.md has badge row positioned at the top after the main title
- [ ] All 6 badges (npm version, Node version, License, TypeScript, PRs Welcome, GitHub stars) are present
- [ ] Badges are in the specified order
- [ ] Badge row is properly formatted in markdown

### AC3: Badge Functionality
- [ ] Each badge links to the correct destination URL
- [ ] npm version badge links to npm package page
- [ ] Node version badge links to nodejs.org
- [ ] License badge links to LICENSE file on GitHub
- [ ] TypeScript badge links to typescriptlang.org
- [ ] PRs Welcome badge links to GitHub pull requests page
- [ ] GitHub stars badge links to repository stargazers page

### AC4: Visual Consistency
- [ ] All badges use `flat-square` style consistently
- [ ] Badges render correctly when viewing README on GitHub
- [ ] Badge images load successfully from shields.io
- [ ] No broken badge images or links

## Out of Scope

### OS1: CI/CD Workflow
- Creating `.github/workflows/ci.yml` for automated testing/linting is mentioned as optional and NOT required for this feature
- CI status badges can be added in a future enhancement once CI workflow is established

### OS2: Additional Badges
- npm downloads badge (requires package to have download history)
- Code coverage badge (requires coverage reporting infrastructure)
- Build status badge (requires CI workflow)
- Dependency status badges

### OS3: Badge Customization
- Custom badge colors beyond shields.io defaults
- Custom badge icons or logos (except those included by default like TypeScript and GitHub)
- Dynamic badge generation from local scripts

## Dependencies

### D1: LICENSE File Prerequisite
- The LICENSE file must be created BEFORE the license badge can function correctly
- Without the LICENSE file, the license badge link will be broken

### D2: npm Package Publication
- Package must be published to npm registry as `@frontztech/nextai-dev`
- npm-related badges (version, Node version, license) depend on npm registry data

### D3: GitHub Repository
- Repository must be publicly accessible at `https://github.com/JohnFrontzos/nextAI-dev`
- GitHub stars badge requires public repository

### D4: Package Configuration
- package.json must accurately reflect:
  - Package name: `@frontztech/nextai-dev`
  - Version: Current version (v0.1.0 or later)
  - License: MIT
  - Node engine requirement: >=18.0.0

## Technical Notes

### Repository Information
- Package: @frontztech/nextai-dev (v0.1.0)
- Repository: https://github.com/JohnFrontzos/nextAI-dev
- Node requirement: >=18.0.0
- License: MIT (declared in package.json)
- Technology: TypeScript 5.7, Vitest for testing

### Badge Tier Classification
**Tier 1 (Essential)**: npm version, Node version, License, TypeScript
**Tier 2 (Community)**: PRs Welcome, GitHub Stars

### Reference Materials
- research/OpenSpec/README.md provides badge layout inspiration
- shields.io documentation for badge customization

## Future Enhancements
Once infrastructure is ready, consider adding:
- CI Status badge (requires CI workflow)
- Code Coverage badge (requires coverage reporting)
- npm Downloads badge (requires download history)
