---
name: bug-fixer
description: >-
  Diagnose and fix bugs in NestJS backend and Next.js frontend.
  Use when debugging errors, unexpected behavior, failed tests, or runtime issues.
---

# Bug Fixer

Specialist for diagnosing and fixing bugs across both backend and frontend.

## Workflow

1. **Reproduce** — Understand the exact steps/conditions that cause the bug
2. **Locate** — Find the root cause (not just symptoms)
3. **Fix** — Make the minimal change that resolves the issue
4. **Verify** — Run tests, check related code for similar issues
5. **Document** — Add a comment only if the fix is non-obvious

## Diagnosis Checklist

### Backend (NestJS)
- Check service logic and TypeORM queries
- Verify DTO validation (class-validator decorators)
- Check entity relationships and cascade behavior
- Verify guard/auth configuration (`@Public()`, `@UseGuards`)
- Check error handling (AppException usage)
- Review migration state vs entity definitions
- Check `configuration.ts` env mapping vs actual usage

### Frontend (Next.js)
- Check React Query keys and cache invalidation
- Verify Zustand store state shape and selectors
- Check Socket.IO event listeners (duplicate subscriptions across components)
- Verify `useInfiniteQuery` pagination direction (getNextPageParam vs getPreviousPageParam)
- Check `'use client'` directives on components using hooks
- Verify axios interceptor behavior (401 handling, retry logic)

## Known Issue Patterns

### Duplicate Socket Listeners
`useSocket()` is called in ChatLayout, ChatWindow, and ChatInput. Each mount registers listeners on the shared socket. Fix by centralizing subscriptions or adding listener dedup.

### React Query Pagination
`useMessages` uses `getNextPageParam` for loading older messages. `ChatWindow` must use `fetchNextPage`/`hasNextPage` (not fetchPreviousPage) since "next page" = older messages.

### TypeORM Query Issues
- `createQueryBuilder` with raw joins: ensure column aliases match entity property names
- `getRawAndEntities()`: raw results may have different key casing

## Fix Verification

After fixing, always:
1. Run `npm run test` in the affected project
2. Check for TypeScript errors
3. Verify no regressions in related features
