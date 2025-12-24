# Test Skill Loading - Technical Specification

## Overview

A minimal test feature to validate skill loading mechanisms in NextAI.

## Technical Approach

Create a simple utility function in `src/test-utils.ts`:

```typescript
export function testGreeting(): string {
  return "Hello, Test!";
}
```

## Files to Create/Modify

1. `src/test-utils.ts` - New file with test utility function

## API/Interface

```typescript
// src/test-utils.ts
export function testGreeting(): string;
```

## Testing

Manual verification that the function exists and returns expected value.
