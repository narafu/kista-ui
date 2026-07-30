# Final Fix Report: UI Cache Architecture Refactor

## Status

Complete. The final review findings are addressed as one cache-consistency change. Cold-cache mutations now materialize complete canonical lists, mutable detail headers consume hydrated detail queries, cross-domain effects settle before feature completion, and transport failures no longer become false 404 responses.

The unrelated untracked plan at `docs/superpowers/plans/2026-07-26-ui-cache-architecture-refactor.md` remains untouched and is excluded from the commit.

## Important 1: Cold-cache account mutations

### Implementation

- Existing `accountKeys.list()` data is updated directly for create, update, and delete.
- An absent list is never converted to `[saved]` or `[]`; `accountListQueryOptions()` is fetched and awaited instead.
- Detail/live keys are still written or removed immediately.
- TanStack mutation callbacks cannot run until required list materialization settles.

### RED

```text
npm run test:run -- entities/account/hooks/useAccountMarginQuery.test.tsx
1 file failed: 3 failed, 4 passed
- create callback ran before list materialization
- cold update contained only the saved account
- cold delete produced [] instead of the remaining accounts
```

### GREEN

```text
npm run test:run -- entities/account/hooks/useAccountMarginQuery.test.tsx entities/strategy/hooks/useStrategyQueries.test.tsx
2 files passed, 15 tests passed
```

The account update regression also records the complete list from inside the feature callback, proving callback ordering rather than only final cache state.

### Files

- `entities/account/hooks/useAccountMarginQuery.ts`
- `entities/account/hooks/useAccountMarginQuery.test.tsx`
- `docs/agents/cache-policy.md`
- `docs/agents/entities.md`

## Important 2: Mutable detail headers

### Implementation

- Added complete-resource `accountKeys.detail(id)` and `strategyKeys.detail(id)` query options and client hooks. Both use successful list responses to resolve one complete resource because the API has no dedicated detail endpoint.
- Account and strategy detail headers moved into query-owned client content under `HydrationBoundary`.
- Server values are fallback props only; newer client cache timestamps win over stale destination hydration.
- Account update/create and every strategy mutation update the detail keys consumed by these components. Deletes remove them.
- `StrategyDetail` now receives the query-owned strategy from its parent instead of selecting from a second list source.
- Intercepted strategy edit keeps `dismiss="back"`; the entity update callback completes detail/list synchronization before the feature callback invokes `router.back()`.

### RED

```text
npm run test:run -- entities/account/model/queryOptions.test.ts widgets/account-detail/AccountDetailContent.test.tsx 'app/(main)/accounts/[id]/page.test.tsx' 'app/(main)/accounts/[id]/edit/page.test.tsx'
4 files failed
- accountDetailQueryOptions was missing
- AccountDetailContent was missing
- detail/edit transport errors became NEXT_NOT_FOUND

npm run test:run -- entities/strategy/model/queryOptions.test.ts widgets/strategy-detail/StrategyDetailContent.test.tsx
2 files failed
- strategyDetailQueryOptions was missing
- StrategyDetailContent was missing
```

### GREEN

```text
npm run test:run -- entities/account/model/queryOptions.test.ts widgets/account-detail/AccountDetailContent.test.tsx 'app/(main)/accounts/[id]/page.test.tsx' 'app/(main)/accounts/[id]/edit/page.test.tsx' entities/account/hooks/useAccountMarginQuery.test.tsx
5 files passed, 15 tests passed

npm run test:run -- entities/strategy/hooks/useStrategyQueries.test.tsx entities/strategy/model/queryOptions.test.ts widgets/strategy-detail/StrategyDetailContent.test.tsx widgets/strategy-detail/StrategyDetail.test.tsx features/strategy/create-strategy/model/loadStrategyFormContext.test.ts features/strategy/create-strategy/StrategyFormPage.test.tsx
6 files passed, 53 tests passed
```

The content tests cover both a live cache edit without reload and an older dehydrated payload arriving after a newer prewarmed destination cache.

### Files

- `entities/account/model/queryOptions.ts`
- `entities/account/model/queryOptions.test.ts`
- `entities/account/hooks/useAccountQueries.ts`
- `entities/account/index.ts`
- `widgets/account-detail/AccountDetailContent.tsx`
- `widgets/account-detail/AccountDetailContent.test.tsx`
- `widgets/account-detail/index.ts`
- `app/(main)/accounts/[id]/page.tsx`
- `entities/strategy/model/queryOptions.ts`
- `entities/strategy/model/queryOptions.test.ts`
- `entities/strategy/hooks/useStrategyQueries.ts`
- `entities/strategy/index.ts`
- `widgets/strategy-detail/StrategyDetailContent.tsx`
- `widgets/strategy-detail/StrategyDetailContent.test.tsx`
- `widgets/strategy-detail/StrategyDetail.tsx`
- `widgets/strategy-detail/StrategyDetail.test.tsx`
- `widgets/strategy-detail/index.ts`
- `app/(main)/accounts/[id]/strategies/[sid]/page.tsx`
- `features/strategy/create-strategy/StrategyFormPage.test.tsx`

## Important 3: Cold-cache strategy mutations

### Implementation

- Existing `strategyKeys.listAll()` and `strategyKeys.listByAccount(accountId)` lists are updated directly.
- Missing lists are fetched through `strategyListAllQueryOptions()` and `strategyListByAccountQueryOptions()`.
- Both fetches start together and use `Promise.allSettled`; any failure is rethrown after both settle, and no feature callback runs early.
- Create/update write complete detail responses. Pause/resume write a complete detail object with the new status. Delete removes the detail key.

### RED

```text
npm run test:run -- entities/strategy/hooks/useStrategyQueries.test.tsx
1 file failed: 4 cold-cache failures
- create callback ran immediately
- update/status/delete left both list caches undefined
```

### GREEN

```text
npm run test:run -- entities/strategy/hooks/useStrategyQueries.test.tsx
1 file passed, 8 tests passed
```

Cold create and update cover multiple accounts and multiple strategies. The update callback captures both complete lists at callback time. Normal-navigation stale hydration is covered by `StrategyDetailContent.test.tsx`.

### Files

- `entities/strategy/hooks/useStrategyQueries.ts`
- `entities/strategy/hooks/useStrategyQueries.test.tsx`
- `entities/strategy/model/queryOptions.ts`
- `entities/strategy/index.ts`

## Important 4: Admin approval setting

### Implementation

- Disabling approval from a previously enabled server snapshot starts exact refetches in this order:
  1. `runtimeConfigKeys.all`
  2. `adminKeys.usersRoot()`
  3. `adminKeys.stats()`
- All three use `refetchType: 'all'` and must settle before the success toast and local completion state.
- Other settings saves retain the runtime-config effect without unnecessary admin-domain invalidation.

### RED

```text
npm run test:run -- features/admin/settings/ui/AdminSettingsForm.test.tsx features/strategy/manage-strategy/useManageStrategyMutations.test.tsx
AdminSettingsForm: expected 3 exact invalidations, received runtime-config only
```

### GREEN

```text
npm run test:run -- features/admin/settings/ui/AdminSettingsForm.test.tsx features/strategy/manage-strategy/useManageStrategyMutations.test.tsx
2 files passed, 16 tests passed
```

### Files

- `features/admin/settings/ui/AdminSettingsForm.tsx`
- `features/admin/settings/ui/AdminSettingsForm.test.tsx`

## Important 5: False 404 handling

### Implementation

- Account detail/edit use `fetchQuery(accountDetailQueryOptions(...))`; transport errors reject, while a successful `null` result alone maps to `notFound()`.
- Strategy detail uses settled canonical account/strategy detail queries with the same distinction.
- New/edit strategy form loaders no longer catch transport failures into empty arrays. `Promise.allSettled` avoids fail-fast loss while rethrowing failures after both requests settle.

### RED

```text
AccountDetailPage and AccountEditPage transport tests:
expected backend Error, received NEXT_NOT_FOUND

Strategy form loader tests:
expected rejected backend Error, received resolved null
```

### GREEN

```text
npm run test:run -- 'app/(main)/accounts/[id]/page.test.tsx' 'app/(main)/accounts/[id]/edit/page.test.tsx' features/strategy/create-strategy/model/loadStrategyFormContext.test.ts
3 files passed, 6 tests passed
```

### Files

- `app/(main)/accounts/[id]/page.tsx`
- `app/(main)/accounts/[id]/page.test.tsx`
- `app/(main)/accounts/[id]/edit/page.tsx`
- `app/(main)/accounts/[id]/edit/page.test.tsx`
- `app/(main)/accounts/[id]/strategies/[sid]/page.tsx`
- `features/strategy/create-strategy/model/loadStrategyFormContext.ts`
- `features/strategy/create-strategy/model/loadStrategyFormContext.test.ts`

## Minor findings

### Server prefetch public APIs

- Replaced manual strategy list query reconstruction in `/accounts` with `strategyListByAccountQueryOptions()`.
- Replaced deep strategy query-option imports in account detail and `/strategies` with `@entities/strategy` public exports.

Static verification after the change:

```text
rg -n "@entities/(account|strategy)/(model|hooks|api)|queryKey:\\s*strategyKeys\\.(listAll|listByAccount)|queryFn:\\s*\\(\\).*list(All)?Strategies" app --glob '*.tsx' --glob '*.ts'
no matches
```

### Widget documentation

- Removed stale `AccountsGrid.strategiesByAccount` guidance.
- Replaced stale `useAllStrategiesQuery(initialStrategies)` guidance with hydrated, argument-free canonical query usage.

### Task 5 delete effects

`useManageStrategyMutations.test.tsx` now asserts exact `orderKeys.all -> statsKeys.all -> tradeKeys.all` invalidation calls and proves navigation remains blocked until every invalidation promise settles.

## Integrated verification

```text
npm run test:run -- entities/account entities/strategy features/account features/strategy features/admin/settings widgets/account-detail widgets/strategy-detail 'app/(main)/accounts/[id]'
41 files passed, 228 tests passed

npm run test:run
126 files passed, 608 tests passed

npm run typecheck
exit 0

npm run build
Next.js 16.2.6 production build succeeded; 33 static pages generated
exit 0

npm run test:e2e
8 passed

git diff --check
exit 0
```

## React Doctor

Required scoped command:

```text
npx react-doctor@latest . --verbose --scope changed --base b060cc6 --include-untracked --no-color
98/100, 1 maintainability warning, exit 0
```

The warning is `no-giant-component` for `widgets/strategy-detail/StrategyDetail.tsx`. It is not introduced by this fix: the file is 454 lines at `b060cc6` and 452 lines after this change, and a baseline archive scan reports the same warning. New attributable diagnostics: 0. Splitting that long-standing component is unrelated to cache correctness and was not bundled into this final wave.

## Concerns

- A mutation whose backend write succeeds but whose required cold-list fetch fails intentionally does not run the feature callback or navigate. This avoids publishing a partial authoritative cache, but the user may need to retry navigation/refetch after the transport recovers.
- Detail queries resolve one complete resource from list endpoints because dedicated account/strategy detail endpoints are not available. Direct detail visits therefore perform a list request.
- The production build emits Node's pre-existing `module.register()` deprecation warning.
- An earlier full Playwright run emitted non-failing `ResponseAborted` logs when trade SSE connections closed during browser teardown; the final fresh run was clean and all eight tests passed in both runs.
- The untracked implementation plan remains outside the commit.

## Commit

- Base: `b060cc64`
- Message: `수정: 콜드 캐시 동기화와 상세 쿼리 일관성 보완`
- The final SHA is reported in the completion response because this report is included in that commit.

# Second Final Fix Wave: Awaited Admin Settings Effects

## Status

Complete. The residual admin settings mutation lifecycle finding is fixed with a real `QueryClient` regression. Required feature-owned cache effects now define mutation pending/error settlement instead of running as detached per-call observer callbacks.

## Root cause

TanStack Query's mutation-level lifecycle callbacks are awaited by `Mutation.execute()`, but callbacks passed to `mutation.mutate(variables, { onSuccess })` are observer notifications invoked after success dispatch. Their return values are ignored. The prior form therefore let `isPending` become false before its async invalidations completed, and a rejected callback promise was detached from mutation error handling.

The installed TanStack Query implementation also confirms that `invalidateQueries()` suppresses refetch failures by default. Required refetches now pass `{ throwOnError: true }` so a failed query reaches the mutation lifecycle.

## Implementation

- `useUpdateAdminSettingsMutation()` accepts a hook-level success effect, writes only its own canonical `adminSettingsKeys.all` cache, and awaits the feature callback from mutation-level `onSuccess`.
- `AdminSettingsForm` owns the cross-domain runtime config, admin users, and admin stats effects and injects them when creating the entity mutation.
- The submit handler calls `mutation.mutate(draft)` without per-call async callbacks.
- Approval-disable intent is captured before submission in a single-in-flight ref, so later canonical settings renders cannot erase the required users/stats effects.
- Required invalidations start in exact runtime config, users root, stats order; all use `refetchType: 'all'` plus `throwOnError: true`.
- `Promise.allSettled` waits for every required effect before throwing the first failure. Success toast and `attempted` reset run only after all fulfill; a failure reaches mutation `onError` and cannot become a detached unhandled rejection.

## Strict TDD

### RED

The regression uses the real entity mutation hook and a real `QueryClientProvider`. Only the API boundary, metadata, and toast sink are mocked. Actual inactive queries return deferred refetch promises.

```text
npm run test:run -- features/admin/settings/ui/AdminSettingsForm.lifecycle.test.tsx
1 file failed, 2 tests failed

success case:
expected each invalidateQueries call to include { throwOnError: true };
received filters only from the detached per-call callback

rejection case:
expected queryClient.isMutating() to be 1 while required refetches were unresolved;
received 0 because observer success had already cleared pending
```

The test also changes the form to an invalid ETF draft during the pending window. This makes the local `attempted` state visible as a validation alert, proving that local reset does not occur before required effects settle.

### GREEN

```text
npm run test:run -- features/admin/settings/ui/AdminSettingsForm.lifecycle.test.tsx
1 file passed, 2 tests passed

npm run test:run -- features/admin/settings entities/admin-settings
5 files passed, 24 tests passed
```

The success regression resolves runtime config, users, and stats separately and observes `isPending` plus the validation alert until the last resolution. The error regression rejects stats while users remains pending, proves error handling waits for users, then observes the mutation error toast and zero `unhandledRejection` events.

## Files

- `entities/admin-settings/hooks/useAdminSettings.ts`
- `entities/admin-settings/hooks/useAdminSettings.test.tsx`
- `features/admin/settings/ui/AdminSettingsForm.tsx`
- `features/admin/settings/ui/AdminSettingsForm.test.tsx`
- `features/admin/settings/ui/AdminSettingsForm.lifecycle.test.tsx`
- `docs/agents/entities.md`
- `docs/agents/features.md`
- `.superpowers/sdd/2026-07-26-ui-cache-architecture-refactor/final-fix-report.md`

## Verification

```text
npm run test:run
127 files passed, 609 tests passed

npm run typecheck
exit 0

npm run build
Next.js 16.2.6 production build succeeded; 33 static pages generated
exit 0

npm run test:e2e
8 passed

git diff --check
exit 0
```

Playwright emitted the previously observed non-failing `ResponseAborted` SSE teardown logs. The build and E2E development server emitted the existing Node `module.register()` deprecation warning.

## React Doctor

```text
npx react-doctor@latest . --verbose --scope changed --base 69b7501 --include-untracked --no-color
100/100, no issues found, exit 0
```

New attributable diagnostics: 0.

## Self-review

- No entity imports another entity; the feature remains the only owner of cross-domain keys.
- No required async effect remains in per-call mutate options.
- Success and failure paths both keep one mutation pending until all required effects settle.
- Actual refetch failures propagate because all required invalidations opt into `throwOnError`.
- The prior manually invoked callback test was removed and replaced by the real mutation lifecycle regression.
- `git diff --check` is clean.

## Concerns

- If the server update succeeds and a required refetch fails, the canonical admin settings cache already contains the saved response while the mutation intentionally ends in error. The failure toast is observable and success UI does not run, but a user retry may repeat an already-applied idempotent settings update.
- The existing Node deprecation and Playwright SSE teardown logs are unrelated to this fix.
- The unrelated implementation plan remains untracked and outside the commit.

## Commit

- Base: `69b7501e93a2cf8ca4404edb22de62f46e459343`
- Message: `수정: 관리자 설정 캐시 동기화 완료 시점 보장`
- The final SHA is reported in the completion response because this report is included in that commit.
