# shared/ — 도메인 무관 공용 자산

도메인 지식 없이 어디서나 사용 가능한 유틸리티. 모든 계층에서 import 가능하며, `shared/` 내부에서 `entities/`·`features/`·`widgets/` import는 금지한다. 구성은 `ls shared/`로 확인한다.
캐시 소유권·hydration·mutation 동기화 규범은 `docs/agents/entities.md`를 따른다. router.refresh() 허용 범위·체결 SSE 무효화 대상과 stale time 기준은 아래 참고.

## api-client

`apiFetch`(`@shared/lib/api-client`)는 Server Component 전용(token 필요), `clientFetch`는 Client Component 전용이며 401이면 RT로 갱신해 재시도하고, **갱신이 거절되면 자동 로그아웃**한다. 갱신 결과를 알 수 없으면(`/api/auth/refresh`가 401 외 상태이거나 네트워크 실패 — Route Handler는 api의 5xx·408·429·timeout(5초)·연결 실패를 503으로 낸다) 로그아웃하지 않고 503 `ApiError`를 던진다. kista-api는 회전된 RT를 다시 내도 회전 후 1일 안이고 후계가 미사용이면 같은 후계를 돌려주므로(재시도 안전) 응답 유실 뒤 재시도해도 전체 세션 폐기가 나지 않는다. 로그아웃은 갱신 거절(401)과, 갱신 성공 뒤 재시도도 401일 때다. `clientFetch<void>`로 204 응답도 처리한다.

## date-range

`lib/date-range.ts` — `RangePreset('7d'|'30d'|'all'|'custom')`, `resolveRange`/`resolveRangeStrict`, URL 쿼리 파서(`parseRangePreset`/`parseSize`/`parsePage`). `UrlRangeFilterBar`와 함께 사용.

## cache

Next.js persistent cache는 가변 인증 데이터에 사용하지 않는다. 느리게 변하는 reference/public 데이터에만 명시적 TTL/tag로 허용하며, `unstable_cache`는 Next.js 16 legacy API다. 신규 `cacheTag`는 `cacheComponents`와 `'use cache'` 도입이 전제다. 이 금지 규칙(`getCached*` 리더, `initialDataUpdatedAt: 0`, entities hook의 `router.refresh()`, `next/cache`의 `unstable_cache`·`cacheTag`)은 `eslint.config.mjs`의 `no-restricted-syntax`·`no-restricted-imports`가 강제한다

## query

`createQueryClient()`가 React Query 클라이언트 기본값을 중앙 관리한다. 기본 정책: `staleTime=30s`, `gcTime=10m`, `retry=0`, `refetchOnWindowFocus=false`. 기본값은 이 파일에서만 바꾸고(다른 곳에서 `new QueryClient` 생성 금지), 바꿀 때는 이 파일과 테스트를 함께 수정한다. 개별 override는 데이터 성격을 설명하는 주석 또는 테스트가 있어야 한다.

### Stale Time

코드와 대조 검증된 resource별 `staleTime` 기준값:

| 리소스 | `staleTime` | 근거 |
|---|---:|---|
| 공통 기본값, accounts, strategies | 30초 | 화면 재진입 재사용과 mutation 직접 동기화의 균형 |
| me, order preview/history, stats | 60초 | 자주 읽지만 mutation에서 명시적으로 무효화 |
| trade/cycle history, daily trades | 5분 | 과거 이력 중심 |
| prices | 0 | 거래 판단에 쓰는 라이브 값 |
| admin-settings | 0 | 운영 설정 편집 화면. 앱 전역 소비는 meta(`getMetaBundle`, `cache: 'no-store'`) |
| market holidays | 24시간 | 월 단위 참조 데이터. 실패한 서버 조회는 dehydrate되지 않아 장기 빈 값으로 캐시되지 않음 |
| candles | 10분 | 차트 조회 비용과 최신성 균형 |
| fear/greed | 10분 | 수집(KST 07:00·12:00)이 고르지 않아 짧게 둔다. 서버 max-age와 같은 값(프록시는 Cache-Control 미전달) |
| housing regions | 1시간 | 저빈도 참조 목록 |
| Next reference cache | 1-24시간 | 데이터별 TTL/tag 필수 |

### router.refresh() 허용 범위

일반 query mutation의 성공 처리에는 사용하지 않는다(캐시 동기화 대신 이동 전 `router.refresh()`를 호출하는 패턴 금지 — refresh는 현재 route만 갱신하고 목적지 Router Cache의 가변 상태를 보장하지 않는다). 현재 허용되는 예외는 다음 셋이다.

- `widgets/pull-to-refresh/PullToRefresh.tsx`: 사용자가 명시적으로 요청한 화면 전체 재동기화다. 특정 mutation의 누락된 캐시 처리를 가리는 수단이 아니라 모바일의 수동 recovery 동작이므로 허용한다.
- `features/admin/settings/ui/AdminSettingsForm.tsx` 저장 성공: 운영 설정은 React Query 캐시가 아니라 레이아웃 Server Component가 받는 meta(`getMetaBundle`)로 소비된다 — 현재 route의 레이아웃을 다시 받아 관리자 화면 meta를 갱신한다(다른 route는 진입할 때 no-store로 새로 받는다).
- 에러 바운더리(`app/**/error.tsx`·`global-error.tsx`)의 "다시 시도" — `unstable_retry`가 내부에서 refresh한다. 이미 깨진 화면의 사용자 요청 복구 동작이고, 네트워크 실패로 RSC payload를 못 받은 오류는 refresh 없이 복구되지 않는다.

#### 체결 SSE는 refresh 없이 무효화만 한다

`entities/trade/providers/TradeNotificationProvider.tsx`는 SSE `trade` 이벤트를 받으면 toast를 띄우고 주입된 `onTrade`를 호출할 뿐 `router.refresh()`를 하지 않는다. 과거 refresh를 함께 호출해 prefetch 키가 hydrate와 invalidate refetch로 두 번 조회돼 제거했다.

- **전제**: 체결로 바뀌는 값은 전부 React Query 키로 조회된다. 키 없이 SSR prop으로 렌더되던 체결 민감 값 두 가지는 이관을 마쳤다.
  - `/accounts/[id]`의 예수금·평가금: `tradeKeys.portfolio`, `accountPortfolioQueryOptions`
  - 전략 수정 폼의 `currentHoldings`·`vr.value`: `StrategyFormPage`가 `strategyKeys.detail` 캐시를 읽는다
- **새 화면 규칙**: 체결 민감 값을 Server Component에서 직접 계산해 prop으로 넘기지 않는다. refresh가 없으므로 체결 후에도 갱신되지 않는다. queryOptions로 prefetch+hydrate하고, 그 키를 아래 대상에 포함시킨다.
- **대상·제외 키**: 무효화는 `widgets/layout/TradeNotificationBridge.tsx`에서 마운트되며 대상·제외 키와 `strategyKeys.lists()` → `details()` 순서는 `TradeNotificationBridge.test.tsx`가 고정한다(1회 호출은 `entities/strategy/model/queryOptions.test.ts`). 이유만 남긴다.
  - lists를 details보다 먼저 무효화해야 한다 — `strategyDetailQueryOptions`가 목록 캐시를 거쳐 찾으므로, 순서가 바뀌면 detail이 아직 fresh한 목록 캐시를 재사용해 갱신 전 값을 받는다.
  - housing-comparison은 내 투자 수익률을 포함하므로 대상이다. housing·etf 시장 시계열·regions는 체결과 무관하다(`statsKeys.all` 금지).
  - `strategyKeys.validation`(전략 폼 서버 검증)은 입력마다 키가 바뀌어 체결 무효화 대상이 아니다(`strategyKeys.all` 금지).
- **서버 TTL**: summary·equity-curve·housing-comparison의 kista-api 서버 TTL 캐시는 체결 시 사용자 단위로 비워지므로 재조회가 새 값을 받는다. Redis 메시지 유실이나 계산 중 경합이 생기면 TTL이 지나야 갱신된다(`entities.md` "stats 서버 TTL" 참고).
- **브리지에 두는 이유**: `entities/trade`에서 `@entities/order`·`@entities/stats`·`@entities/strategy`를 import하면 같은 계층 cross-import가 된다.
- **targeted 무효화를 하지 않는 이유**: 2026-10부터 payload에 `accountId`·`strategyId`(nullable)가 담기지만, 이를 써서 키를 좁히지 않는다.
  - `invalidateQueries`는 활성 쿼리만 즉시 다시 조회한다. 활성 쿼리는 대부분 체결된 계좌·전략의 것이라, 좁혀도 줄어드는 요청이 거의 없다.
  - 반면 `tradeKeys.dailyRange`(계좌 id를 이어 붙인 문자열 키)용 predicate와 null·필드 누락 폴백이 필요해진다. 하나를 빠뜨리면 체결 후에도 값이 갱신되지 않는 버그가 다시 생긴다.
  - 비활성 쿼리의 재조회가 실제 부하로 측정되면 그때 전환한다.

새 예외는 이 문서에 목적과 종료 조건을 먼저 기록해야 한다.

## normalize · api-schema

- `normalize.ts` — API 응답(unknown) → 도메인 타입 정규화 경량 헬퍼(`optStr`/`optNum`/`optDec` — null이면 undefined). zod 대체 아님. null 분기 없는 캐스팅은 `String()`/`Number()`/`toNum()`을 직접 쓴다
- enum 타입을 직접 정의하지 말고 `api-schema.ts`에서 가져온다

## env

`env.ts`의 `getApiBaseUrl()`/`getApiBaseUrlOrNull()`만 쓴다 — `process.env.API_BASE_URL`/`NEXT_PUBLIC_API_BASE_URL` 직접 참조 금지(`app.md` "API URL").

## metadata

탭 제목 접미사 `TITLE_TEMPLATE`는 `shared/lib/metadata.ts`가 SSOT. 규칙은 `docs/agents/copy.md`, 강제는 `eslint.config.mjs`(app 소스의 `| KISTA` 리터럴, 중첩 layout의 문자열 title 금지).

## proxy

`createProxyRoute`는 catch-all 및 정적 Route Handler에서 kista-api 요청 프록시와 인증 토큰 포함을 공통화한다. 업스트림 연결 실패는 `fetchUpstream`이 502로 바꾼다(직접 fetch 하는 Route Handler도 이것을 쓴다). 모든 upstream fetch는 `cache: 'no-store'`이며, 정적 Route Handler처럼 route context가 없는 호출은 `basePath`를 그대로 사용한다. 업스트림 에러는 `relayUpstreamError`가 매핑한다 — 4xx는 JSON body를 그대로 relay, 5xx는 `{ error: 'Failed' }`로 숨긴다. **예외: 사용자용 고정 문구 503 — 증권사 장애(`code`가 `BROKER_UNAVAILABLE`, 모든 메서드)와 엔진 재시작(`ENGINE_RESTARTING`, Caddy `handle_errors`가 싣는다, GET만 — 쓰기에 재시도 문구를 띄우지 않는다)만 `title`/`detail`/`status`/`code`를 골라 relay**한다 — 다른 503(`Trading Core Unavailable` 등)은 `detail`에 내부 호스트가 담긴 예외 메시지가 올 수 있어 숨긴다. kista-api가 이 code를 바꾸면 UI도 함께 바꿔야 한다(422 자격증명 오류·429 호출 한도는 4xx라 원래 relay됨)

## ui

`shared/ui/`는 도메인 무관 커스텀 UI 컴포넌트 디렉토리다. 이름으로 역할이 자명한 것들(`Spinner`·`CardSkeleton`·`Badge`·`EmptyState`·`PageSizeSelector`·`PaginationBar`·`UrlRangeFilterBar`·`stepper/`) 외 비자명 규칙만 기록:

- `Surface` — 섹션 카드 셸은 이것 하나(`components/ui/card`는 지웠다). `size`: `default` `p-4 sm:p-6`(설정·폼) / `compact` `p-4`(목록·차트·요약) / `flush` 여백 없음(표·차트를 가장자리까지, 안쪽 여백은 자식이). 레이아웃(flex·gap·overflow)은 className. `SectionTitle` — 구역 제목 `h2`(`text-base font-medium lg:text-lg`), className에는 배치만 넣고 크기·굵기·색을 덮지 않는다(예외로 손수 둔 제목: 상태색 "위험 구역"(설정·계좌 수정), 계좌 등록 `steps/*`의 마법사 단계 제목, sr-only, ref·id로 포커스·연결하는 제목, 폼 안 하위 구역의 h3)
- `IconButton` — 44px 히트영역 아이콘 전용 버튼(`<button>`), `aria-label` 필수 prop. `<Link>` 아이콘 버튼엔 미사용 — 대신 `shared/ui/iconButtonStyles.ts`(Fast Refresh 위해 컴포넌트 파일과 분리)가 export하는 `ICON_LINK_GHOST_CLASS` 완성 클래스 문자열을 그대로 재사용한다(과거 손으로 다시 이어 붙이다 스타일이 드리프트한 적 있어 export로 전환)
- `InputWithUnit`(`InputUnitSuffix.tsx`) — 공용 `Input` 오른쪽에 단위 span만 덧붙이는 래퍼. input에 `pr-8`·`aria-describedby={unitId}`는 호출부가 직접 단다. 자체 상자를 그리는 `AmountInput`과 구분: 공용 Input 스타일을 유지해야 하는 폼(가계부 콤마 금액 등)에서만 쓴다
- `AmountInput` — 우측 정렬 숫자 입력 + 단위 상자(값 `number | null`, 입력 중 문자열 버퍼 유지). 소수 자릿수는 `currency`(`CURRENCY_SCALE`에서 결정) 또는 `maxDecimals`(퍼센트·수량) 중 하나만 준다 — 둘을 함께 주면 타입 오류. 단위를 보이지 않으려면 `unit=""`. `type="number"` 스피너·`min` 제약이 필요한 폼(`CategoryFormDialog`·`DcaConditionsSection` 기준값·`PrivacyBaseFormDialog`·`PrivacyOrderFields`)은 공용 `Input`을 그대로 쓴다
- `form/useAppForm` + `form/FormField` + `FormActions` — 폼 구현 하나(react-hook-form + zod). `useAppForm`이 zod 검증(형식만 — 서버 한도·교차 규칙은 넣지 않는다), 제출 → 기존 mutation hook의 `mutate`, 진행 상태(`mutation.isPending`), 성공 토스트(`successMessage`, hook이 이미 띄우면 생략)와 `onDone`을 맡는다. 실패 토스트는 hook의 `onError`가 띄운다(여기서 또 띄우지 않는다). 생성·수정은 호출부가 mode로 hook 하나를 골라 `mutation`에 넘긴다. 서버 `fieldErrors` → `setError`는 `MAP_SERVER_FIELD_ERRORS`로 꺼 두었다(api T7 뒤 켠다). `FormField`가 Label·필수 `*`(label 밖, `aria-required`)·힌트·오류 문구와 `aria-describedby`/`aria-invalid`를 조립하고, `FormActions form={form}`의 제출 중 문구는 `{label} 중…`이다. 제출 버튼은 진행 중과 `locked`(월 마감·기간 밖 날짜처럼 무엇을 입력해도 제출할 수 없는 서버 상태)일 때만 비활성이다 — 잠금이면 `<form onSubmit={(e) => (locked ? e.preventDefault() : form.submit(e))}>`로 Enter 제출도 막고 이유 문장을 폼에 보인다. 빈 값·형식 오류는 비활성이 아니라 제출 시 zod 필드 오류다. `schema`·`mutation`·`toPayload`·`successMessage`·`onDone` 밖의 옵션(`values`, `resetOptions` 등)은 `useForm`에 그대로 넘긴다. 제출 전 확인 단계가 있으면 `<form onSubmit={form.handleSubmit(열기)}>` 후 확인 버튼에서 `form.submit()`
- `ConfirmDialog` — 모든 확인 다이얼로그의 틀(`AlertDialog` 직접 조립 금지). 방식 둘: `onConfirm`+`pending`(폼 안 확인 단계 등 호출부가 제출·닫기를 다룰 때)과 `mutation`+`variables`(버튼 하나로 끝나는 확인 — 진행 표시, 성공 후 닫기). 실패 토스트는 hook의 `onError`가 띄우므로 안에서 또 띄우지 않고, 성공 토스트는 `onSuccess`. `destructive` 기본 true(삭제·탈퇴·연결 해제), 승인·변경처럼 아닌 경우만 false. 진행 문구 기본은 `confirmLabel + " 중…"`이고 다른 문구는 `pendingLabel`. 닫힌 뒤·다시 연 뒤 도착한 이전 회차의 성공은 새 다이얼로그를 닫지 못한다(회차 가드). 열기 버튼은 `trigger={<button aria-disabled onClick={blockTriggerWhile(처리중)}>}`로 넘긴다(포커스 복귀·`aria-expanded`는 Base UI 트리거가 맡고, 처리 중 열기만 막는다). 닫히는 애니메이션 중에는 확인 버튼이 잠긴다. 성공 뒤 이동하는 화면은 호출부가 `leaving` 상태를 `pending`과 트리거 차단에 합친다(`EditAccountForm`, `DeleteAccountButton`). 안에 입력·선택이 있는 화면(`CloseStrategyDialog`)은 틀에 안 담겨 `AlertDialog`를 직접 쓴다
- `data-list/DataList` + `useDataListSort` — 컬럼 정의 하나로 lg 이상 표와 lg 미만 카드, 로딩·실패·빈 상태, 날짜 그룹(`groupBy`), 더 보기(`loadMore`)를 그린다. 모바일 카드는 컬럼의 `mobile` 역할(`title`·`titleBadge`·`badge`·기본 라벨-값·`hidden`, 날짜 그룹 카드는 라벨과 값을 한 줄에 둔다)과 행별 숨김 `mobileHiddenWhen`으로 정해지고 카드 마크업을 따로 쓰는 탈출구는 없다. `isError`에는 호출부나 훅이 계산한 `isError && !data`를 넘긴다. 정렬 상태는 `useDataListSort`로 꺼내 `MobileSortControl`과 공유한다. 필터·각주는 DataList 밖에 둔다
- `AsyncSection` + `asyncFallback` — 한 구역의 로딩·실패·빈 상태 판정의 단일 구현이고 `DataList`도 이것을 쓴다. `isError`는 데이터가 없을 때만 실패로 그린다. 로딩 프리셋은 `text`·`chart`이고, 카드 안에서 자리를 유지할 때 `fallbackClassName`에 높이를 준다(실패 표시의 자체 테두리가 빠진다). 제목은 받지 않는다(호출부가 `SectionTitle`을 둔다)
- `skeletons` — 라우트 `loading.tsx`가 `export { X as default } from '@shared/ui/skeletons'` 한 줄로 쓰는 화면 골격
- `TableHeadCell` — 테이블 헤더 셀 공통 스타일 (`<th>` 래퍼). 데이터 셀은 `TableDataCell`(`<td>` 래퍼)과 짝을 이루며 둘 다 기본 정렬이 `text-center`다 — 새 테이블은 이 둘을 함께 써서 헤더·데이터 정렬 드리프트를 피한다
- `SortableHeadCell` + `MobileSortControl` + `useTableSort`(`shared/lib/hooks`) — 표 정렬 세트. 데스크탑 헤더는 `SortableHeadCell`, lg 미만 카드 목록은 `MobileSortControl`(정렬 기준 Select + 방향 버튼)을 목록 위에 두고 같은 `useTableSort` 상태를 공유한다. 정렬은 페이지네이션 이전 전량 배열에 적용하고 값 없는 행(null)은 방향과 무관하게 맨 아래에 둔다. 서버 페이지네이션 표와 날짜 그룹 표는 현재 페이지만 정렬돼 오해를 부르므로 적용하지 않는다. 정렬 안 된 기본 순서가 필요하면 헤더에 없는 `'default'` 키를 초기값으로 쓴다(`useDataListSort`는 처음부터 응답 순서다)
- `SelectionCard` — `selected`를 `aria-pressed`와 테마 대응 외곽선·틴트로 표현하는 선택 버튼. 체크 배지(`showIndicator`)는 2026-08 전량 제거됐다(시각적으로 과했다는 피드백) — 크기·용도 무관하게 항상 테두리만으로 선택을 표시한다
- `SectionError` — 섹션 단위 조회 실패 표시. `widgets/stats-overview`·`widgets/benchmark-comparison`·`widgets/asset-*`·`widgets/cycle-history` 등 여러 widget에서 공유해 cross-widget import를 피하려 이 위치로 이동됨 (`widgets.md` 화이트리스트 목록 참고). "다시 시도" 버튼은 마운트된(active) 쿼리 중 error 상태인 것만 `refetchQueries`로 다시 조회한다 — 호출부가 refetch를 넘기지 않으므로 React Query 밖의 실패(서버 prop 등)에 쓰면 버튼이 아무것도 하지 않는다. `error`로 이 구역의 조회 오류를 넘기면 502·503(서버 `detail` 없음)일 때 넘긴 문구 대신 서버 재시작 안내를, `ENGINE_RESTARTING`이면 서버 `detail`을 보인다. 문구 색은 실패면 `text-status-error`, 재시작 안내면 `text-muted-foreground`(곧 풀리는 상태). mutation에는 쓰지 않는다
- `YearMonthSelect` — `value`(`YYYY-MM`)를 받는 월 그리드 팝오버(네이티브 `<input type="month">` 데스크탑 사파리 미지원 대체). 이동 범위 기본은 `minYear`/`maxYear` 미지정 시 `today` 기준 15년 전 ~ 올해이며, 현재 선택 연도가 그 밖이면 하한/상한이 그 연도까지 넓어진다(선택값이 화살표로 도달 불가한 상태를 만들지 않는다). 미래 월 선택이 필요하면 `maxYear`를 넘긴다(`finance-bulk-register` 대상 월: `currentYear + 1`). 월 단위 교차 제약(from ≤ to 등)은 연 단위만 지원하므로 소비자가 `onValueChange`에서 clamp한다(`benchmark-comparison/BenchmarkFilterBar` 커스텀 기간 참고).
- `SegmentedToggle` — `aria-pressed` 버튼 그룹 세그먼트 토글(`role="group"`, `aria-label` 필수). 모드·기간·필터 선택용 공용 컴포넌트라 위젯마다 `ModeButton`류를 다시 만들지 않는다. 균등 분할은 `className="grid grid-cols-N"`, 버튼 크기 조정은 `itemClassName`. "선택 없음(undefined)"은 센티널 값으로 매핑한다(`stats-overview/StrategyTypeFilterToggle` 참고).
- `SegmentedTabs` — 같은 화면 안에서 내용 패널을 바꾸는 탭(Base UI `Tabs` 래핑, `tablist`/`tab`/`tabpanel`). Tab 정지점 1개 + 화살표 이동(`activateOnFocus`로 즉시 전환), 비활성 패널은 언마운트. 예: `account-detail` 모바일 탭(데스크탑은 두 패널 동시 표시)
- `SectionTabBar` — 라우트 이동 탭(`<nav aria-label>` + `Link` `aria-current="page"`). 페이지가 바뀌는 링크라 WAI-ARIA tabs가 아니다.
- 세 컴포넌트는 의미(값 선택 / 내용 전환 / 라우트 이동)로 고르고, 세그먼트 시각(테두리 컨테이너·`--brand-fg-soft` 활성)은 `segmentedStyles.ts` 상수를 공유한다 — 활성·비활성 클래스를 손으로 다시 쓰지 않는다
- `YearSelect` — `value`(연도 `number`)를 받는 연도 그리드 팝오버. `YearMonthSelect`와 같은 시각 언어의 연 단위 버전(월 그리드 대신 3열 연도 그리드, 페이징 화살표 없음). 범위 규칙은 `YearMonthSelect`와 동일(`minYear`/`maxYear` 미지정 시 `today` 기준 15개년, 선택값 밖이면 확장).

shadcn 자동생성 컴포넌트는 `components/ui/`에 두고 `npx shadcn@latest add <component> --yes`로만 추가한다. 단 `button-variants.ts`(버튼 스타일 SSOT, `button.tsx`가 import)는 커스텀 variant(`brand`/`brand-soft`)·size(`form`/`cta`)가 들어 있어 `button`을 다시 add하면 덮어쓰인다 — 재생성 시 수동 병합한다. `dialog.tsx`도 닫기 버튼 sr-only 문구를 한글("닫기")로 바꿔 두었으니 `dialog`를 다시 add하면 같은 수정을 다시 적용한다.

## 선택형 카드 · CTA 버튼 위계

- **선택형 카드**: 전략 등록·수정 섹션, 알림 수단, 테마 선택, 백테스트 폼은 전부 `@shared/ui/selection-card`의 `SelectionCard`를 사용한다. 카드 크기·용도 무관하게 항상 테두리만으로 선택을 표시한다 — 체크 배지(`showIndicator`)는 2026-08 전량 제거됐다(시각적으로 과했다는 피드백, `SelectionCard`에 해당 prop 자체가 더 이상 없음)
- **CTA 버튼 위계**: 버튼 스타일 SSOT는 `components/ui/button-variants.ts`의 `buttonVariants`다(`Button`도 이걸 import — 화면마다 색·높이·radius를 직접 지정하지 않는다).
  - `variant: 'brand'`(로즈골드 그라데이션): "화면(탭)당 유일한 최상위 등록/실행 진입점"에만 쓴다(자산/거래/계좌/전략 등록). gradient를 남발하면 CTA 위계가 무너진다(2026-08 "모두 등록" 버튼을 gradient로 바꿨다가 되돌린 사례 있음). PageHeader 우측 헤더 CTA는 `size: 'cta'`(h-8·text-xs)와 함께 쓴다
  - `variant: 'brand-soft'`(로즈 틴트): 설정 화면 CRUD 관리 리스트의 "항목 추가"류(카테고리 추가, 재무계좌 추가, 초대 코드 발급, 예산 추가 등) 2단계 CTA, `size: 'sm'`과 함께 쓴다 — 한 화면에 여러 개가 동시에 존재할 수 있어 gradient 대신 이 단계로 낮춘다. 기간 필터 "적용"처럼 브랜드 톤 보조 액션도 이 variant
  - 폼 제출 버튼은 `default`(primary). 폼 하단 제출/취소 행은 `shared/ui/FormActions`를 쓰고, 그 밖의 단독 주요 버튼(위저드 이전/다음, 재신청 등)도 `size: 'form'`(h-12)으로 높이를 맞춘다. 예외: Input 옆 인라인 버튼은 Input 높이에 맞춘다(`AcceptInvitationForm` h-11)
  - 삭제·탈퇴·연결 해제 등 파괴적 동작의 텍스트 트리거 버튼은 `variant: 'destructive'`(연한 빨강 틴트)로 통일한다 — outline+빨간 글씨·ghost+빨간 글씨·텍스트 링크를 섞지 않는다. 확인 다이얼로그의 최종 버튼(`AlertDialogAction`)도 `destructive`. 행 안의 아이콘 전용 삭제 버튼은 `IconButton` 규칙을 따른다
  - 위계를 한 단계 더 낮추는 예외(outline 등)는 해당 파일에 근거를 주석으로 남긴다
