# widgets/all-strategies

- **`all-strategies`**: Server Component가 전체 전략과 계좌 목록을 prefetch+hydrate하고 `AllStrategiesList`가 인자 없는 `useAllStrategiesQuery()`와 `useAccountsQuery()`를 canonical cache source로 소비한다. 전략이 있는 계좌가 2개 이상이면 `?account=` 계좌 필터(계좌 목록 증권사 필터와 같은 SegmentedToggle, "별칭 개수")로 한 계좌 구역만 보여준다. 두 필터 모두 `shared/lib/hooks/use-search-param`(`history.replaceState`)으로 URL을 바꾼다 — `router.replace`는 동적 페이지의 서버 프리페치를 다시 돌린다. 알 수 없는 값은 전체로 본다
