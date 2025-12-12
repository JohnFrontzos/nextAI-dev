# Feature: Add README badges

## Original Request
Add professional badges (SVGs) to the top of README.md, similar to what popular open source projects like OpenSpec use. Include the recommended badges from the technical architect analysis and complete the necessary action items.

## Type
feature

## Description
Add professional community badges to README.md to signal credibility, professionalism, and invite contributions. Also create supporting infrastructure (LICENSE file, CI workflow).

## Context
Based on technical architect analysis of the project:
- Package: @frontztech/nextai-dev (v0.1.0)
- Repository: https://github.com/JohnFrontzos/nextAI-dev
- Node requirement: >=18.0.0
- License: MIT (declared in package.json but no LICENSE file exists)
- Technology: TypeScript 5.7, Vitest for testing

## Recommended Badges (Tier 1 - Essential)
1. **npm version** - Shows package version, links to npm registry
2. **Node version** - Shows required Node.js version (>=18.0.0)
3. **License** - MIT license badge (requires LICENSE file)
4. **TypeScript** - Signals type safety and modern codebase

## Recommended Badges (Tier 2 - Community)
5. **PRs Welcome** - Invites contributions
6. **GitHub Stars** - Social proof, shows community interest

## Badge URLs (Ready to Use)
```markdown
[![npm version](https://img.shields.io/npm/v/@frontztech/nextai-dev.svg?style=flat-square)](https://www.npmjs.com/package/@frontztech/nextai-dev)
[![node version](https://img.shields.io/node/v/@frontztech/nextai-dev?style=flat-square)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/@frontztech/nextai-dev.svg?style=flat-square)](https://github.com/JohnFrontzos/nextAI-dev/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/JohnFrontzos/nextAI-dev/pulls)
[![GitHub stars](https://img.shields.io/github/stars/JohnFrontzos/nextAI-dev?style=flat-square&logo=github)](https://github.com/JohnFrontzos/nextAI-dev/stargazers)
```

## Action Items
1. **Create LICENSE file** - Add MIT license text to repo root (currently only declared in package.json)
2. **Add badges to README.md** - Insert badge row at the top after the title
3. **Consider CI workflow** - Optional: create .github/workflows/ci.yml for test/lint on push/PR

## Acceptance Criteria
- [ ] LICENSE file exists in repo root with MIT license text
- [ ] README.md has professional badges at the top
- [ ] Badges link to correct URLs (npm, GitHub, Node.js, TypeScript)
- [ ] Badge styling is consistent (flat-square style)

## Notes
- Future badges to consider once infrastructure ready: CI Status, Code Coverage, npm Downloads
- Reference: research/OpenSpec/README.md for badge layout inspiration
