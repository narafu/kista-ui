# Task 8 Report: Mutable Next.js Data Cache Removal

## Status

Completed. Mutable account, strategy, and user Next.js Data Cache readers and their invalidation paths are removed. Authenticated proxy fetches retain `cache: 'no-store'`.

## RED Evidence

Added `shared/lib/query/cacheArchitecture.test.ts` before deleting production cache code.

```text
npm run test:run -- shared/lib/query/cacheArchitecture.test.ts

1 failed: expected six mutable cache-reader violations to equal []
```

The violations were exactly the three cache wrappers and their three public exports:

- `entities/account/api/cached.ts`, `entities/account/index.ts`
- `entities/strategy/api/cached.ts`, `entities/strategy/index.ts`
- `entities/user/api/cached.ts`, `entities/user/index.ts`

The guard scans only runtime TypeScript sources under `app`, `widgets`, `features`, and `entities`; it excludes test/spec files, conventional fixture paths, `*.fixture.*`, and documentation.

## GREEN Evidence

```text
npm run test:run -- shared/lib/query/cacheArchitecture.test.ts
1 test passed

npm run test:run -- shared/lib/proxy/createProxyRoute.test.ts
2 tests passed

npm run test:run
118 test files passed, 570 tests passed

npm run typecheck
exit 0
```

## Build Evidence

```text
npm run build
Next.js 16.2.6 production build succeeded
Compiled successfully, TypeScript completed, and 33 static pages generated
exit 0
```

The build emitted Node's `DEP0205` deprecation warning for `module.register()`, but it did not affect compilation or build completion.

## Removed Tags And Routes

- Removed token-scoped tags: `accounts`, `strategies`, `user`.
- Removed tag invalidation from `app/api/accounts/[[...path]]/route.ts`.
- Removed tag invalidation from `app/api/trading-cycles/[[...path]]/route.ts`.
- Removed tag invalidation from `app/api/settings/[[...path]]/route.ts`.
- Removed the now-unused `revalidateTags` option and `revalidateTag` branch from `shared/lib/proxy/createProxyRoute.ts`.
- Deleted `getCachedAccounts`, `getCachedStrategies`, and `getCachedUser` wrappers and their public exports.

## Self-Review

- `rg` found no runtime mutable-reader symbols, cache tags, revalidation callbacks, `unstable_cache`, or `initialDataUpdatedAt: 0`; the guard's matcher is the sole remaining symbol text.
- `router.refresh()` remains in `widgets/pull-to-refresh` and `entities/trade/providers/TradeNotificationProvider`. The static guard prohibits it only in `entities/**/hooks`; the provider refresh remains intentional SSE live-stream behavior and was not broadened into this task.
- No reference-data API behavior changed. Proxy authentication and backend `cache: 'no-store'` behavior are preserved.
