# shared/ — 도메인 무관 공용 자산

도메인 지식 없이 어디서나 사용 가능한 유틸리티. 모든 계층에서 import 가능하며, `shared/` 내부에서 `entities/`·`features/`·`widgets/` import는 금지한다. 구성: `lib/`(api-client·api-schema·api-types·auth·query·format·hooks·proxy·date-range·env·firebase·normalize·utils), `model/`, `providers/`, `ui/`.
캐시 소유권·hydration·mutation 동기화 규범은 `docs/agents/entities.md`를 따른다. router.refresh() 허용 범위·체결 SSE 무효화 대상과 stale time 기준은 아래 참고.

## api-client

`apiFetch`(`@shared/lib/api-client`)는 Server Component 전용(token 필요), `clientFetch`는 Client Component 전용이며 **401 응답 시 자동 로그아웃**한다. `clientFetch<void>`로 204 응답도 처리한다.

## format

날짜·금액 포맷 함수 모음. 목록·시그니처는 `shared/lib/format.ts` 참고.

## date-range

`lib/date-range.ts` — `RangePreset('7d'|'30d'|'all'|'custom')`, `resolveRange`/`resolveRangeStrict`, URL 쿼리 파서(`parseRangePreset`/`parseSize`/`parsePage`). `UrlRangeFilterBar`와 함께 사용.

## cache

Next.js persistent cache는 가변 인증 데이터에 사용하지 않는다. 느리게 변하는 reference/public 데이터에만 명시적 TTL/tag로 허용하며, `unstable_cache`는 Next.js 16 legacy API다. 신규 `cacheTag`는 `cacheComponents`와 `'use cache'` 도입이 전제다. 이 금지 규칙은 `shared/lib/query/cacheArchitecture.test.ts`가 app/widgets/features/entities 전체를 AST로 훑어 기계적으로 강제한다 — 위반 시 이름만으로는 규칙과 무관해 보이는 이 테스트가 실패한다

## query

`createQueryClient()`가 React Query 클라이언트 기본값을 중앙 관리한다. 기본 정책: `staleTime=30s`, `gcTime=10m`, `retry=0`, `refetchOnWindowFocus=false`. 기본값을 바꿀 때는 이 파일과 테스트를 함께 수정한다. 개별 override는 데이터 성격을 설명하는 주석 또는 테스트가 있어야 한다.

### Stale Time

코드와 대조 검증된 resource별 `staleTime` 기준값:

| 리소스 | `staleTime` | 근거 |
|---|---:|---|
| 공통 기본값, accounts, strategies | 30초 | 화면 재진입 재사용과 mutation 직접 동기화의 균형 |
| me, order preview/history, stats | 60초 | 자주 읽지만 mutation에서 명시적으로 무효화 |
| trade/cycle history, daily trades | 5분 | 과거 이력 중심 |
| margin, prices, admin 재주문(당일 주문·예산·시각) | 0 | 거래 판단에 쓰는 라이브 값. 재주문 시각은 60초 주기 재조회 |
| runtime-config, admin-settings | 0 | 운영 설정 변경 즉시 반영, 필요 시 focus refetch |
| market holidays | 24시간 | 월 단위 참조 데이터. 실패한 서버 조회는 dehydrate되지 않아 장기 빈 값으로 캐시되지 않음 |
| candles | 10분 | 차트 조회 비용과 최신성 균형 |
| crypto market indicators | 10분 | kista-trading 서버 캐시 TTL과 동일 |
| fear/greed | 6시간 | 원본 갱신 주기의 절반 |
| housing regions | 1시간 | 저빈도 참조 목록 |
| Next reference cache | 1-24시간 | 데이터별 TTL/tag 필수 |

### router.refresh() 허용 범위

일반 query mutation의 성공 처리에는 사용하지 않는다(캐시 동기화 대신 이동 전 `router.refresh()`를 호출하는 패턴 금지 — refresh는 현재 route만 갱신하고 목적지 Router Cache의 가변 상태를 보장하지 않는다). 현재 허용되는 예외는 다음 둘이다.

- `widgets/pull-to-refresh/PullToRefresh.tsx`: 사용자가 명시적으로 요청한 화면 전체 재동기화다. 특정 mutation의 누락된 캐시 처리를 가리는 수단이 아니라 모바일의 수동 recovery 동작이므로 허용한다.
- 에러 바운더리(`app/**/error.tsx`·`global-error.tsx`)의 "다시 시도" — `unstable_retry`가 내부에서 refresh한다. 이미 깨진 화면의 사용자 요청 복구 동작이고, 네트워크 실패로 RSC payload를 못 받은 오류는 refresh 없이 복구되지 않는다.

#### 체결 SSE는 refresh 없이 무효화만 한다

`entities/trade/providers/TradeNotificationProvider.tsx`는 SSE `trade` 이벤트를 받으면 toast를 띄우고 주입된 `onTrade`를 호출할 뿐 `router.refresh()`를 하지 않는다. 2026-10에 제거했다. 그전에는 키 없는 SSR 집계를 갱신하려고 refresh를 함께 호출했고, 그 결과 현재 route의 prefetch 키가 hydrate와 invalidate refetch로 두 번 조회됐다.

- **전제**: 체결로 바뀌는 값은 전부 React Query 키로 조회된다. 2026-10 인벤토리에서 키 없이 SSR prop으로 렌더되던 체결 민감 값은 두 가지였고 둘 다 이관했다.
  - `/accounts/[id]`의 예수금·평가금: `tradeKeys.portfolio`, `accountPortfolioQueryOptions`
  - 전략 수정 폼의 `currentHoldings`·`vr.value`: `StrategyFormPage`가 `strategyKeys.detail` 캐시를 읽는다
- **새 화면 규칙**: 체결 민감 값을 Server Component에서 직접 계산해 prop으로 넘기지 않는다. refresh가 없으므로 체결 후에도 갱신되지 않는다. queryOptions로 prefetch+hydrate하고, 그 키를 아래 대상에 포함시킨다.
- **대상 키**: 무효화는 `widgets/layout/TradeNotificationBridge.tsx`에서 마운트된다. prefix 무효화 대상은 다음과 같다.
  - `tradeKeys.all`(portfolio 포함)
  - `strategyKeys.lists()`·`strategyKeys.details()`(`currentRound`·`currentHoldings`)
    - 상세 전용 API가 없어 `strategyDetailQueryOptions`는 queryFn의 `client.fetchQuery`로 계좌별 목록 캐시를 거쳐 찾는다. 그래서 list·detail이 함께 무효화돼도 목록 API는 1회만 나간다(진행 중 요청 공유).
    - 이 공유는 lists를 details보다 **먼저** 무효화해야 성립한다. 순서가 바뀌면 detail이 아직 무효화되지 않은(30초 fresh) 목록 캐시를 재사용해 갱신 전 값을 받는다. 순서는 `TradeNotificationBridge.test.tsx`가, 1회 호출은 `entities/strategy/model/queryOptions.test.ts`가 고정한다.
  - `orderKeys.all`
  - `statsKeys.summary()`·`statsKeys.equityCurveAll()`·`statsKeys.cyclesAll()`·`statsKeys.housingComparisonAll()`. housing-comparison은 이름과 달리 내 투자 수익률(`investmentCumulativeReturn` 등)을 포함하므로 대상이다.
- **제외 키**:
  - housing·etf 시장 시계열과 regions 같은 외부 참조 데이터는 체결과 무관하다(`statsKeys.all` 사용 금지).
  - `strategyKeys.seedPreview`는 시세 기반이다. 전략 폼이 열린 중 재조회되면 minSeed가 바뀌어 사용자가 조정한 시드가 초기화될 수 있다(`strategyKeys.all` 사용 금지).
  - `accountKeys.margin`은 전략 폼 전용 클라이언트 쿼리(`staleTime: 0`)라 refresh 시절에도 갱신 대상이 아니었다.
  - 대상·제외 키는 `TradeNotificationBridge.test.tsx`가 고정한다.
- **서버 TTL**: summary·equity-curve·housing-comparison의 kista-api 서버 TTL 캐시는 체결 시 사용자 단위로 비워지므로 재조회가 새 값을 받는다. Redis 메시지 유실이나 계산 중 경합이 생기면 TTL이 지나야 갱신된다(`entities.md` "stats 서버 TTL" 참고).
- **브리지에 두는 이유**: `entities/trade`에서 `@entities/order`·`@entities/stats`·`@entities/strategy`를 import하면 같은 계층 cross-import가 된다.
- **targeted 무효화를 하지 않는 이유**: 2026-10부터 payload에 `accountId`·`strategyId`(nullable)가 담기지만, 이를 써서 키를 좁히지 않는다.
  - `invalidateQueries`는 활성 쿼리만 즉시 다시 조회한다. 활성 쿼리는 대부분 체결된 계좌·전략의 것이라, 좁혀도 줄어드는 요청이 거의 없다.
  - 반면 `tradeKeys.dailyRange`(계좌 id를 이어 붙인 문자열 키)용 predicate와 null·필드 누락 폴백이 필요해진다. 하나를 빠뜨리면 체결 후에도 값이 갱신되지 않는 버그가 다시 생긴다.
  - 비활성 쿼리의 재조회가 실제 부하로 측정되면 그때 전환한다.

새 예외는 이 문서에 목적과 종료 조건을 먼저 기록해야 한다.

## utils

- `toNum`: BigDecimal string → number

## env

- `env.ts` — kista-api base URL 결정 SSOT. `getApiBaseUrl()`(서버 전용, `API_BASE_URL` 우선 → `NEXT_PUBLIC_API_BASE_URL` 폴백, 둘 다 없으면 throw) / `getApiBaseUrlOrNull()`(실패 허용 경로용). `process.env.API_BASE_URL`/`NEXT_PUBLIC_API_BASE_URL` 직접 참조 금지 — 반드시 이 함수 경유 (`app.md` "API URL" 항목 참고)

## metadata

- `metadata.ts` — 브라우저 탭 제목 접미사 `TITLE_TEMPLATE`(`'%s | KISTA'`) SSOT. 루트 layout과 하위 화면을 둔 중첩 layout(`finance/(dashboard)`·`rejected`)이 쓴다. 규칙은 `docs/agents/constraints.md` 카피 항목 참고

## normalize

- `normalize.ts` — API 응답(unknown) → 도메인 타입 정규화 경량 헬퍼(`optStr`/`optNum`/`optDec` — null이면 undefined). zod 대체 아님. null 분기 없는 캐스팅은 `String()`/`Number()`/`toNum()`을 직접 쓴다

## model

도메인 무관 공용 도메인 모델 및 타입:

- `placed-order.ts` — 주문 상태 타입 (entities/order에서 재export)

## api-schema

`openapi.json`이 SSOT다. enum 타입을 직접 정의하지 말고 `api-schema.ts`에서 가져온다. 타입 재생성은 `npm run gen:types`.

## proxy

`createProxyRoute`는 catch-all 및 정적 Route Handler에서 kista-api 요청 프록시와 인증 토큰 포함을 공통화한다. 모든 upstream fetch는 `cache: 'no-store'`이며, 정적 Route Handler처럼 route context가 없는 호출은 `basePath`를 그대로 사용한다. 업스트림 에러는 `relayUpstreamError`가 매핑한다 — 4xx는 JSON body를 그대로 relay, 5xx는 `{ error: 'Failed' }`로 숨긴다. **예외: kista-api 증권사 장애 503(ProblemDetail `title`이 `'KIS API Error'`/`'Toss API Error'`, `detail`이 사용자용 고정 문구)만 `title`/`detail`/`status`를 골라 relay**한다 — 다른 503(`Trading Core Unavailable` 등)은 `detail`에 내부 호스트가 담긴 예외 메시지가 올 수 있어 숨긴다. kista-api가 이 title을 바꾸면 UI도 함께 바꿔야 한다(422 자격증명 오류·429 호출 한도는 4xx라 원래 relay됨)

## ui

`shared/ui/`는 도메인 무관 커스텀 UI 컴포넌트 디렉토리다. 이름으로 역할이 자명한 것들(`Spinner`·`CardSkeleton`·`Badge`·`EmptyState`·`Surface`·`PageSizeSelector`·`PaginationBar`·`UrlRangeFilterBar`·`ConfirmDeleteDialog`·`stepper/`·`percent-gauge/`) 외 비자명 규칙만 기록:

- `IconButton` — 44px 히트영역 아이콘 전용 버튼(`<button>`), `aria-label` 필수 prop. `<Link>` 아이콘 버튼엔 미사용 — 대신 `shared/ui/iconButtonStyles.ts`(Fast Refresh 위해 컴포넌트 파일과 분리)가 export하는 `ICON_LINK_GHOST_CLASS` 완성 클래스 문자열을 그대로 재사용한다(과거 손으로 다시 이어 붙이다 스타일이 드리프트한 적 있어 export로 전환)
- `TableHeadCell` — 테이블 헤더 셀 공통 스타일 (`<th>` 래퍼). 데이터 셀은 `TableDataCell`(`<td>` 래퍼)과 짝을 이루며 둘 다 기본 정렬이 `text-center`다 — 새 테이블은 이 둘을 함께 써서 헤더·데이터 정렬 드리프트를 피한다
- `SelectionCard` — `selected`를 `aria-pressed`와 테마 대응 외곽선·틴트로 표현하는 선택 버튼. 체크 배지(`showIndicator`)는 2026-08 전량 제거됐다(시각적으로 과했다는 피드백) — 크기·용도 무관하게 항상 테두리만으로 선택을 표시한다
- `SectionError` — 섹션 단위 조회 실패 표시. `widgets/stats-overview`·`widgets/benchmark-comparison`·`widgets/asset-*`·`widgets/cycle-history` 등 여러 widget에서 공유해 cross-widget import를 피하려 이 위치로 이동됨 (`widgets.md` 화이트리스트 목록 참고). "다시 시도" 버튼은 마운트된(active) 쿼리 중 error 상태인 것만 `refetchQueries`로 다시 조회한다 — 호출부가 refetch를 넘기지 않으므로 React Query 밖의 실패(서버 prop 등)에 쓰면 버튼이 아무것도 하지 않는다
- `YearMonthSelect` — `value`(`YYYY-MM`)를 받는 월 그리드 팝오버(네이티브 `<input type="month">` 데스크탑 사파리 미지원 대체). 이동 범위 기본은 `minYear`/`maxYear` 미지정 시 `today` 기준 15년 전 ~ 올해이며, 현재 선택 연도가 그 밖이면 하한/상한이 그 연도까지 넓어진다(선택값이 화살표로 도달 불가한 상태를 만들지 않는다). 미래 월 선택이 필요하면 `maxYear`를 넘긴다(`finance-bulk-register` 대상 월: `currentYear + 1`). 월 단위 교차 제약(from ≤ to 등)은 연 단위만 지원하므로 소비자가 `onValueChange`에서 clamp한다(`benchmark-comparison/BenchmarkFilterBar` 커스텀 기간 참고). 소비자: `asset-overview`·`finance-summary`(월간 모드)·`finance-bulk-register`·`benchmark-comparison`(아파트 커스텀 기간)
- `SegmentedToggle` — `aria-pressed` 버튼 그룹 세그먼트 토글(`role="group"`, `aria-label` 필수). 모드·기간·필터 선택용 공용 컴포넌트라 위젯마다 `ModeButton`류를 다시 만들지 않는다. 균등 분할은 `className="grid grid-cols-N"`, 버튼 크기 조정은 `itemClassName`. "선택 없음(undefined)"은 센티널 값으로 매핑한다(`stats-overview/StrategyTypeFilterToggle` 참고). 소비자: `asset-trend`·`asset-composition`·`finance-trend`·`finance-summary`·`stats-overview`·`benchmark-comparison`·`finance/manage-categories`(유형 — 같은 목록을 거르는 값 선택이라 탭이 아님), 기간 프리셋(`range-filter/RangeFilterControls`·`UrlRangeFilterBar`)
- `SegmentedTabs` — 같은 화면 안에서 내용 패널을 바꾸는 탭(Base UI `Tabs` 래핑, `tablist`/`tab`/`tabpanel`). Tab 정지점 1개 + 화살표 이동(`activateOnFocus`로 즉시 전환), 비활성 패널은 언마운트. 소비자: `account-detail`(모바일 계좌/전략 탭 — 데스크탑은 탭 없이 두 패널을 그리드로 동시 표시)
- `SectionTabBar` — 라우트 이동 탭(`<nav aria-label>` + `Link` `aria-current="page"`). 페이지가 바뀌는 링크라 WAI-ARIA tabs가 아니다. 소비자: `FinanceHeader`·`StatsHeader`
- 세 컴포넌트는 의미(값 선택 / 내용 전환 / 라우트 이동)로 고르고, 세그먼트 시각(테두리 컨테이너·`--brand-fg-soft` 활성)은 `segmentedStyles.ts` 상수를 공유한다 — 활성·비활성 클래스를 손으로 다시 쓰지 않는다
- `YearSelect` — `value`(연도 `number`)를 받는 연도 그리드 팝오버. `YearMonthSelect`와 같은 시각 언어의 연 단위 버전(월 그리드 대신 3열 연도 그리드, 페이징 화살표 없음). 범위 규칙은 `YearMonthSelect`와 동일(`minYear`/`maxYear` 미지정 시 `today` 기준 15개년, 선택값 밖이면 확장). 소비자: `finance-summary`(연간 모드)

shadcn 자동생성 컴포넌트는 `components/ui/`에 두고 `npx shadcn@latest add <component> --yes`로만 추가한다. 단 `button-variants.ts`(버튼 스타일 SSOT, `button.tsx`가 import)는 커스텀 variant(`brand`/`brand-soft`)·size(`form`/`cta`)가 들어 있어 `button`을 다시 add하면 덮어쓰인다 — 재생성 시 수동 병합한다. `dialog.tsx`도 닫기 버튼 sr-only 문구를 한글("닫기")로 바꿔 두었으니 `dialog`를 다시 add하면 같은 수정을 다시 적용한다.

## providers

`Providers` 컴포넌트는 루트 `app/layout.tsx`에서 마운트한다. `QueryProvider`는 `@shared/lib/query`의 `createQueryClient()`만 사용한다. Toaster 배치 규칙은 `docs/agents/app.md`를 기준으로 본다.
