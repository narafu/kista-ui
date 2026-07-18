# Stats final fix report

## RED

- Command: `npm run test:run -- widgets/stats-overview/StatsOverview.test.tsx`
- Result: exit 1, 1 failed / 2 passed.
- Expected failure: initial `3M` button did not have `aria-pressed="true"` (`Received: null`).

## GREEN

- Command: `npm run test:run -- widgets/stats-overview/StatsOverview.test.tsx`
- Result: exit 0, 3 passed.
- Command: `npm run typecheck`
- Result: exit 0.
- Command: `git diff --check`
- Result: exit 0.

## Self-review

- `EquityCurveChart` exposes the existing `active` state through `aria-pressed`.
- `CyclePerformanceList` exposes the same selection predicates used by its active styles for both the all and type filter buttons.
- The focused test scopes all six cycle table headers, three mobile cycle labels, and six mobile strategy labels to their corresponding accessible table/list containers.
- The focused test clicks period and strategy filter buttons and verifies both the previous and next buttons' `aria-pressed` transitions.
- No unrelated production behavior or files were changed.
