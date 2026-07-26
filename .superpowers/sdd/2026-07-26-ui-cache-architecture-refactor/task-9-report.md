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

---

## Fix Round 1/5

### Status

All Important findings are addressed. This section supersedes the initial report's E2E ownership and React Doctor descriptions where they differ.

### E2E Ownership And Isolation

- The local backend cannot create a configurable USER identity. `DevAuthController` always issues USER tokens for UUID `00000000-0000-0000-0000-000000000001`.
- Setup now issues a separate token into `e2e/.auth/account-cache.json`. This is a separate storage state, but it intentionally documents that the backend identity remains shared.
- Playwright projects execute in dependency order `setup -> account-cache -> chromium`. The account-cache project is non-parallel, its spec is serial, and the existing USER suites cannot run concurrently with it in the configured full run.
- Test nicknames use the reserved `e2e-account-cache-` prefix. Cleanup deletes only IDs recorded as created by the current spec plus stale accounts with that reserved prefix. It never deletes all accounts.
- Every cleanup first verifies that `E2E_API_BASE` is a loopback HTTP origin and `/api/auth/me` is the fixed local USER UUID. A remote/malformed/path-scoped API origin or different identity aborts cleanup.
- The suite aborts when the shared identity contains any non-reserved account. It does not adopt or delete that account.
- Ownership selection and guardrails have eight focused Vitest cases in `tests/account-cache-fixture.test.ts`; the integrated E2E also exercises the positive local origin/identity path before every cleanup.

### Client Navigation Oracle

- Each scenario installs its oracle only after the initial setup `page.goto()`.
- The oracle records main-frame navigation requests and stores a unique sentinel on `window`. It asserts zero document navigations and sentinel survival after the UI flow.
- The create scenario additionally asserts `/dashboard`, the `대시보드` heading, and removal of the first-account CTA.
- The delete scenario additionally asserts `/accounts`, the `내 계좌` heading, the empty-state content, and removal of the account row.
- Mutation verification temporarily inserted `page.reload()` after oracle setup. The create test failed on a captured `http://localhost:3100/dashboard` document request; the delete test failed on `http://localhost:3100/accounts`. The mutations were removed and both tests returned GREEN.

### Cache Policy Correction

- `market holidays` visible state is documented as React Query ownership through `marketKeys.holidays(year, month)`, with a 24-hour stale time for a server-provided initial snapshot and `0` when no snapshot is provided.
- Market holidays have no persistent Next Data Cache directive. The current persistent-cache application is the unauthenticated public meta fallback with `revalidate: 3600`.
- The SSOT retains the allowed explicit pull-to-refresh and SSE provider refresh behavior and their existing rationale/exit conditions.

### TDD And Integrated Verification

```text
npm run test:e2e -- tests/e2e/account-cache-consistency.spec.ts
RED: account-cache.json did not exist (1 failed, 1 skipped, setup passed)

npm run test:run -- tests/account-cache-fixture.test.ts
8 passed

create page.reload mutation
RED: captured main-frame document request /dashboard

delete page.reload mutation
RED: captured main-frame document request /accounts

npm run test:e2e -- tests/e2e/account-cache-consistency.spec.ts
3 passed (setup + 2 account-cache regressions)

npm run test:e2e
8 passed (setup + 2 account-cache + 5 existing)

npm run test:run
120 test files passed, 582 tests passed

npm run typecheck
exit 0

npm run build
Next.js 16.2.6 production build succeeded; 33 static pages generated
exit 0
```

### React Doctor Correction

The corrected Task 9 scan uses the task base, not `HEAD`:

```text
npx react-doctor@latest --verbose --scope changed --base 48f3262
No issues found, 100/100, exit 0
```

The brief's full repository command remains a separate pre-existing baseline:

```text
npm run doctor
63/100, 6 errors, 38 warnings across 27 files, exit 1
```

Its top diagnostics are in pre-existing files: SSE cleanup in `TradeNotificationProvider.tsx`, browser-global reads in `NotificationSettings.tsx`, and render-time ref mutation in `useStrategyForm.ts`. None is in a Task 9 changed React/TypeScript application file, and the task-base scan reports no regression, so this fix round does not alter them.

### Concerns

- Full Playwright still emits non-failing `ResponseAborted` messages when existing SSE connections close during test teardown; all eight tests pass.
- The backend identity is fixed rather than truly dedicated. Isolation is therefore enforced by Playwright project dependencies and destructive-cleanup guardrails. Independently launched Playwright processes against the same local API are outside that project dependency graph and should not be run concurrently.
- The unrelated untracked `docs/superpowers/plans/2026-07-26-ui-cache-architecture-refactor.md` remains untouched and excluded from the commit.
