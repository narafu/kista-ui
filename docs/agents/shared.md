# shared/ — 도메인 무관 공용 자산

도메인 지식 없이 어디서나 사용 가능한 유틸리티. 모든 계층에서 import 가능하며, `shared/` 내부에서 `entities/`·`features/`·`widgets/` import는 금지한다. 구성: `lib/`(api-client·api-schema·api-types·auth·query·format·hooks·proxy·date-range·env·firebase·normalize·utils), `model/`, `providers/`, `ui/`.
캐시 소유권·hydration·mutation 동기화 규범은 `docs/agents/entities.md`를 따른다. router.refresh() 허용 범위와 stale time 기준은 아래 참고.

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
| margin, prices, portfolio/execution | 0 또는 stream-driven | 거래 판단에 쓰는 라이브 값 |
| runtime-config, admin-settings | 0 | 운영 설정 변경 즉시 반영, 필요 시 focus refetch |
| market holidays | hydration 데이터 24시간, 미주입 0 | 월 단위 참조 데이터, 실패를 장기 빈 값으로 캐시하지 않음 |
| candles | 10분 | 차트 조회 비용과 최신성 균형 |
| fear/greed | 6시간 | 원본 갱신 주기의 절반 |
| housing regions | 1시간 | 저빈도 참조 목록 |
| Next reference cache | 1-24시간 | 데이터별 TTL/tag 필수 |

### router.refresh() 허용 범위

일반 query mutation의 성공 처리에는 사용하지 않는다(캐시 동기화 대신 이동 전 `router.refresh()`를 호출하는 패턴 금지 — refresh는 현재 route만 갱신하고 목적지 Router Cache의 가변 상태를 보장하지 않는다). 현재 허용되는 예외는 다음 세 가지뿐이다.

- `widgets/pull-to-refresh/PullToRefresh.tsx`: 사용자가 명시적으로 요청한 화면 전체 재동기화다. 특정 mutation의 누락된 캐시 처리를 가리는 수단이 아니라 모바일의 수동 recovery 동작이므로 허용한다.
- `entities/trade/providers/TradeNotificationProvider.tsx`: SSE `trade` 이벤트는 알림 중심 payload이며 영향을 받는 서버 렌더 집계 전체를 아직 식별할 수 없다. 외부에서 발생한 체결 뒤 toast와 서버 화면을 재동기화하기 위한 provider-level refresh를 유지한다. 이벤트 payload가 account/strategy/order/trade key를 완전히 특정하게 되면 targeted `setQueryData`/invalidate로 대체한다.
- `entities/finance/providers/ActiveGroupProvider.tsx`(`setGroupId`): 그룹 전환은 finance 쿼리 전부(자산 스냅샷·카테고리·계좌·월 마감)의 스코프를 바꾸는 전역 컨텍스트 전환이다 — 영향받는 캐시 키가 `groupId` 세그먼트를 포함하는 모든 `financeKeys.*` 조합이라 targeted invalidate로 나열하기보다 화면 전체 재동기화가 더 안전하다. 그룹 전환 빈도가 낮아(설정 화면에서만 발생) 비용도 낮다. 종료 조건: finance 쿼리들이 유한한 목록으로 정리되어 groupId 변경 시 무효화할 키 집합을 안전하게 열거할 수 있게 되면 targeted invalidate로 대체한다.

새 예외는 이 문서에 목적과 종료 조건을 먼저 기록해야 한다.

## utils

- `toNum`: BigDecimal string → number

## env

- `env.ts` — kista-api base URL 결정 SSOT. `getApiBaseUrl()`(서버 전용, `API_BASE_URL` 우선 → `NEXT_PUBLIC_API_BASE_URL` 폴백, 둘 다 없으면 throw) / `getApiBaseUrlOrNull()`(실패 허용 경로용). `process.env.API_BASE_URL`/`NEXT_PUBLIC_API_BASE_URL` 직접 참조 금지 — 반드시 이 함수 경유 (`app.md` "API URL" 항목 참고)

## normalize

- `normalize.ts` — API 응답(unknown) → 도메인 타입 정규화 경량 헬퍼(`str`/`optStr`/`num`/`optNum`/`dec`/`optDec`). zod 대체 아님, 반복되던 `String()`/`Number()`/`toNum()` 캐스팅만 추출

## model

도메인 무관 공용 도메인 모델 및 타입:

- `placed-order.ts` — 주문 상태 타입 (entities/order에서 재export)

## api-schema

`openapi.json`이 SSOT다. enum 타입을 직접 정의하지 말고 `api-schema.ts`에서 가져온다. 타입 재생성은 `npm run gen:types`.

## proxy

`createProxyRoute`는 catch-all 및 정적 Route Handler에서 kista-api 요청 프록시와 인증 토큰 포함을 공통화한다. 모든 upstream fetch는 `cache: 'no-store'`이며, 정적 Route Handler처럼 route context가 없는 호출은 `basePath`를 그대로 사용한다.

## ui

`shared/ui/`는 도메인 무관 커스텀 UI 컴포넌트 디렉토리다. 이름으로 역할이 자명한 것들(`Spinner`·`CardSkeleton`·`Badge`·`EmptyState`·`Surface`·`PageSizeSelector`·`PaginationBar`·`UrlRangeFilterBar`·`ConfirmDeleteDialog`·`stepper/`·`percent-gauge/`) 외 비자명 규칙만 기록:

- `IconButton` — 44px 히트영역 아이콘 전용 버튼(`<button>`), `aria-label` 필수 prop. `<Link>` 아이콘 버튼엔 미사용 — 대신 같은 파일이 export하는 `ICON_LINK_GHOST_CLASS` 완성 클래스 문자열을 그대로 재사용한다(과거 손으로 다시 이어 붙이다 스타일이 드리프트한 적 있어 export로 전환)
- `TableHeadCell` — 테이블 헤더 셀 공통 스타일 (`<th>` 래퍼). 데이터 셀은 `TableDataCell`(`<td>` 래퍼)과 짝을 이루며 둘 다 기본 정렬이 `text-center`다 — 새 테이블은 이 둘을 함께 써서 헤더·데이터 정렬 드리프트를 피한다
- `SelectionCard` — `selected`를 `aria-pressed`와 테마 대응 외곽선·틴트로 표현하는 선택 버튼. 체크 배지(`showIndicator`)는 2026-08 전량 제거됐다(시각적으로 과했다는 피드백) — 크기·용도 무관하게 항상 테두리만으로 선택을 표시한다
- `SectionError` — 섹션 단위 조회 실패 표시. `widgets/stats-overview`·`widgets/benchmark-comparison`·`widgets/asset-*`·`widgets/cycle-history` 등 여러 widget에서 공유해 cross-widget import를 피하려 이 위치로 이동됨 (`widgets.md` 화이트리스트 목록 참고)

shadcn 자동생성 컴포넌트는 `components/ui/`에 두고 `npx shadcn@latest add <component> --yes`로만 추가한다.

## providers

`Providers` 컴포넌트는 루트 `app/layout.tsx`에서 마운트한다. `QueryProvider`는 `@shared/lib/query`의 `createQueryClient()`만 사용한다. Toaster 배치 규칙은 `docs/agents/app.md`를 기준으로 본다.
