# widgets/accounts-grid

- **`accounts-grid`**: `/accounts` 페이지는 Server Component에서 계좌/계좌별 전략을 prefetch+hydrate하고, `AccountsPageContent`가 `useAccountsQuery()` 캐시 기준으로 EmptyState/`AccountsGrid`를 전환한다. `AccountsGrid`는 `accounts`만 받고 각 `AccountCard`가 canonical 계좌별 전략 query를 소비한다. 증권사가 2곳 이상이면 `?broker=` 필터(SegmentedToggle)를 보이고, "더 보기" 개수는 필터 값으로 key를 바꿔 초기화한다
