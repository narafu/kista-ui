# Task 9 Report: Cache Policy Documentation and Account Cache E2E

## Status

Complete. `docs/agents/cache-policy.md` is the UI cache policy SSOT, obsolete cache guidance is replaced, and both reported account Router Cache regressions pass through normal client navigation without `page.reload()`.

## Implementation

- Added the cache ownership/freshness tables, query-key rules, SSR hydration example, direct mutation writes, derived invalidation, feature-owned navigation, `router.refresh()` exceptions, Next.js persistent-cache limits, checklists, and verification commands to `docs/agents/cache-policy.md`.
- Linked the SSOT from `AGENTS.md`, `docs/agents/app.md`, `docs/agents/entities.md`, `docs/agents/shared.md`, and `docs/agents/widgets.md`.
- Preserved explicit mobile pull-to-refresh and `TradeNotificationProvider` SSE refresh behavior with rationale and a targeted-cache migration condition.
- Added `tests/e2e/account-cache-consistency.spec.ts` using the local-only dev user storage state and MOCK broker. The suite serializes the fixed dedicated identity, creates unique account names, and resets its accounts through authenticated API cleanup.
- Isolated Playwright on configurable `E2E_PORT` (default 3100), passes `E2E_API_BASE` to the spawned Next server, and discovers both existing `e2e/**` and new `tests/e2e/**` suites.
- Excluded `tests/e2e/**` from Vitest while preserving Vitest 4 defaults.
- Moved `accountListQueryOptions` from the `'use client'` hook module to server-compatible `entities/account/model/queryOptions.ts`; otherwise Next.js rejected Server Component prefetch at runtime.

## RED Evidence

```text
npm run test:e2e -- tests/e2e/account-cache-consistency.spec.ts
Error: No tests found
```

The initial Playwright config only discovered top-level `e2e/`.

After discovery was enabled, the integrated run exposed the following boundaries in order:

- Missing Playwright Chromium 1228 binary. Resolved with `npx playwright install chromium`.
- `reuseExistingServer: true` attached to an unrelated worktree's port 3000 process and rendered stale account data. Resolved with a dedicated non-reused port.
- The isolated worktree server had no `API_BASE_URL`. Resolved by passing the same `E2E_API_BASE` used by auth setup through `webServer.env`.
- Next.js rejected `accountListQueryOptions()` because it was exported from a `'use client'` module.

The server-safe query-options unit contract was added before its implementation:

```text
npm run test:run -- entities/account/model/queryOptions.test.ts
1 failed: Failed to resolve import "./queryOptions"
```

The first full Vitest run also proved runner ownership was incomplete:

```text
npm run test:run
119 test files passed, 574 tests passed
1 Playwright suite failed during Vitest import
```

## GREEN Evidence

```text
npm run test:run -- entities/account/model/queryOptions.test.ts entities/account/hooks/useAccountQueries.test.tsx
2 test files passed, 2 tests passed

npm run test:e2e -- tests/e2e/account-cache-consistency.spec.ts
3 passed (storage setup + 2 account cache regressions)

npm run test:e2e
8 passed (existing auth/admin/dashboard coverage + account regressions)

npm run test:run
119 test files passed, 574 tests passed

npm run typecheck
exit 0

npm run build
Next.js 16.2.6 production build succeeded; 33 static pages generated
exit 0
```

## React Doctor

Task-scoped command:

```text
npx react-doctor@latest --verbose --scope changed --base HEAD
No issues found, 100/100, exit 0
```

The exact brief command `npm run doctor` completed its scan but exited 1 on the pre-existing repository baseline: 63/100, 6 errors, and 38 warnings. No diagnostic points to a Task 9 changed React/TypeScript file.

The branch-wide `--diff` scan reported 3 errors and 9 warnings in files from prior tasks, including `NotificationSettings.tsx` and `useStrategyForm.ts`. Its SSE cleanup diagnostic for `TradeNotificationProvider.tsx` is a false positive: the effect cleanup closes `EventSource` and clears the pending reconnect timeout. These unrelated findings were not modified.

## Concerns

- Full Playwright emitted a non-failing `ResponseAborted` log when a dashboard worker closed the long-running trade SSE request during teardown. All eight tests passed, and the provider/route already propagate connection cleanup.
- Playwright requires local `kista-api` with the `local` profile on `E2E_API_BASE` and a matching Chromium install. No real KIS credentials are used.
- The pre-existing untracked `docs/superpowers/plans/2026-07-26-ui-cache-architecture-refactor.md` remains untouched and is excluded from this task's commit.

## Commit

The final commit SHA is reported in the task completion response; this report is included in that commit.
