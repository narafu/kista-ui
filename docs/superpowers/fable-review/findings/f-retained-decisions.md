# 유지 확정 결정 전수 목록 (kista-ui 문서 기준)

작성 목적: 전면 구조 검토에서 "유지 확정·재론 금지" 항목을 1회 재심하기 위한 목록.
범위: 루트·중첩 CLAUDE.md, `docs/agents/*.md`, `docs/superpowers/{audit,plans,specs}`, 메모리 `.md`, `knip.json`, `eslint.config.mjs`, `README.md` 아키텍처 절.
이 파일은 판단을 담지 않는다. "확정 결정"과 "비대 유발 가능 표시"만 기록한다. 코드 변경 없음.

표기: 출처는 `파일:줄`. 줄 번호가 확인되지 않은 경우 `파일(절/항목명)`으로 적었다. 이유가 문서에 없으면 "이유 미기재".
분류: 아키텍처·계층 / 데이터 패칭·상태 / 타입·API 계약 / UI 일관성·카피 / a11y / 테스트·검증 / 도메인 / 운영·배포 / 작업 방식(목록에 없어 추가).

---

## 1. 아키텍처·계층

| # | 결정 내용 | 출처 | 이유 | 분류 |
|---|---|---|---|---|
| A-01 | FSD 단방향 의존 `app -> widgets -> features -> entities -> shared`, 동일 계층 cross-import 금지 | architecture.md:20, README.md:(계층 구조 절) | 이유 미기재 | 아키텍처 |
| A-02 | entities 간 직접 참조 금지, 두 도메인 조합은 features/widgets에서 | entities.md:15 | 이유 미기재 | 아키텍처 |
| A-03 | features 슬라이스 간 cross-import 금지, 조합은 widgets에서 | features.md:14 | 이유 미기재 | 아키텍처 |
| A-04 | shared 내부에서 entities/features/widgets import 금지 | shared.md:3 | 이유 미기재 | 아키텍처 |
| A-05 | widget 간 import는 닫힌 화이트리스트만 허용(layout, page-header, kpi-card, revealable-value, glass-card, theme-toggle, timeline, pull-to-refresh, account-card, strategy-card, cycle-history, strategy-list). 목록은 "등"으로 확장하지 않는다 | widgets.md:14, widgets.md:24 | 리스트형 위젯이 여러 상위 위젯에서 재사용되는 근거 기재(widgets.md:16) | 아키텍처 |
| A-06 | 화이트리스트 밖 페이지 위젯은 app 라우트가 조립하고, 부모 위젯은 `ReactNode` slot prop만 받는다. 자식이 부모 상태를 필요로 하면 `ReactNode`를 반환하는 콜백 prop 변형 허용 | widgets.md:18, widgets/benchmark-comparison/CLAUDE.md | "widget 간 import 대신" (근거 암묵) | 아키텍처 |
| A-07 | app 레이어 cross-import 금지. 단 인터셉팅 라우트 쌍의 폼 본체 공유(`@app/*`)는 이 패턴 전용 예외이며 새 쌍을 추가할 때만 사용 | app.md:42 | PageHeader가 widgets 계층이라 features로 내릴 수 없음 | 아키텍처 (예외) |
| A-08 | `@/lib/*`·`@/components/*` alias는 shadcn 호환용으로만. 새 코드는 FSD alias 우선 | architecture.md:24 | 이유 미기재 | 아키텍처 |
| A-09 | `components/ui/`는 shadcn 자동생성. `npx shadcn@latest add`로만 추가. `button-variants.ts`·`dialog.tsx`는 재생성 시 수동 병합 유지 | shared.md:102 | 커스텀 variant·한글 문구가 덮어쓰기로 사라지는 것 방지 | 아키텍처 |
| A-10 | `shared/ui/`는 도메인 무관 컴포넌트만. SectionError·stepper는 여러 widget 공유를 위해 shared로 이동 | shared.md:94, widgets.md:25 | cross-widget import 회피 | 아키텍처 |
| A-11 | Client Component는 kista-api를 직접 호출하지 않는다. 항상 Route Handler 경유 | architecture.md:33, README.md(요청 경로 절) | CORS + 쿠키 문제 | 아키텍처 |
| A-12 | Server Component는 `getAuthToken()` → `apiFetch`. Client Component는 token 없이 `entities/*/api` → `clientFetch` → Route Handler | architecture.md:28-32 | 토큰은 HttpOnly 쿠키라 클라이언트가 접근 불가 | 아키텍처 |
| A-13 | `clientFetch`는 401 응답 시 자동 로그아웃 | shared.md:8 | 이유 미기재(비인가 세션 정리 의도로 보임) | 아키텍처 |
| A-14 | 관리자 privacy API만 예외: Server Component에서 `apiFetch`로 직접 호출, Route Handler 없음 | entities.md:59 | 이유 미기재 | 아키텍처 (예외) |
| A-15 | `createProxyRoute`의 `requireAuth` 기본값 `true`. 공개 엔드포인트는 `requireAuth: false` 명시. 로그인 여부로 응답이 달라지는 엔드포인트에는 사용 금지 | app.md:28 | 만료 AT가 붙어 공개 패널이 401 → 로그아웃 루프가 되는 것 방지 | 아키텍처 |
| A-16 | proxy 인증 분기: PENDING→/pending, REJECTED→/rejected, ACTIVE→/dashboard. PROTECTED_PREFIXES(`/accounts`·`/strategies`·`/stats`·`/settings`·`/finance`)는 비인증 시 `/login` | architecture.md:7-9 | 이유 미기재 | 아키텍처 |
| A-17 | `/`는 인증 여부와 무관하게 항상 `/dashboard`로 리다이렉트. proxy(`proxy.ts:204-205`)와 `app/(auth)/page.tsx:3-5`가 같은 정책 | architecture.md:9, app/(auth)/page.tsx:3 | 코드 주석: "감사 A-01·S-01 이후 정책 변경". 이 정책 변경으로 2026-07-12 감사의 P1(A-01/S-01) 판정은 무효화된 상태 | 아키텍처 (확정 + 감사 대체) |
| A-18 | `/dashboard`만 비회원 접근 가능한 `(main)` 경로. 비회원에게 인증 전용 쿼리는 `isAuthenticated` prop으로 `enabled` 게이팅 | architecture.md:14, widgets/dashboard/CLAUDE.md | 게이팅 없으면 401 → clientFetch 로그아웃·리로드 루프 (architecture.md:14 기재) | 아키텍처 |
| A-19 | admin 가드: `ROLE_COOKIE`·`ADMIN_PREFIXES=['/admin']`, role은 `/api/auth/me`에서 캐시 | app.md:7 | 이유 미기재 | 아키텍처 |
| A-20 | 상태·role 캐시 쿠키 maxAge 3600초, 초과 시 `/me` 재호출. 만료 JWT가 캐시로 통과하는 것은 "캐시 취약점"으로 명시 | app.md:8 | 재검증 주기 기준 (취약점 인지 상태로 유지) | 아키텍처 |
| A-21 | proxy 캐시 쿠키 재검증 간격은 정책 결정 사항이라 이번 작업에서 보류 | specs/archive/2026-07-10-post-cleanup-followups-design.md:12 | 정책 결정 필요 | 아키텍처 (보류) |
| A-22 | PENDING 상태는 캐시 쿠키에 저장하지 않는다 (`status !== 'PENDING'`일 때만) | app.md:11 | 승인 후에도 PENDING 화면이 남는 버그 | 아키텍처 |
| A-23 | PENDING 사용자의 `/api/settings/telegram` 호출 허용 (kista-api가 UserStatus 미검증) | app.md:60 | 서버 쪽 설계 그대로 기록 | 아키텍처 |
| A-24 | 인터셉팅 라우트 모달: PC는 모달, 모바일은 풀페이지. `dismiss` prop(`push`/`back`)으로 종료 분기 | app.md:40, strategy.md:23 | PC 전체 페이지 전환이 불편 | 아키텍처 |
| A-25 | 모달 안 하위 뷰 이력은 `shared/lib/subviewHistory`로 쌓고 `RouteModal`은 `go(-2)`로 되돌림 | app.md:41, strategy.md:25 | 뒤로가기 동작 일치 | 아키텍처 |
| A-26 | 목록 자체가 라우트 모달인 예산 관리는 목록 필터·페이지를 searchParams + `history.replaceState`로 관리 | app.md:43, features/finance/manage-budgets/CLAUDE.md | `router.replace`가 서버 재인터셉트를 일으킴 | 아키텍처 |
| A-27 | 인증 레이아웃 `(main)/layout.tsx`·`(admin)/layout.tsx`에 `export const dynamic = 'force-dynamic'` 명시 | app.md:39 | 쿠키 직접 읽기 제거 시 빌드 타임 정적 프리렌더가 인증 없는 fetch를 실행해 빌드가 깨짐 (회귀 사례) | 운영·배포 |
| A-28 | Route Handler origin은 `host` + `x-forwarded-proto`로 직접 구성. `request.url` 사용 금지 | app.md:26 | Docker standalone에서 origin 오류 | 운영·배포 |
| A-29 | 리다이렉트 origin은 `request.url`/`nextUrl.origin` 금지, `nextUrl.clone()` + pathname | app.md:12 | 컨테이너 hostname 반환 | 운영·배포 |
| A-30 | `ResponseCookies.set()` 호출을 모두 끝낸 뒤 마지막에 raw `headers.append('Set-Cookie')` | app.md:17 | `cookies.set()`이 이전 append 값을 덮어씀 | 아키텍처 |
| A-31 | Secure 쿠키 플래그는 `NODE_ENV`가 아닌 `x-forwarded-proto === 'https'` 기준 | app.md:18 | Safari가 HTTP에서 Secure 쿠키 무시 | 운영·배포 |
| A-32 | HTTP-only 쿠키 삭제는 Route Handler에서 `cookies.set(name, '', { maxAge: 0 })` | app.md:19 | 클라이언트 JS 접근 불가 | 아키텍처 |
| A-33 | 카카오 redirect_uri는 kista-ui 현재 도메인에서 동적 생성. 카카오 콘솔은 kista-ui 도메인 기준 | app.md:16 | 이유 기재 | 운영·배포 |
| A-34 | SSE: 브라우저 `EventSource`는 Route Handler가 Bearer를 붙여 중계 | app.md:29 | 커스텀 헤더 미지원 | 아키텍처 |
| A-35 | SSE 인증 실패는 401 금지. 200 스트림으로 `event: auth-error` 전송 | app.md:30 | EventSource가 4xx 상태를 알 수 없어 무한 재연결 | 아키텍처 |
| A-36 | SSE Route Handler는 `request.signal` 필수 전달 | app.md:31 | 연결 종료 후에도 파이핑 지속 (UND_ERR_SOCKET) | 아키텍처 |
| A-37 | SSE `undici` Agent `bodyTimeout: 0`, `headersTimeout: 0` | app.md:32 | 기본 300s로 5분마다 500 | 운영·배포 |
| A-38 | `Toaster`는 루트 `app/layout.tsx`에 하나만 | app.md:52 | 중복 시 toast 두 개 표시 | UI |
| A-39 | firebase-messaging-sw.js는 정적 파일이 아니라 `app/firebase-messaging-sw.js/route.ts`가 런타임 생성 | app.md:58 | 빌드타임 env 주입 | 운영·배포 |
| A-40 | FCM 자동 등록은 `FcmBridge`(Client)가 `useMeQuery()`의 `notificationChannel`로 판정 | app.md:59 | 이유 미기재 | 아키텍처 |
| A-41 | iOS 푸시: `'PushManager' in window` 사전 체크 필수 | app.md:56 | iOS 16.4+ 홈화면 PWA만 지원 | 운영·배포 |
| A-42 | 알림 권한 팝업은 자동 요청하지 않는다 | specs/archive/2026-07-10-post-cleanup-followups-design.md:64 | 알림을 끈 사용자에게 권한 팝업은 UX상 부적절 | UI |
| A-43 | 에러 복구 버튼은 `reset` 대신 `unstable_retry` 사용, 미지원 시 `reset` 폴백 | app.md:36 | `reset()`은 RSC를 재요청하지 않아 네트워크 실패가 복구되지 않음 | 아키텍처 |
| A-44 | `loading.tsx`는 새 라우트 추가 시 함께 둔다 | app.md:38 | 이유 미기재(skeleton 일관성) | UI |
| A-45 | `firebase` 등 NEXT_PUBLIC 설정 누락 시 FCM 조용히 실패 — 위험 명시 | app.md:58 | 빈 config 서비스워커 | 운영·배포 |

## 2. 데이터 패칭·상태 (React Query)

| # | 결정 내용 | 출처 | 이유 | 분류 |
|---|---|---|---|---|
| D-01 | 서버 상태를 `useState`에 복사하지 않는다. React Query가 서버 상태 SSOT, 예외 없음 | react-query.md:3 | 등록·수정 후 자동 반영 안 되는 버그 반복 | 데이터 |
| D-02 | 목록성 서버 상태: `createQueryClient()` + `prefetchQuery()` + `<HydrationBoundary>`로 주입, 이후 빈 상태·목록 전환은 Client Component가 React Query 캐시를 SSOT로 소비 | architecture.md:31 | 이유 미기재 | 데이터 |
| D-03 | 가변 SSR 데이터는 요청별 QueryClient에서 prefetch/dehydrate. Server prop을 canonical `initialData`로 쓰지 않음 | entities.md:30 | 이유 미기재 | 데이터 |
| D-04 | 가변 인증 데이터(accounts·strategies·me)는 Next persistent cache 없이 요청별 prefetch | app.md:47 | 이유 미기재 | 데이터 |
| D-05 | 서버용 query options는 `entities/*/model/queryOptions.ts`(server-safe), hook 파일에 두지 않음 | app.md:47, entities.md:35 | 이유 미기재 | 데이터 |
| D-06 | queryKey factory는 `model/queryKeys.ts`가 SSOT. 배열 인자는 내부에서 복사·정렬 | entities.md:40 | 순서만 다른 동일 배열이 별도 캐시로 분리되는 것 방지 | 데이터 |
| D-07 | 기본 QueryClient: staleTime 30s, gcTime 10m, retry 0, refetchOnWindowFocus false. 기본값은 `shared/lib/query`에서만 변경, 다른 곳 `new QueryClient` 금지 | shared.md:20 | 이유 미기재 | 데이터 |
| D-08 | staleTime 기준표: 공통·accounts·strategies 30s / me·order·stats 60s / 이력·daily 5분 / prices 0 / runtime-config·admin-settings 0 / market holidays 24h / candles 10분 / crypto indicators 10분 / fear-greed 10분 / housing regions 1시간 | shared.md:26-38 | 표 열 "근거" 기재 | 데이터 |
| D-09 | runtime-config는 `cache: 'no-store'`, staleTime 0, window focus refetch | entities.md:55 | 운영 설정 즉시 반영 | 데이터 |
| D-10 | admin-settings 저장은 optimistic update 없이, 성공 후 admin-settings와 runtime-config 모두 무효화 | entities.md:56 | 이유 미기재 | 데이터 |
| D-11 | 삭제 후 캐시: list는 `setQueryData`로 제거, 삭제 identifier의 detail/live key만 `removeQueries` | entities.md:31 | 이유 미기재 | 데이터 |
| D-12 | broad root 삭제(`removeQueries({ queryKey: accountKeys.all })`) 금지 | entities.md:31 | 이유 미기재 | 데이터 |
| D-13 | list cache가 없을 때 mutation 응답 한 건으로 `undefined -> [saved]`·`undefined -> []` 생성 금지. `fetchQuery`로 전체 목록 materialize | entities.md:32 | 부분 캐시가 authoritative로 굳는 것 방지 | 데이터 |
| D-14 | 카테고리·거래·예산 뮤테이션은 `upsertById` 대신 `invalidateQueries` 후 재조회 | features/finance... / finance.md:14, finance.md:15 | 카테고리는 POST/PUT 응답 children이 항상 `[]`라 트리가 깨짐. 거래·예산은 캐시 키에 기간이 섞여 판정 복잡 | 데이터 |
| D-15 | mutation 훅 `onError`에 toast.error. 호출부에서 `onError` 덮어쓰기 금지(토스트 중복). 호출부는 `onSuccess`만 | entities.md:36, copy.md:15 | `ChangeRoleButton`·`WithdrawUserButton`에서 실제 중복 토스트 발견 | 데이터 |
| D-16 | 서버 조회 실패를 빈 배열·빈 객체로 변환 금지 (404가 실제 빈 컬렉션인 경우만 예외) | entities.md:41 | 실패가 "데이터 없음"으로 영구 캐시됨 | 데이터 |
| D-17 | 오류 화면은 `isError && !data`일 때만. 기본값 `data = []` 금지 | react-query.md:4 | "아직 못 받음"과 "빈 목록" 구분 | 데이터 |
| D-18 | 무한 쿼리 "더 보기" 실패는 `isFetchNextPageError`로 목록 아래 안내 | react-query.md:4 | 목록 오류와 분리 | 데이터 |
| D-19 | 금액 계산처럼 이전 값이 위험한 곳은 재조회 실패 시 "확인 불가"로 둔다 | react-query.md:4 | 이유 기재 | 데이터 |
| D-20 | 독립 `Promise.all` 호출 각 항목에 `.catch(() => null)` | react-query.md:5 | fail-fast 방지 | 데이터 |
| D-21 | 낙관적 업데이트는 컴포넌트가 아니라 mutation 훅의 `onMutate`/`onError`에 캡슐화. 롤백은 실패 필드만 현재 캐시에 되돌림 (전체 스냅샷 복원 금지) | react-query.md:3 | 동시 mutation 값 덮어쓰기 레이스 | 데이터 |
| D-22 | userId 매개변수화 조회를 공용 키 + `select` 필터로 쓸 때 선택 변경 시 명시적 `refetch()` | react-query.md:3 | `enabled`만으로는 에러 상태가 재시도되지 않음 | 데이터 |
| D-23 | 참조 데이터 `monthlyHolidaysQueryOptions` 24h, 서버 prefetch 실패는 dehydrate 제외 | entities.md:37, shared.md:33 | 실패 빈 달이 24시간 hydrate되는 것 방지 | 데이터 |
| D-24 | `queryKeys`·`queryOptions`는 서버·클라이언트 공유 | entities.md:34 | 캐시 키 일치 | 데이터 |
| D-25 | `router.refresh()`는 mutation 성공 처리에 사용 금지 | shared.md:42 | Router Cache 목적지 가변 상태 미보장 | 데이터 |
| D-26 | `router.refresh()` 허용 예외 2건만: PullToRefresh(수동 재동기화), 에러 바운더리 `unstable_retry` | shared.md:44-45 | 사용자 요청 복구 동작 | 데이터 |
| D-27 | 체결 SSE는 `router.refresh()` 없이 React Query 무효화만. 과거 refresh + invalidate가 이중 조회를 일으켜 제거 | shared.md:47-49 | 이중 조회 | 데이터 |
| D-28 | 체결 민감 값을 Server Component에서 계산해 prop으로 넘기지 않는다. queryOptions prefetch + hydrate, 키를 무효화 대상에 포함 | shared.md:54 | refresh가 없어 체결 후 갱신 안 됨 | 데이터 |
| D-29 | 체결 무효화 대상·제외 키와 `lists → details` 순서 고정(순서 필수) | shared.md:55-56 | detail이 fresh한 목록 캐시를 재사용해 갱신 전 값을 받음 | 데이터 |
| D-30 | housing-comparison은 무효화 대상, housing·etf 시장 시계열은 `statsKeys.all` 금지 | shared.md:57 | 체결과 무관 | 데이터 |
| D-31 | `strategyKeys.seedPreview`는 `strategyKeys.all` 무효화 금지 (사용자가 조정한 시드 초기화 방지) | shared.md:58 | 이유 기재 | 데이터 |
| D-32 | 체결 무효화는 targeted(accountId·strategyId)로 좁히지 않음 | shared.md:61-64 | 활성 쿼리 대부분 해당, predicate·폴백 버그 위험. 비활성 쿼리 부하 측정 시 전환 | 데이터 |
| D-33 | 체결 브리지는 `widgets/layout/TradeNotificationBridge`에 두고 `entities/trade`에서 타 entity import 금지 | shared.md:60 | 같은 계층 cross-import | 아키텍처 |
| D-34 | 서버 TTL 캐시(stats summary·equity-curve·housing-benchmark)는 체결 시 사용자 단위로 비워짐. 그 외 mutation으로는 안 비워져 invalidate 후에도 이전 값 가능 — React Query 문제로 오진 금지 | entities.md:61, shared.md:59 | 이유 기재 | 데이터 |
| D-35 | SectionError "다시 시도"는 마운트된 error 쿼리만 refetch. React Query 밖 실패에 쓰면 무동작 | shared.md:94 | 이유 기재 | 데이터 |
| D-36 | `useStrategyForm` 시드 미리보기는 DCA에서 끔 (DCA 폼이 따로 조회) | strategy.md:25 | 이유 기재 | 데이터 |
| D-37 | 목록 필터는 `history.replaceState`(`use-search-param`). `router.replace`는 동적 페이지 프리페치를 재실행 | widgets/all-strategies/CLAUDE.md | 이유 기재 | 데이터 |
| D-38 | 리스트 캐시 이관 패턴은 목록성 서버 상태에만. 체결 민감 값은 SSR 직접 계산 금지 (D-28과 동일 근거) | shared.md:54 | 이유 기재 | 데이터 |
| D-39 | 금액·자산 집계는 `entities/finance/lib/aggregate.ts`의 순수 함수 공유, 위젯 계층 중복 구현 금지 | finance-widgets.md:8 | 이유 미기재 | 데이터 |
| D-40 | `calcCategoryComposition`(대출 포함)·`calcAssetClassComposition`(대출 제외) 래퍼로만 사용. 범용 `calcComposition` 위젯 직접 호출 금지 | finance.md:12 | 이유 미기재 | 데이터 |
| D-41 | 부채 판정은 `isLiability(snapshot)`(`rootCategoryId === SYSTEM_LOAN_CATEGORY_ID`) 단일 함수. 문자열 비교 반복 금지 | finance.md:12 | 이유 미기재 | 데이터 |
| D-42 | 수입/소비/저축 조회 창: 월간은 `windowRange`(12개월 슬라이딩), 연간은 `periodRange`(YTD 또는 과거 연도 전체). 추이는 `trendWindow` 별도 | finance.md:15, finance-widgets.md:7 | 요약·예산·내역이 한 쿼리 공유 | 데이터 |
| D-43 | 전년 대비 기간은 올해면 "오늘과 같은 일자"까지, 과거 연도면 전체 — 대칭 유지 | finance.md:15 | 비대칭이면 델타 왜곡 | 도메인 |
| D-44 | 예산 YTD 배수는 "경과 개월"이 아니라 "예산이 실제로 유효했던 개월 수" | finance.md:15 | 이유 기재 | 도메인 |
| D-45 | 삭제 카테고리를 가리키는 거래는 어느 탭 집계에도 넣지 않고 "분류할 수 없는 내역"으로 별도 노출 | finance.md:15 | 카테고리 삭제가 소프트 삭제라 인덱스에 없음 | 도메인 |

## 3. 타입·API 계약

| # | 결정 내용 | 출처 | 이유 | 분류 |
|---|---|---|---|---|
| T-01 | `api-types.ts`는 생성물(gen:types). knip 검사에서 제외 | knip.json:4-5, commands.md:3 | 이유 미기재 | 타입 |
| T-02 | enum 타입을 직접 정의하지 않고 `shared/lib/api-schema.ts`에서 가져온다 | shared.md:71 | 이유 미기재 | 타입 |
| T-03 | `normalize.ts`는 경량 헬퍼(`optStr`/`optNum`/`optDec`). zod 대체가 아니다. null 분기 없는 캐스팅은 `String()`/`Number()`/`toNum()` 직접 | shared.md:70 | "경량"으로 제한 | 타입 |
| T-04 | KIS live 응답 필드명이 UI 타입과 다르면 `entities/*/api`의 normalizer에서 변환. 새 엔드포인트는 실제 응답과 대조 | entities.md:65 | 이유 미기재 | 타입 |
| T-05 | `TradingCycleResponse` 필드 추가 시 `entities/strategy/model/types.ts`와 `normalizeStrategy()`를 함께 수정 | strategy.md:7 | 이유 미기재 | 타입 |
| T-06 | `getPrices` 쿼리 직렬화는 반복 파라미터만 허용 | entities.md:67 | 이유 미기재 | 타입 |
| T-07 | `MultiPriceResponse`는 `PriceMap`으로 정규화 | entities.md:68 | 이유 미기재 | 타입 |
| T-08 | 통화: `positions[].evalAmountUsd`는 USD, `summary.totalAsset`·`totalEvalProfit`은 KRW | entities.md:69 | 이유 미기재 | 타입 |
| T-09 | stats 엔드포인트 타입(`cycles` 포함)은 `api-types` 생성물이 아니라 `model/types.ts` 수기 정의 | entities.md:61 | 이유 미기재 | 타입 |
| T-10 | stats 미종료 사이클의 `winRate`·`pnl`·`returnRate`·`endDate` 등은 null 가능, 렌더 시 null 가드 필수 | entities.md:61 | 이유 기재(미종료) | 타입 |
| T-11 | `getStrategyCycleHistory({})`는 서버 기본 `30d` | entities.md:73 | 이유 미기재 | 타입 |
| T-12 | `GET/PUT /api/admin/settings`는 관리자 프록시 사용 | entities.md:56 | 이유 미기재 | 타입 |
| T-13 | Route Handler 5xx는 `{ error: 'Failed' }`로 숨김. 단 kista-api 증권사 장애 503(title `KIS API Error`·`Toss API Error`)만 relay. kista-api가 title을 바꾸면 UI도 함께 변경 | shared.md:83 | 503 detail에 내부 호스트가 담길 수 있음 | 운영·배포 |
| T-14 | 4xx는 JSON body 그대로 relay (422 자격증명·429 한도) | shared.md:83 | 이유 기재 | 타입 |
| T-15 | 신규 프록시 라우트 추가 시 kista-api 엔드포인트 공개 여부 확인 후 `requireAuth` 맞춤 | app.md:28 | 공개인데 401 또는 인증 필요 엔드포인트 노출 | 타입 |
| T-16 | Route Handler URL 변경 시 보통 `entities/{domain}/api/` 호출부만 수정 | constraints.md:30 | 이유 미기재 | 아키텍처 |
| T-17 | kista-api 연계 작업(응답 형식·인증 흐름) 시 `../kista-api/CLAUDE.md`를 즉시 Read (자동 로드 안 됨) | constraints.md:5 | 세션 시작 디렉토리 밖 CLAUDE.md는 자동 로드되지 않음 | 작업 방식 |
| T-18 | `/api/meta` 계약 변경 배포는 kista-api 먼저, kista-ui 나중 (UI 서버가 메타를 1시간 Data Cache) | deployment.md:16 | 구 메타 최대 1시간 잔존 (2026-10-24 바이낸스 사례) | 운영·배포 |
| T-19 | DCA 금액은 `sizing`(방식+값) + `amount`(계좌 통화). 구 필드 `amountUsd`는 요청·응답 모두 제거 | strategy.md:16 | 이유 미기재 | 타입 |
| T-20 | `StrategyRequest`에서 `initialHoldings`·`initialAvgPrice`는 곱하지 않는다. 서버가 등록 시점 전일종가×수량으로 V값 계산 | strategy.md:29 | 이유 기재 | 타입 |
| T-21 | 서버가 `quantity<=0`이면 `avgPrice`를 조용히 버리므로 UI가 양방향 선제 안내 | strategy.md:29 | 이유 기재 | 타입 |
| T-22 | 메타 라벨은 `labelOf`가 SSOT. 요일명만 로컬 상수(`WEEKDAY_LABEL`, java DayOfWeek) | strategy.md:14 | 이유 기재(요일 예외) | 타입 |
| T-23 | `MetaProvider.labelOf`는 누락 메타 키를 가드 (1h 메타 캐시가 새 키보다 오래됐을 수 있음) | strategy.md:14 | 이유 기재 | 타입 |
| T-24 | `TickerMeta.targetProfitRate`는 `string` 타입 | entities.md:54 | 이유 미기재 | 타입 |
| T-25 | `assetClass`(6값)·`market`(2값)은 서버 닫힌 enum이라 `labelOf`로 라벨 획득 | finance.md:12 | 이유 기재 | 타입 |
| T-26 | `UserResponse.rejectReason`은 status가 REJECTED일 때만 노출, 그 외 null 마스킹 | specs/2026-07-12-reject-reason-design.md:35 | 잔존 사유 노출 방지 | 타입 |
| T-27 | 반려 사유 갱신: reject 시 덮어쓰기, approve·reapply 시 초기화하지 않음 | specs/2026-07-12-reject-reason-design.md:23 | PENDING·ACTIVE 화면은 사유를 노출하지 않으므로 잔존 값 노출 없음 | 타입 |
| T-28 | 전략 상세는 `strategyKeys.detail` 캐시를 읽어 `currentHoldings`·`vr.value` 표시 (SSR prop 금지) | shared.md:53 | 체결 후 갱신 | 데이터 |
| T-29 | `GET /api/stats/summary|equity-curve|cycles`의 `summary`는 전략 유형 비교 목적상 항상 전체 집계, `equity-curve`·`cycles`는 type 필터 공유 | entities.md:60 | 이유 기재 | 타입 |
| T-30 | `availableCurrencies`는 `useStatsCurrency`가 USD summary에서 읽음 | entities.md:60 | 요청 통화와 무관하게 목록 필요 | 타입 |
| T-31 | 카테고리 PUT은 `parentId`·`type`을 서버가 무시. 이동 불가 | finance.md:14 | 서버 제약 | 도메인 |
| T-32 | 시스템 카테고리(`system:true`)는 그룹 스코프 엔드포인트에서 수정·삭제 시 서버가 403 | finance.md:14 | 이유 기재 | 도메인 |
| T-33 | 카테고리 삭제는 하위 트리 cascade 소프트 삭제, 과거 스냅샷 참조 검사 없음 | finance.md:14 | 이유 기재(소프트 삭제 유지) | 도메인 |
| T-34 | 그룹 스코프는 서버가 `findCurrentGroupId(userId)`로 판정. 클라이언트는 그룹을 지정할 수 없다. 목록 API에 `groupId` 파라미터 없음 | finance.md:13 | 1인 1그룹 정책 (2026-08) | 도메인 |
| T-35 | 클라이언트가 그룹 id를 알아야 하는 곳은 월 마감 판정뿐. `useMonthlyClosingScopeGroupId()` 사용, 쿠키 `activeGroupId` 사용 금지 | finance.md:19 | 클라이언트 활성 그룹이 서버 판정과 어긋난 버그 | 도메인 |
| T-36 | 그룹 생성·삭제·이름 수정 API 없음. 공유 그룹은 초대 발급→수락으로만 생성 | finance.md:18 | 서버 제약 | 도메인 |
| T-37 | 초대 코드는 발급 응답에서 한 번만 내려오고 재조회 불가 | finance.md:18, manage-group CLAUDE | 서버 제약 | 도메인 |
| T-38 | 멤버 닉네임 없음 → `nickname ?? userId.slice(0,8)` 폴백이 최종 형태 | finance.md:18 | 서버 응답 | 도메인 |
| T-39 | 계좌 응답 `accountNo`는 서버가 복호화한 평문. 마스킹은 UI 책임 | finance.md:17 | 이유 미기재 | 도메인 |
| T-40 | 계좌번호는 서버가 숫자만 허용. 수정 모드 초기값도 `digitsOnly` 정규화 | manage-accounts CLAUDE | 기존 DB 데이터는 마이그레이션 안 함 | 도메인 |
| T-41 | 자산 스냅샷 단건 GET·벌크 삭제 엔드포인트 없음 → 목록 find, `Promise.allSettled` 개별 DELETE | finance.md:12 | 서버 제약 | 도메인 |
| T-42 | 월 마감: `PATCH /monthly-closings/{month}`. 마감 월 재무 쓰기는 서버 409 | finance.md:19 | 이유 기재 | 도메인 |
| T-43 | 예산 기간 중첩(EXCLUDE) 위반은 create 실패 반환. 개인 스코프 겹침은 서버가 자동 트림·삭제 | finance-group-share.md:3 | 이유 기재 | 도메인 |
| T-44 | 그룹 공유 생성은 `POST ...?shareToGroup=true` 단일 호출 (부분 실패 상태 없음). 대상 그룹은 서버가 userId로 해석 | finance-group-share.md:3 | 원자성 | 도메인 |
| T-45 | 카테고리는 계층이라 부모가 개인 소유면 서버 400 — 클라이언트는 토글 숨김 + 안내 | finance-group-share.md:3 | 서버 제약 | 도메인 |
| T-46 | 공유·귀속(unshare)은 같은 그룹 멤버 누구나 가능, `userId`는 기존 소유자 유지, 이미 개인이면 멱등 200 | finance-group-share.md:3 | 이유 기재 | 도메인 |
| T-47 | 카테고리 공유는 서버 recursive CTE가 하위 전체 cascade 전환 | finance-group-share.md:3 | 이유 미기재 | 도메인 |
| T-48 | 예산은 INCOME·EXPENSE·SAVING 카테고리 모두 대상 (ASSET은 서버 400) | manage-budgets CLAUDE | 이유 미기재 | 도메인 |
| T-49 | 전략 DCA 원장 값 `ledgerDeposit`·`currentHoldings`·`avgPrice`는 계좌 전체가 아닌 DCA 원장 값 | widgets.md(strategy-card DCA 분기: strategy.md:42) | 이유 기재 | 도메인 |
| T-50 | DCA 실행 이력 `DcaExecution`은 `ruleKey`·`direction` 보유, 필터 서버 측 (`from`·`to`·`direction`·`ruleKey`) | strategy.md:14 | 이유 미기재 | 도메인 |

## 4. UI 일관성·카피·접근성

| # | 결정 내용 | 출처 | 이유 | 분류 |
|---|---|---|---|---|
| U-01 | 인라인 `style={{ ... }}` 원칙적으로 금지. 예외: CSS 토큰 값·픽셀 계산 | constraints.md:22-23 | 이유 미기재 | UI |
| U-02 | 동적 클래스는 `cn()`, 복잡 변형은 `cva` | constraints.md:24 | 이유 미기재 | UI |
| U-03 | 동적 계산 인라인 style 유지: `glass-card`(픽셀), `pull-to-refresh`(rotate 각도) | widgets.md:63 | 픽셀 계산 예외 | UI |
| U-04 | shadcn v4: `asChild` 대신 `cn(buttonVariants(...))`. raw `<button>`에 색·높이 직접 지정 금지 | widgets.md:29 | 이유 미기재 | UI |
| U-05 | Base UI Select에서 `items` 사용 시 각 항목 `value`와 `label` 함께 제공 | widgets.md:30 | 이유 미기재 | UI |
| U-06 | AlertDialog는 `open`/`onOpenChange` 직접 제어 | widgets.md:31 | 이유 미기재 | UI |
| U-07 | disabled 버튼 툴팁은 wrapper `div` + `group-hover` | widgets.md:32 | 이유 미기재 | UI |
| U-08 | 시맨틱 토큰 용도: `--info`(대기·정보), `--admin-fg`/`--admin-bg`(관리자 액센트), `--status-error`(실패) | widgets.md:37 | 이유 미기재 | UI |
| U-09 | `--gold`는 다크 오버라이드 존재. 라이트 전용 골드를 다크에서 그대로 쓰지 않음 | widgets.md:38 | 이유 기재 | UI |
| U-10 | 선택 상태 전용 시맨틱 토큰을 라이트·다크 각각 정의. 다크에 고정 로즈 팔레트 직접 사용 금지 | specs/archive/2026-07-17-strategy-form-selection-visibility-design.md:93 | 이유 기재 | UI |
| U-11 | 테이블 헤더는 기본 가운데 정렬, `text-right`/`text-left` 덮어쓰기 금지. 숫자 셀 `text-right tabular-nums`, 헤더 `numeric` prop | widgets.md:40 | 자릿수 정렬 | UI |
| U-12 | 테이블 셀은 `TableHeadCell`·`TableDataCell` 짝으로 사용 | shared.md:91 | 헤더·데이터 정렬 드리프트 방지 | UI |
| U-13 | 정렬 세트 `SortableHeadCell` + `MobileSortControl` + `useTableSort`. 정렬은 페이지네이션 이전 전량 배열, null 행은 맨 아래 | shared.md:92 | 이유 기재 | UI |
| U-14 | 서버 페이지네이션 표와 날짜 그룹 표에는 정렬 미적용 | shared.md:92 | 현재 페이지만 정렬돼 오해 유발 | UI |
| U-15 | `.reveal-stagger`는 최초 진입 등 고임팩트 순간에만. 남용 금지 | widgets.md:42 | 이유 기재 | UI |
| U-16 | 인터랙션 추가 시 Client Component 분리, 페이지 전체 `'use client'` 금지 | widgets.md:50 | 이유 미기재 | UI |
| U-17 | JSX 내 IIFE 금지 | widgets.md:53 | 이유 미기재 | UI |
| U-18 | "방금 동작 결과"는 toast, "현재 상태 경고"는 고정 텍스트 | widgets.md:51-52 | 이유 미기재 | UI |
| U-19 | 아이콘 전용 버튼 44px 히트영역: `IconButton`(`<button>`, aria-label 필수). `<Link>`는 `ICON_LINK_GHOST_CLASS` | widgets.md:54, shared.md:89 | 터치 타깃 | UI |
| U-20 | `SegmentedToggle`(값 선택), `SegmentedTabs`(내용 전환), `SectionTabBar`(라우트 이동) 의미로 구분. 세그먼트 시각 상수 공유 | shared.md:96-99 | 이유 기재 | UI |
| U-21 | 기간 필터 "적용" 등 브랜드 보조 액션은 `brand-soft` | shared.md:109 | 이유 기재 | UI |
| U-22 | CTA 위계: `brand`(화면당 유일한 최상위 등록·실행), `brand-soft`(CRUD 리스트 "추가"류 2단계), 폼 제출 `default`, 파괴적 `destructive`. 위계를 낮추는 예외는 파일 주석 필수 | shared.md:108-112 | 2026-08 "모두 등록" gradient 되돌림 사례 | UI |
| U-23 | 파괴적 텍스트 트리거는 `destructive` 통일 (outline+빨강·ghost+빨강·텍스트 링크 혼용 금지) | shared.md:111 | 이유 기재 | UI |
| U-24 | 선택형 카드(`SelectionCard`)는 테두리로만 선택 표시. 체크 배지(`showIndicator`)는 2026-08 전량 제거 | shared.md:93, shared.md:106 | 시각적으로 과하다는 피드백 | UI |
| U-25 | 선택형 카드 규칙: 작은 세그먼트에 체크 추가 안 함, 완전 채움 배경 사용 안 함 | specs/archive/2026-07-17-strategy-form-selection-visibility-design.md:44-45 | 콘텐츠 공간 보존 | UI |
| U-26 | 선택 상태 공통 규칙은 전략 폼·알림 수단·테마 선택·백테스트 폼 모두 동일 `SelectionCard` | shared.md:106 | 일관성 | UI |
| U-27 | `YearMonthSelect`는 네이티브 month input 대체 (데스크탑 사파리 미지원) | shared.md:95 | 이유 기재 | UI |
| U-28 | `PageHeader` eyebrow: 사이드바 화면은 라벨 그대로(링크 없음), 하위 화면은 `← 상위 화면` 링크. 관리자 사이드바 화면은 eyebrow 없음 | copy.md:13 | 이유 미기재 | 카피 |
| U-29 | 브라우저 탭 제목 `제목 | KISTA` (접미사 규칙은 `shared/lib/metadata.test.ts`가 강제) | copy.md:13, shared.md:79 | 이유 기재 | 카피 |
| U-30 | 상세 화면 탭 제목은 사용자 데이터(계좌 별칭·티커) 대신 "계좌 상세"·"전략 상세" (`generateMetadata` 재조회 금지) | copy.md:13 | 이유 기재 | 카피 |
| U-31 | 등록·복제 겸용 화면의 탭 제목은 기본 동작 ("예산 추가", "자산 기록 등록") | copy.md:13 | 이유 미기재 | 카피 |
| U-32 | 카드·리스트·토글 짧은 설명은 명사구로 끝내고 마침표 없음. 섹션 부제·다이얼로그·경고문은 "~습니다." + 마침표 | copy.md:5 | 역할별 고정 | 카피 |
| U-33 | 입력 안내·검증 오류·다음 행동은 "~하세요.", 시스템 실패 뒤 재시도 요청은 "~해주세요." | copy.md:5 | 역할 분리 | 카피 |
| U-34 | 해요체("~해요") 서술형 금지, 합니다체 통일 | copy.md:5 | 이유 미기재 | 카피 |
| U-35 | 에러·빈 상태 문구(SectionError·EmptyState message)는 완전한 문장, 마침표 붙임 | copy.md:5 | 같은 화면 빈 상태 문구와 일치 | 카피 |
| U-36 | 토스트 마침표: `entities/*/hooks` mutation `onError`는 항상 마침표. `features/widgets` 인라인 토스트는 한 문장이면 마침표 없음, 두 문장 이상이면 문장마다 마침표 | copy.md:6 | 레이어별 정당한 컨벤션 | 카피 |
| U-37 | 같은 사실 열거 방식(쉼표 vs 가운뎃점) 및 항목 수 일치 | copy.md:7 | 다이얼로그 캡션 불일치 사례 | 카피 |
| U-38 | 같은 개념·행위는 한 플로우 안에서 한 용어로 (등록/추가, 재요청/재신청 등) | copy.md:8 | 트리거·다이얼로그·토스트 불일치 사례 | 카피 |
| U-39 | 의도적으로 다른 용어(`USER_STATUS_LABEL` 반려 vs `ADMIN_USER_STATUS_LABEL` 거절)는 주석 없이 통일 금지 | copy.md:9 | 화면 맥락별 의도 | 카피 |
| U-40 | 새 카피 작성 전 앱 전역 grep으로 기존 표현 재사용 | copy.md:10 | 좁은 범위 비교가 정당한 컨벤션을 불일치로 오판 | 카피 |
| U-41 | nav·메뉴 라벨·eyebrow는 전부 한글 | copy.md:11 | 영문 라벨 혼입 발견 시 즉시 한글화 | 카피 |
| U-42 | UI 카피는 "코인" 대신 "크립토", 개별 자산 단위는 "종목" ("보유 자산"은 가계부 "자산"과 혼동돼 기각) | copy.md:12 | 이유 기재 | 카피 |
| U-43 | 값 없음 자리 표기는 하이픈 "-" 하나 (긴 줄표 "—" 금지) | copy.md:14 | 이유 미기재 | 카피 |
| U-44 | mutation 훅 onError 중복 토스트 금지 (D-15와 동일 근거) | copy.md:15 | 실제 버그 | 카피 |
| U-45 | 금액 감추기: `fmtKrw`·`fmtSignedKrw` 결과는 `maskIfHidden()` 필수. 누락 주의 | finance-widgets.md:9 | 이유 기재 | UI |
| U-46 | 금액 감추기 의도적 비마스킹: 차트 Y축 눈금(만원 축약), 예산 관리·일괄 등록 탭 밖 화면 | finance-widgets.md:9 | 의도적 | UI (의도적 예외) |
| U-47 | SSR·hydration 첫 렌더는 가린 상태 (설정 미읽음) | finance-widgets.md:9 | 깜빡임 방지 | UI |
| U-48 | 자산 등록 폼 계좌 select, assetClass·market 기본값 `CASH`·`DOMESTIC` 고정 | features/asset/save-asset/CLAUDE.md | 사용자가 직접 고르게 | UI |
| U-49 | 운용전략 필드는 L1 "투자"일 때만 노출, payload `strategy`는 항상 현재값 전송. 값 삭제는 사용자 능동 변경 때만 | features/asset/save-asset/CLAUDE.md | 레거시 데이터 유실 방지 | 도메인 |
| U-50 | 감사 S-07~S-12 정당한 예외(팔레트 정책 제외): `global-error.tsx` rgba 하드코딩, Canvas readback rgba, 공포탐욕 5단계 색, Telegram 브랜드 `#229ED9`, 테마 미리보기 hex 스와치, 그림자 임의값 | audit 2026-07-12 "정적 코드 감사" 종합 | 브랜드·차트·Canvas 제약 | UI (예외) |
| U-51 | 감사 A-18 기각: main의 `pb-24 lg:pb-9`로 바텀내비 충분히 클리어 | specs/archive/2026-07-12-ux-flow-design.md:10 | 스크롤 중간 프레임 관찰 | UI |
| U-52 | 감사 A-09 정상: 운영중 초록은 `--status-ok` 토큰 | audit A-nn 해소 표 | 이유 기재 | UI |
| U-53 | 감사 S-15·S-16 실질 위반 없음 (EmptyState·Skeleton 우회 아님) | audit 신규 발견 | 단계 가이드 문구·요소 단위 Skeleton | UI |
| U-54 | 사이드바 활성 색 토큰: 감사 S-04(P2)가 `--sidebar-active-*` 미사용을 지적. 현재 코드는 `bg-rose-50` 사용 — 확정 결정 아님, 미해결 감사 항목 | audit S-04 | — | UI (미해결) |
| U-55 | 상태 배지 팔레트 이탈(S-02·S-03, `seed-badge.ts`·`status-badge.ts`)은 감사 P2 판정. 문서상 "의도적" 주석은 `status-badge.ts`에만 있음 | audit S-03 | 파일 주석 "canonical" | UI (미해결/의도) |
| U-56 | 체크박스·라디오는 raw `<input>` 금지, `@/components/ui/checkbox`·`radio-group` 사용 | a11y.md:12 | 대비·히트영역 내장 | a11y |
| U-57 | 텍스트 없는 label로 감싸지 않음 (Base UI가 aria-labelledby로 연결해 aria-label 덮어씀) | a11y.md:12 | 이유 기재 | a11y |
| U-58 | 아이콘 전용 버튼·링크, `SelectTrigger`에 `aria-label` 필수 | a11y.md:5 | `role=combobox` 이름 계산 불가 | a11y |
| U-59 | 색 대비 4.5:1은 실제 배경(`bg-*-bg`, `bg-muted`) 기준. 포커스 링 3:1 | a11y.md:6 | 흰 배경만 보면 깨짐 | a11y |
| U-60 | 텍스트에 `opacity-*`·`/40`·`hover:opacity-*` 금지 (비활성 제외). 링크 hover는 `hover:underline` | a11y.md:6 | 대비 저하 | a11y |
| U-61 | 가로 스크롤 표 컨테이너 `role="region"` + `aria-label` + `tabIndex={0}` | a11y.md:7, eslint.config.mjs:20-21 | 키보드 스크롤 | a11y |
| U-62 | recharts 차트에 `title` 필수 (accessibilityLayer가 svg를 탭 순서에 넣음) | a11y.md:8 | 이름 없는 포커스 지점 | a11y |
| U-63 | 모달 트리거에 native `disabled` 금지. 공용 `Button`은 `focusableWhenDisabled`, AlertDialogTrigger는 `aria-disabled` + `preventBaseUIHandler` | a11y.md:9 | 모달 닫힌 후 포커스 복귀 실패 | a11y |
| U-64 | heading 레벨 건너뛰지 않음 (h1 바로 아래 h2). CardTitle은 div | a11y.md:10 | 이유 기재 | a11y |
| U-65 | 페이지 최상위 `<main>` 랜드마크 하나 (auth·pending·rejected는 layout이 감쌈) | a11y.md:11 | 이유 기재 | a11y |
| U-66 | a11y 점검은 `npm run a11y-check` (axe·포커스·다이얼로그) | commands.md:19 | 이유 기재 | a11y |
| U-67 | 공용 `Checkbox`에 `indeterminate` prop | a11y.md:12 | 이유 기재 | a11y |
| U-68 | 구 "체크 배지" 대신 테두리만 선택 표시 — 모든 크기 공통 | shared.md:106 | 이유 기재 | UI |
| U-69 | 다이얼로그 닫기 버튼 sr-only 문구는 "닫기" 한글 (`dialog.tsx` 수정 유지) | shared.md:102 | 재생성 시 재적용 필요 | UI |
| U-70 | `Next.js Image` 비정사각형 + preflight 충돌 해결: `style` prop에 height·width 명시 | app.md:37 | Tailwind preflight `img{height:auto}` | UI |

## 5. 테스트·검증

| # | 결정 내용 | 출처 | 이유 | 분류 |
|---|---|---|---|---|
| V-01 | 기본 검증은 `npm run typecheck` + `npm run lint` | commands.md:24 | 이유 기재 | 테스트 |
| V-02 | lint는 `--max-warnings 0`. warning도 실패. 의도된 미사용은 `_` 접두 | commands.md:24, eslint.config.mjs:43-48 | 이유 기재 | 테스트 |
| V-03 | react-doctor 규칙은 eslint stub(no-op Proxy)으로 등록. `reportUnusedDisableDirectives`는 전역 off | eslint.config.mjs:9 (noopRule), eslint.config.mjs:29 | `eslint --fix`가 react-doctor 주석을 지우는 것 방지, 규칙 단위로 끌 수 없어 전역 | 테스트 (의도적 예외) |
| V-04 | `components/ui/**`는 eslint 검사 제외 (shadcn 자동 생성) | eslint.config.mjs:51 | 직접 수정 금지 | 테스트 (예외) |
| V-05 | `npm run knip` 0건 상태 유지. 새 항목은 삭제가 기본, 남기면 knip.json 또는 `/** @public */` + 이유 | commands.md:25 | 이유 기재 | 테스트 |
| V-06 | knip 예외: `shared/lib/api-types.ts` 생성물, `sharp` 의존성, `components/ui/**`의 exports·types 무시, `scripts/visual-diff/sheet.mjs` | knip.json:1-22 | 생성물·수동 스크립트 | 테스트 (예외) |
| V-07 | `test:e2e`는 CI에서 돌지 않음. 화면 흐름·라우팅·문구 변경 시 커밋 전 로컬 1회 실행 필수 | commands.md:28 | CI가 못 잡아 낡은 단언이 쌓임 | 테스트 |
| V-08 | `test:e2e` 전제: 로컬 kista-api(:8080, local 프로파일)와 kista-trading(:8081) 기동 | commands.md:28 | 이유 기재 | 테스트 |
| V-09 | dev 서버 떠 있으면 e2e webServer 실패 → 임시 worktree + `cp -cR`로 node_modules 복제. symlink 금지 (Turbopack 패닉) | commands.md:26 | 이유 기재 | 테스트 |
| V-10 | `.next/dev/types` 스테일 참조로 typecheck 실패 시 `.next` 삭제 후 재실행 (코드 오류 아님) | commands.md:30 | 라우트 삭제 후 산출물 | 테스트 |
| V-11 | 구조 규칙 기계 강제 테스트: `shared/lib/query/cacheArchitecture.test.ts`(app·widgets·features·entities AST 검사, persistent cache 금지) | shared.md:16 | 이름만으로 규칙과 무관해 보이는 테스트 | 테스트 |
| V-12 | `shared/lib/metadata.test.ts`: 탭 제목 접미사 TITLE_TEMPLATE 강제 | shared.md:79 | 이유 기재 | 테스트 |
| V-13 | `TradeNotificationBridge.test.tsx`: 체결 무효화 대상·제외·순서 고정 | shared.md:55 | 이유 기재 | 테스트 |
| V-14 | `entities/strategy/model/queryOptions.test.ts`: 체결 무효화 1회 호출 | shared.md:55 | 이유 기재 | 테스트 |
| V-15 | 고친 테스트 회귀 검증은 "변이 확인"(수정을 되돌려 실패하는지) | CLAUDE.md:13 | 직접 확인 우선 | 테스트 |
| V-16 | 직접 확인 가능한 것은 "미검증"으로 남기지 않는다. "미검증" 허용은 쓰기·실계좌 주문·배포 필요분만, 이유와 함께 보고 | CLAUDE.md:13 | 이유 기재 | 테스트 (작업 방식) |
| V-17 | 사용처·동작 주장은 grep·file:line 근거와 함께. 주석·문서만 믿지 않음 | CLAUDE.md:14 | 주석이 낡을 수 있음 | 테스트 (작업 방식) |
| V-18 | 시각 검증 기준: 데이터 없어 빈 분기면 GET 전용 모킹 프록시로 합성 fixture (`npm run visual-diff`) | memory verify_local_api_constraint, commands.md:18 | 이유 기재 | 테스트 |
| V-19 | 리팩토링 전후 픽셀 비교 `npm run visual-diff -- <base-ref>` | commands.md:18 | 이유 기재 | 테스트 |
| V-20 | 빌드·테스트 전체 스위트는 최종 1회, 디버깅 중에는 좁힌 대상만 (글로벌 전역 지침과 동일) | 글로벌 CLAUDE.md (외부) | — | 테스트 (작업 방식) |
| V-21 | 코드 변경 커밋 전 리뷰 필수, 문서 전용 변경은 예외 | constraints.md:4 (effort), 글로벌 CLAUDE.md | 이유 기재 | 작업 방식 |
| V-22 | `/code-review` effort: 파일 10개·수백 줄 이하 `medium`. `high` 이상은 보안·세션 민감 또는 수십 개 파일 | constraints.md:4 | 콜드 스타트 토큰 비용 | 작업 방식 |

## 6. 도메인 (전략·DCA·크립토·브로커·가계부·메모리 확정 사항)

| # | 결정 내용 | 출처 | 이유 | 분류 |
|---|---|---|---|---|
| G-01 | 브로커 카드는 `BROKER_UI`에 없으면 렌더하지 않음 (`return null`). 신규 브로커는 항목 추가 필수 | strategy.md:20 | 이유 미기재 | 도메인 |
| G-02 | 계좌 생성 4-step(BrokerStep→ApiStep→AccountInfoStep→ConfirmStep). MOCK은 3-step (API 키·계좌번호 생략) | features.md:28, strategy.md:20-21 | 이유 미기재 | 도메인 |
| G-03 | UPBIT 연결 테스트 통과가 다음 단계 조건. MERITZ는 App Key에 묶인 계좌 하나 — 계좌마다 키 발급 안내 | strategy.md:21 | 이유 기재 | 도메인 |
| G-04 | 앱키에 계좌가 묶인 broker(UPBIT·MERITZ)는 `isKeyOnlyBroker`로 판정. MERITZ는 주식이라 `isCryptoBroker`로 판정 금지 | strategy.md:22 | 이유 기재 | 도메인 |
| G-05 | 코인 계좌로 `portfolio`·`prices` 호출 금지(400). 계좌 단위 쿼리는 `isCryptoBroker`로 게이팅 | strategy.md:15 | 이유 기재 | 도메인 |
| G-06 | 코인 계좌 잔고 `crypto-portfolio`, 현재가 `crypto-prices`. DCA 상세 크립토 현재가는 `crypto-prices`로만 (실잔고 안 봄) | strategy.md:15 | 이유 기재 | 도메인 |
| G-07 | 코인 DCA: 주문 유형 `MARKET` 고정, `executionHour` 필수, 원 단위 정수 최소 5,000, 주말 요일 허용 | strategy.md:25 | 이유 기재 (dcaFormSchema superRefine) | 도메인 |
| G-08 | 코인은 계좌 통화 표시, 통화 간 환산 안 함 | specs/archive/2026-10-17-crypto-upbit-dca-design.md:28 | 이유 미기재 | 도메인 |
| G-09 | 코인 DCA는 별도 `CRYPTO_DCA` 타입·서브시스템을 채택하지 않음. 기존 모델 확장 + 메타 분기 (1안) | specs/archive/2026-10-17-crypto-upbit-dca-design.md:34 | 폼·스케줄러·화면 중복 | 도메인 |
| G-10 | 코인 통계 1차 통화 토글 없음 (KRW 통계가 항상 비어 의미 없음) | specs/archive/2026-10-17-crypto-upbit-dca-design.md:108 | 이유 기재 | 도메인 |
| G-11 | 코인 DCA 실행 스케줄러·키 만료 알림·코인 `nextExecution`은 api 묶음 C(별도 세션). 그 전까지 UI는 다음 실행일 미표시 | specs/archive/2026-10-17-crypto-upbit-dca-design.md:173 | 이유 기재 | 도메인 |
| G-12 | 빗썸 연동 안 함 (2026-10-31 결정). 백로그·후속 제안 금지 | memory project_done_do_not_redo | 이유 미기재 | 도메인 |
| G-13 | 바이낸스(USDT) DCA UI 완료·운영 활성화(2026-10-31). 재작업·"실키 검증 후 활성화" 백로그 재제안 금지 | memory project_done_do_not_redo | 완료 가드 | 도메인 |
| G-14 | 업비트 DCA 1차 완료·운영 활성화(2026-10-20). 새 거래소 추가 시 2026-10-17 설계 문서 참고 | memory project_done_do_not_redo | 완료 가드 | 도메인 |
| G-15 | DCA 전략 UI 단방향 초판은 다중 규칙 재설계로 대체됨. 다중 규칙 UI 완료(2026-10-23). 모의계좌 DCA UI도 반영 완료 — 잔여 백로그 아님 | memory project_done_do_not_redo | 완료 가드 | 도메인 |
| G-16 | DCA는 수동 실행 `/execute`·미리보기 미지원 (409 `DCA_MANUAL_EXECUTION_UNSUPPORTED`). 바로 주문 DCA 전체 409 | specs/archive/2026-10-13-dca-strategy-ui-design.md:27, strategy.md:40 | 서버 설계 | 도메인 |
| G-17 | Toss 계좌 MOO는 "개장 직후 지정가"로 근사. 시가 체결 보장 없음 | specs/archive/2026-10-13-dca-strategy-ui-design.md:24 | 이유 기재 | 도메인 |
| G-18 | DCA 전략 폼은 `useStrategyForm`(시드·예수금·VR 제출 guard에 묶임)을 재사용하지 않고 별도 `DcaStrategyForm` (RHF+zod) | specs/archive/2026-10-13-dca-strategy-ui-design.md:53, strategy.md:25 | 재사용 시 guard마다 `!isDca` 필요 | 도메인 |
| G-19 | DCA는 원장 예수금·원장 보유 안에서만 매수·매도 (서버가 실잔고를 보지 않음) | strategy.md:25 | 이유 미기재 | 도메인 |
| G-20 | 등록 DCA 예수금 입력은 `SeedInputSection` 재사용, 시드 미리보기 `availableCash`는 참고값·채우기 버튼으로만 (초과 시 경고만, minSeed 없음) | strategy.md:25 | 이유 기재 | 도메인 |
| G-21 | DCA "말일" = `dayOfMonth: null` | strategy.md:25 | 이유 미기재 | 도메인 |
| G-22 | DCA 등록 후 `todayOpenBatchMissed` 토스트 미표시 | strategy.md:25 | 이유 미기재 | 도메인 |
| G-23 | DCA 편집 뷰 이력은 `subviewHistory`로 쌓고 등록의 유형 선택은 `header` prop으로 목록 뷰에만 렌더 (편집 뷰에서 유형 변경 금지) | strategy.md:25 | 편집 이력 칸 중복 ESC 문제 | 도메인 |
| G-24 | DCA 수정은 `PUT /dca-config`, 종목만 읽기 전용 (방향은 규칙별 고정) | strategy.md:25 | 이유 미기재 | 도메인 |
| G-25 | DCA 보유 시작값·예수금은 등록 전용 | strategy.md:25 | 이유 미기재 | 도메인 |
| G-26 | DCA 카드·상세: 래퍼에서 훅 호출 전 `strategy.type === 'DCA'`로 분기. 목록 미리보기는 코인 계좌만 제외, 주식 DCA 포함 | strategy.md:42 | 서버 `TradingPreviewService` 기준 | 도메인 |
| G-27 | 시장 판정: broker 기준 `isCryptoBroker`/`brokerCurrency`, 티커 기준 `isCryptoMarket` | strategy.md:15 | 이유 미기재 | 도메인 |
| G-28 | 전략 유형 `enabled`는 백테스트에서 무시 (비활성 전략도 실험 가능) | strategy.md:36 | 이유 기재 | 도메인 |
| G-29 | 백테스트: 선택지·기본값은 `useRuntimeConfigQuery()`가 SSOT, 미선택 값은 state에 복사하지 않고 읽는 시점 파생 | strategy.md:36 | 운영 설정과 동일 조건 | 도메인 |
| G-30 | VR 입력 컨트롤(`RecurringModeField`, `OptionChoiceGroup`, `VrRampFields`)은 `entities/strategy`에 두고 등록·백테스트 공유 | strategy.md:36 | 이유 기재 | 도메인 |
| G-31 | 백테스트 마지막 실행 입력과 다르면 결과 지우지 않고 stale 안내 | strategy.md:36 | 이유 기재 | 도메인 |
| G-32 | 백테스트 사이클 연속(`cycleSeedType`)은 INFINITE·PRIVACY에만 전송, 기본 `MAX` | strategy.md:36 | 이유 기재 | 도메인 |
| G-33 | 백테스트 `summary.cagr`는 365일 미만이면 null | strategy.md:36 | 이유 기재 | 도메인 |
| G-34 | 중간부터 시작: 세 전략 공통, 등록 전용(수정 불가). 평단 0 + 수량 0이면 필드 생략 | strategy.md:29 | 이유 기재 | 도메인 |
| G-35 | 시작예정일(exclusive 경계): 세 전략 공통, 등록 전용. 안내 문구에 "그날부터" 금지 | strategy.md:30 | 지정일 자신도 skip 가능 | 도메인 |
| G-36 | VR 등록 시 `cycleSeedType=NONE`, `ticker=TQQQ`를 백엔드가 강제 → 사이클 연속 UI 숨김 | strategy.md:31 | 이유 기재 | 도메인 |
| G-37 | VR 적립식(`recurringAmount>0`)은 초기 pool 0 허용, 거치·인출식은 초기 자산 0 차단 | strategy.md:31 | 이유 기재 | 도메인 |
| G-38 | 인출식 추정치 검증은 UI에서 선제, 최종은 서버 | strategy.md:31 | 서버 V값은 시장가 기준 | 도메인 |
| G-39 | VR 수정 모드는 평단·수량 역산 불가, 기존 V값만 읽기 전용 | strategy.md:31 | 이유 기재 | 도메인 |
| G-40 | VR 램프 단계주기 0이면 gMax·gGraceWeeks 등 종속 필드 0 강제·잠금 | strategy.md:32 | 이유 기재 | 도메인 |
| G-41 | VR 램프 공식 프론트 재구현 없음 (미리보기 없음) | specs/archive/2026-07-26-vr-ramp-reconfigure-design.md:19 | 범위 밖 | 도메인 |
| G-42 | VR 재설정은 수정 페이지 제출 로직과 분리된 별도 플로우 (수정 페이지 VR 필드는 읽기 전용) | specs/archive/2026-07-26-vr-ramp-reconfigure-design.md:215 | 이유 기재 | 도메인 |
| G-43 | VR 상세 `poolLimit`은 USD 금액 그대로 (비율 환산 제외) | specs/archive/2026-07-26-vr-strategy-detail-pool-recurring-design.md:11 | 범위 밖 | 도메인 |
| G-44 | VR 상세에서 "시작금액" 카드 미표시 (pool 카드가 겸함). 가용 Pool 별도 카드 미추가 (잔고 이력 확인 가능) | specs/archive/2026-07-26-vr-strategy-detail-pool-recurring-design.md:46, :51 | 이유 기재 | 도메인 |
| G-45 | 투자금 추가 입력 중 주식 편입은 2026-11 제거. VR 재설정은 편입 유지 | strategy.md:26 | 이유 기재 | 도메인 |
| G-46 | 투자금 추가·인출 성공 시 `orderKeys.preview`, 잔고 이력·성과 무효화 필수 (잔고 이력 staleTime 5분) | strategy.md:26-27 | 빠뜨리면 결과 미반영 | 도메인 |
| G-47 | DCA 투자금 추가는 반영 시점을 "다음 회차"로 표기, 효과 문구 없음 | strategy.md:26 | 이유 기재 | 도메인 |
| G-48 | 투자금 인출 한도는 장부 예수금 이하로 폼 검증, 서버가 미체결 매수분을 더 차감해 400 가능 (상한일 뿐) | strategy.md:27 | 이유 기재 | 도메인 |
| G-49 | 실제 계좌 출금은 증권사에서 직접 — 앱은 장부만 변경 | strategy.md:27 | 이유 기재 | 도메인 |
| G-50 | 전략 목록 진입점: 계좌 0개 숨김, 1개 바로 이동, 2개 이상 Popover로 계좌 선택. 폼 안에서 계좌 변경 채택 안 함 | strategy.md:24 | 폼 전체가 accountId 기반 조회 전제 | 도메인 |
| G-51 | 전략 상세 주문 필터는 기간 조회 결과에 AND 적용 후 페이지네이션, 필터 변경 시 1페이지로 초기화 | widgets.md(strategy-detail: strategy.md:40) | 이유 미기재 | 도메인 |
| G-52 | 전략 카드 "전략 원장 부족·계좌 예수금 부족·보유 수량 부족" 판정은 `computeOrderReadiness`. 배지 텍스트 동일 | strategy.md:41 | 색만으로 전달 금지 | a11y/도메인 |
| G-53 | 주문 가능 예산 구간 buy competition은 서버 `competition.availableDeposit` 사용, 클라 margin 쿼리 조합 안 함 | specs/archive/2026-07-18-buy-competition-preview-ui-design.md:84 | 중복 계산 제거 | 도메인 |
| G-54 | 야간 스케줄러 실행 이력 DB 영속화는 범위 밖. 부족 판정은 "지금 다시 계산" 기준 | specs/archive/2026-07-18-strategy-card-deficit-accuracy-design.md:26 | 사용자 선택 | 도메인 |
| G-55 | 계좌 카드 전략 배지 `+N` 요약·접기 미추가 | specs/archive/2026-07-01-account-card-strategy-badges-design.md:59 | 이번 범위 밖 | 도메인 |
| G-56 | 직접 주문 프리뷰 정리 시 `BuyCompetitionNotice` 류 재도입 안 함, "우선순위 전략 목록 펼쳐보기" 범위 밖 (사용자 확인) | specs/archive/2026-07-21-direct-order-preview-cleanup-ui-design.md:108 | 사용자 확인 | 도메인 |
| G-57 | 주문 거절 배너 v1(REJECTED row 영속화)·v2(order_rejections 테이블)는 "최대한 심플하게" 요청으로 DEFERRED | specs/archive/2026-07-21-order-rejection-banner-frontend-diff-design.md:3 | 사용자 요청 | 도메인 |
| G-58 | 주문 거절 배너 건수는 표시 안 함 (근사치라 "몇 건"은 근거 없음). "미접수 여부"만 | specs/archive/2026-07-21-order-rejection-banner-frontend-diff-design.md:65 | 정확도 | 도메인 |
| G-59 | BUY는 사이클당 all-or-nothing → 방향 단위 diff로 충분 | specs/archive/2026-07-21-order-rejection-banner-frontend-diff-design.md:31 | kista-api 계약 | 도메인 |
| G-60 | 백테스트 범위 밖은 spec 2026-08-24 참고 (범위 밖 절 존재) | specs/archive/2026-08-24-backtest-ui-design.md:15 | 이유 미기재 | 도메인 |
| G-61 | 전략 상세 "다음 주문" 카드만 대상, 목록·대시보드 카드는 범위 밖 (별도 이슈 분리) | specs/archive/2026-07-18-buy-competition-preview-ui-design.md:11 | 이유 기재 | 도메인 |
| G-62 | 중간부터 시작 평단·수량 입력 — 곱하지 않음 (T-20 참고) | strategy.md:29 | 이유 기재 | 도메인 |
| G-63 | 가계부: 5탭 실제 라우트(자산·수입·소비·저축·설정). 수입/소비/저축 탭 `8f77d076` 완료, 재작업 금지 | finance-widgets.md:7, memory project_done | 완료 가드 | 도메인 |
| G-64 | 수입/소비/저축 탭은 `type` prop 하나로 같은 위젯 재사용 (탭별 전용 위젯 금지) | finance-widgets.md:7 | 이유 기재 | 도메인 |
| G-65 | 자산 탭 기준 월 상태는 app 페이지가 소유, 위젯에 `month`/`onMonthChange` prop | finance-widgets.md:8 | Server Component는 함수 prop 불가 | 아키텍처 |
| G-66 | 자산 추이·구성비 집계 창 끝은 선택 월(endMonth), 값 없으면 최신 기록 기준 | finance-widgets.md:8 | 이유 기재 | 도메인 |
| G-67 | 추이 기간 상태(`trendMonths`·`trendYears`)는 `FinancePeriodProvider`가 소유, 새로고침 시 초기화 | finance-widgets.md:8 | 이유 기재 | 도메인 |
| G-68 | recharts 차트는 Shell + `next/dynamic({ ssr: false })` Inner 분리, eslint-disable 지시문 바로 앞 줄 배치 | finance-widgets.md:8 | react-doctor 룰이 파일 간 도달성을 안 봄 | 도메인 (예외) |
| G-69 | `AssetForm`은 RHF 아닌 네이티브 `useState` (strategy 도메인 전용 패턴) | features/asset/save-asset/CLAUDE.md | 이유 기재 | 도메인 |
| G-70 | 자산 카테고리 Select는 depth 무관 계단식(`getCascadeLevels`/`getCategoryPath`) | features/asset/save-asset/CLAUDE.md | 이유 기재 | 도메인 |
| G-71 | 자산 등록 폼 카테고리는 기존 L1+L2만 선택, 새 세부 카테고리 생성은 설정 탭에서 | finance.md:12 | 이유 미기재 | 도메인 |
| G-72 | 자산 추천 운용전략 목록은 유저별 설정(`user_settings`), ADMIN 게이트 없음. 설정 탭 위치 유지 | features/finance/manage-strategy-suggestions/CLAUDE.md | 자산 폼 전용 값 | 도메인 |
| G-73 | 거래내역 등록은 라우트가 아니라 다이얼로그 (단건 GET 없음), 다이얼로그는 조건부 마운트 | features/finance/save-transaction/CLAUDE.md | 이전 입력값 잔존 방지 | 도메인 |
| G-74 | 거래 등록 `windowFrom`/`windowTo`: 등록은 독립 창(하한 없음, 이번 달 말), 수정은 조회 중인 12개월 창 | features/finance/save-transaction/CLAUDE.md | 이유 기재 | 도메인 |
| G-75 | 거래 삭제 확인은 `ConfirmDeleteDialog`(범용) 직접 사용 | features/finance/save-transaction/CLAUDE.md | 이유 기재 | 도메인 |
| G-76 | 재무 계좌(`finance/manage-accounts`)는 브로커 계좌(`entities/account`)와 디렉토리·import 섞지 않음 | features/finance/manage-accounts/CLAUDE.md | 다른 도메인 | 아키텍처 |
| G-77 | 카테고리 시스템 관리는 그룹 카테고리 컴포넌트와 완전 분리(훅 조건 분기 금지). `lockSystemCategories` 기본 true, 관리자 화면만 false | features/finance/manage-categories/CLAUDE.md | 시나리오·권한·데이터소스가 다름 | 아키텍처 |
| G-78 | 예산 목록 `/finance/budgets/[type]`은 인터셉팅 라우트, 폼 `dismiss` 분기 | features/finance/manage-budgets/CLAUDE.md | 이유 기재 | 도메인 |
| G-79 | 그룹 탈퇴·추방 시 데이터 `group_id` 이관 없음. 안내는 "더 이상 접근 불가" | features/finance/manage-group/CLAUDE.md | 서버 제약 | 도메인 |
| G-80 | 1인 1그룹 정책: 이미 소속된 유저는 다른 그룹 초대 수락 불가, `AcceptInvitationForm`은 무그룹일 때만 | features/finance/manage-group/CLAUDE.md | 서버 정책 | 도메인 |
| G-81 | OWNER가 나가면 서버가 가장 먼저 가입한 멤버에게 자동 승계 | features/finance/manage-group/CLAUDE.md | 서버 정책 | 도메인 |
| G-82 | 발급 코드는 재조회 불가 → 다이얼로그 열린 동안만 표시 + 복사·경고 | features/finance/manage-group/CLAUDE.md | 서버 제약 | 도메인 |
| G-83 | 수정 화면 기존 값은 런타임 허용 목록으로 덮어쓰지 않음 | entities.md:55 | 이유 미기재 | 도메인 |
| G-84 | 신규 계좌는 활성 증권사만, 신규 전략은 활성 타입과 `allowedValues`/`defaultValue`/`customizable` 사용 | entities.md:55 | 이유 미기재 | 도메인 |
| G-85 | 관리자 설정 전략 블록 — 꺼진 전략 값은 그대로 저장, 저장 시도 후 오류 전략은 강제 펼침 | features.md:33 | 보이지 않는 오류로 저장 막힘 방지 | 도메인 |
| G-86 | 관리자 설정 저장 effect는 entity mutation hook-level success로 주입, 모든 effect await, per-call onSuccess에 async 필수 효과 금지 | features.md:33 | 이유 기재 | 아키텍처 |
| G-87 | 관리자 privacy 테이블 등 관리자 전용 화면은 Route Handler 없이 Server Component apiFetch | entities.md:59 | 이유 미기재 | 아키텍처 (예외) |
| G-88 | 관리자 시스템 카테고리 캐시 `systemCategoriesRoot()`로 그룹 캐시와 분리 | entities.md:16 | 이유 기재 | 데이터 |
| G-89 | 관리자 그룹 데이터 불필요 구독 금지 (`useFinanceGroupsQuery` 구독 안 함) | entities.md:16 | 이유 기재 | 데이터 |
| G-90 | 감사 A-01 P1(비인증 `/` 라우팅 버그)은 정책 변경으로 대체됨 (A-17) | audit A-nn 표, app/(auth)/page.tsx:3, proxy.ts:22 | 정책 변경 | 아키텍처 |
| G-91 | 감사 A-13·S-02: 사이클 시드 배지 팔레트 이탈 — 미해결 P2 | audit A-13, S-02 | — | UI (미해결) |
| G-92 | 감사 A-03: 관리자 활성 보라 하드코딩 — 미해결 P2 (A-03 "하드코딩 확정") | audit A-03 | — | UI (미해결) |
| G-93 | 감사 A-16/S-04: 다크모드 사이드바 활성 밝은 필 — 미해결 P2 | audit A-16, S-04 | — | UI (미해결) |
| G-94 | 감사 S-06: 반려 사유 카드 하드코딩 문구 — P3, rejectReason 필드로 해결 설계 (T-26·T-27) | audit S-06, spec reject-reason | — | 타입 (설계 확정) |
| G-95 | 감사 S-13: 상태 페이지 min-h-screen 중첩 구조는 의도된 구조 | audit S-13 | 절대 위치 헤더 | UI (의도) |
| G-96 | 감사 A-29 정정: 관리자 사이드바 "Overview=파랑 틴트" 관찰은 코드 근거 없음 (rose 클래스 동일) | audit A-29 | 관찰 오류 가능 | UI |
| G-97 | 감사 A-31: 계좌번호 마스킹은 서버 책임 (`accountNoMasked`), 프론트 마스킹 유틸 없음 | audit A-31 | 백엔드 이슈로 재분류 | 타입 |
| G-98 | 감사 A-09: 운영중 초록은 상태 토큰이라 정상 | audit A-09 | — | UI |
| G-99 | 감사 연계 문서 `docs/superpowers/audit/2026-07-12-ui-audit.md`: 스크린샷 판정 일부가 코드와 불일치 (정정 기록) | audit A-29 | 관찰 | 작업 방식 |
| G-100 | 메모리: 대시보드 총자산·평가손익 KPI 재제안 금지 (사용자 불필요 판정 2026-07-13, 감사 A-04 근거) | memory project_done_do_not_redo | 완료 가드 | UI |
| G-101 | 메모리: admin Phase 2A/2B 완료, 재작업 금지 (현재는 FSD·proxy.ts 구조) | memory project_done_do_not_redo | 완료 가드 | 아키텍처 |
| G-102 | 메모리: iOS PWA Bug A 해결(`c5726f2f`), 보정 훅 재도입 금지(`e163aa9e` 판정 "해롭다"). Bug B 미해결(실기기 필요, 진단 중단) | memory project_ios_pwa_viewport_bugs | 이유 기재 | 운영·배포 |
| G-103 | 메모리: `reportClientError`는 다른 호출부가 있어 유지 | memory project_ios_pwa_viewport_bugs | 이유 기재 | 운영·배포 |
| G-104 | 메모리: 로컬 kista-api 임의 기동 금지. 기동은 한 번 요청 후 사용자 "끝" 확인 전까지 유지. 기동 중 MOCK 주문 생성 가능 알림 | memory verify_local_api_constraint | 실거래 백엔드 부작용·Gradle 부팅 비용 (2026-10-14 7회 반복 지적) | 테스트 (작업 방식) |
| G-105 | 메모리: 로컬 DB 실사용자 데이터 — 승인·거절·역할 변경·탈퇴 뮤테이션 절대 금지, 다이얼로그는 열고 취소만. 상태 조작은 dev 테스트 유저만 | memory verify_local_api_constraint | 실사용자 데이터 | 운영·배포 |
| G-106 | 메모리: prod 진단 로그는 `app_error_logs` 소프트 삭제(deleted_at), prod 쓰기는 사용자 승인 후에만 | memory project_ios_pwa_viewport_bugs | 이유 기재 | 운영·배포 |
| G-107 | 메모리: 제안은 클린코드·아키텍처 원칙 기준으로 "위반 지점 → 방향 → 트레이드오프" 순서 | memory feedback_proposal_style | 사용자 요청 | 작업 방식 |
| G-108 | 메모리: UI 일관성 최우선 — 불일치 지적 시 앱 전역 통일, 추천 전 전역 grep, 답이 뒤집히지 않도록 확인 | memory feedback_consistency_first | 재질문 시 답 번복 지적 | UI |
| G-109 | 메모리: "기준처럼 정렬"은 기준 컴포넌트의 실제 정렬 클래스를 코드로 확인해 동일 적용 | memory feedback_alignment_reference_match | 기준 정렬 사례 | UI |
| G-110 | 메모리: 서브에이전트 분할은 FSD 영역별 파일 비겹침, 공용 프리미티브 먼저 확정 | memory feedback_orchestrate_subagents | 이유 기재 | 작업 방식 |
| G-111 | 메모리: 긴 작업 중 중요 결정은 memory에 저장 (compact 대비) | memory feedback_proactive_memory_save | 이유 기재 | 작업 방식 |
| G-112 | 2026-07-10 post-cleanup: 알림 권한 자동 요청 금지, proxy 재검증 간격 정책 보류 | specs/archive/2026-07-10-post-cleanup-followups-design.md:12, :64 | 이유 기재 | 아키텍처·UI |
| G-113 | 2026-07-12 ui-ux-improvement: 인증 화면 실스크린샷에 로컬 kista-api 필요 — 에이전트 임의 기동 금지 | specs/archive/2026-07-12-ui-ux-improvement-design.md:50 | 실거래 백엔드 | 테스트 |
| G-114 | 2026-07-12 staletime-and-cyclehistory: 범위 밖 절 존재 | specs/archive/2026-07-12-staletime-and-cyclehistory-design.md:57 | 본문 미확인 | 테스트·데이터 |
| G-115 | 2026-07-26 vr-ramp: 범위 밖 — kista-api 자체 변경, 램프 공식 프론트 재구현 | specs/archive/2026-07-26-vr-ramp-reconfigure-design.md:19 | 이유 기재 | 도메인 |
| G-116 | 2026-07-21 direct-order-preview: 주문 전 프리뷰 "전략 목록 펼쳐보기" 범위 밖 | specs/archive/2026-07-21-direct-order-preview-cleanup-ui-design.md:108 | 사용자 확인 | 도메인 |
| G-117 | 2026-09-25 benchmark slice split: `HousingBenchmarkComparison`이 `housing-quintile-trend`를 직접 import하는 안 기각 (영구 예외 방지) | specs/archive/2026-09-25-benchmark-comparison-slice-split-design.md:19 | 이유 기재 | 아키텍처 |
| G-118 | 2026-09-25 benchmark slice split: 상태를 app 레이어로 리프팅하는 안 기각 (회귀 리스크) | specs/archive/2026-09-25-benchmark-comparison-slice-split-design.md:18 | 이유 기재 | 아키텍처 |
| G-119 | 2026-10-03 budget route modal: 비목표 절 존재 | specs/archive/2026-10-03-budget-route-modal-design.md:19 | 본문 확인 필요 | 아키텍처 |
| G-120 | 2026-10-21 dca-multi-rule-ui: 구현 보류 — kista-api 계약 확정 전 구현 금지 | specs/archive/2026-10-21-dca-multi-rule-ui-design.md:5, :116 | 계약 확정 대기 | 도메인 |
| G-121 | 2026-07-12 reject-reason: spec은 활성 상태 파일(docs/superpowers/specs/2026-07-12-reject-reason-design.md)로 남아 있음 — 구현 완료 여부 문서상 불명 | specs/2026-07-12-reject-reason-design.md | — | 도메인 (확인 필요) |
| G-122 | 2026-07-01 admin trade correction: 추천 근거 기록 | specs/archive/2026-07-01-admin-trade-correction-ui-design.md:35 | 이유 기재 | 도메인 |
| G-123 | 2026-06-29 strategy edit seed removal: 수정 시 시작금액 읽기 전용, payload 미포함, 새 스냅샷 append 안 함 | specs/archive/2026-06-29-strategy-edit-seed-removal-design.md:31, :59 | 이유 기재 | 도메인 |
| G-124 | 2026-07-02 order cancel planned/placed: 정책 근거 기록 | specs/archive/2026-07-02-order-cancel-planned-placed-design.md:18 | 이유 기재 | 도메인 |
| G-125 | 2026-07-18 strategy-card deficit: 과거 실행 이력 영속화 범위 밖 (브레인스토밍 선택) | specs/archive/2026-07-18-strategy-card-deficit-accuracy-design.md:26 | 사용자 선택 | 도메인 |

## 7. 아키텍처 전제 요약 (고정된 "이렇게 한다")

- 계층: FSD 단방향, 동일 계층 금지, widget 화이트리스트 닫힘 (A-01~A-06).
- 서버·클라이언트 경계: Server Component는 apiFetch + prefetch/HydrationBoundary, Client Component는 clientFetch(Route Handler 경유). Client 직접 kista-api 호출 전면 금지 (A-11, A-12, D-02).
- Route Handler 경유 강제 + 예외: privacy 관리자 Server 직접 호출 (A-14), requireAuth 플래그 (A-15).
- React Query 캐시 SSOT: 서버 상태 useState 복사 금지 (D-01), queryKey factory (D-06), 삭제·생성 캐시 규칙 (D-11~D-13), mutation 훅 toast (D-15).
- 타입 생성 방식: `api-types.ts` 생성물 (gen:types), enum은 `api-schema.ts`, 응답 정규화는 entities api normalizer, 일부 엔드포인트 수기 타입 (T-01~T-04, T-09).
- 폼·검증: 대부분 RHF+zod, 자산 폼은 네이티브 useState (G-69), DCA 폼은 별도 RHF+zod (G-18). 명시적 폼 라이브러리 표준은 문서에 별도 기재 없음 (이유 미기재).
- 체결 후 갱신: router.refresh 금지, SSE 무효화 (D-25~D-27).
- 인증 라우팅: proxy.ts 단일 분기, 캐시 쿠키 기반, PENDING 캐싱 금지 (A-16, A-20, A-22).

## 8. 문서 자체의 규모

| 항목 | 수치 | 근거 |
|---|---|---|
| 루트 CLAUDE.md | 37줄 | 파일 |
| 중첩 CLAUDE.md (루트 제외) | 22개, 합계 약 100줄 (전체 CLAUDE.md 합계 약 23.6KB, 루트 포함) | find 결과 |
| docs/agents/*.md | 16개, 580줄, 약 84KB(해당 파일 기준 합산) | wc |
| README.md | 111줄 | 파일 |
| docs/superpowers/audit | 1개(127줄) + screenshots 97개 | 파일 |
| docs/superpowers/specs | 활성 1개(62줄) + archive 38개 | 파일 |
| docs/superpowers/plans | archive 33개 (활성 0개) | 파일 |
| 메모리 `.md` | 9개(MEMORY.md 인덱스 포함), 합계 141줄 | wc |
| knip.json | 19줄 | 파일 |
| eslint.config.mjs | 53줄 | 파일 |

세션 시작 시 자동 로드 (always):
- 루트 CLAUDE.md 37줄 + `@commands.md`(30) + `@architecture.md`(35) + `@constraints.md`(30) = 132줄, 약 10.9KB (commands·architecture·constraints 합계 10,943 bytes 기준, 루트 포함). 전역 `~/.claude/CLAUDE.md`와 메모리 인덱스(MEMORY.md, 약 1.5KB)는 별도.

디렉토리 작업 시 추가 자동 로드 (`@` import 포함, 줄 수 기준):
- `app/`: CLAUDE 6 + app.md 60 + copy 16 = 82줄 (app.md는 바이트 약 13.4KB)
- `entities/`: CLAUDE 7 + entities.md 72 + copy 16 + react-query 6 = 101줄 (entities.md 약 10.1KB)
- `features/`: CLAUDE 8 + features.md 33 + copy 16 + a11y 13 + react-query 6 = 76줄
- `widgets/`: CLAUDE 8 + widgets.md 64 + copy 16 + a11y 13 + react-query 6 = 107줄 (widgets.md 약 7.3KB)
- `shared/`: CLAUDE 6 + shared.md 112 + a11y 13 = 131줄 (shared.md 약 16.7KB)
- 가계부 하위 (`features/finance/*`, `entities/finance`, `features/asset/save-asset`): finance.md 20줄(약 10.8KB) + finance-group-share 3줄 (긴 줄 단락, 바이트 기준으로는 큼)
- 전략 관련 파일 작업 시 strategy.md (42줄, 약 19.2KB)는 "필요시 Read"이므로 자동 로드 아님. 단 entities·features·widgets 레이어 문서가 "필수 Read"로 지시.

참고: 줄 수보다 바이트가 큰 파일은 한 줄이 매우 긴 단락이다 (strategy.md, shared.md, app.md). 줄 수 기준 체감보다 실제 로드량이 크다.

## 9. 규칙끼리 중복·충돌 지점

중복 (같은 규칙이 여러 파일에 반복):
- D-15 / U-44: mutation `onError` 토스트 덮어쓰기 금지 — entities.md:36 ↔ copy.md:15.
- D-02 / D-03 / D-05: 서버 prefetch + hydrate + queryOptions — architecture.md:31 ↔ entities.md:30-35 ↔ app.md:47.
- A-24 / A-25 / G-23: 인터셉팅 라우트 + subviewHistory + dismiss — app.md:40-41 ↔ strategy.md:23-25.
- D-25 / D-26: router.refresh 금지·예외 — shared.md:42-45 ↔ app.md:36 (unstable_retry 설명 중복).
- 필수 Read 지시: 가계부·전략 두 줄이 entities.md:6-7, features.md:5-6, widgets.md:5-6, entities/finance/CLAUDE.md, CLAUDE.md:31-32에 반복.
- 그룹 공유 규칙: finance-group-share.md가 features/finance 4개 슬라이스 CLAUDE.md에서 각각 import, 본문 3줄이지만 바이트 큼.
- copy.md (16줄)가 app·entities·features·widgets 4개 레이어에서 공통 import.
- strategy.md의 DCA 시드 미리보기 OFF (strategy.md:25)와 useStrategyForm 재사용 금지 (G-18) — 같은 결정의 두 기록.

충돌 후보 (문서 간 긴장):
- 감사 A-01 / S-01 (P1, `app/(auth)/page.tsx` 무조건 리다이렉트를 버그로 판정) ↔ architecture.md:9 및 `app/(auth)/page.tsx:3`의 "/는 항상 /dashboard" 정책. 감사 파일에 "정책 변경으로 무효" 표기가 없어 감사 본문만 보면 버그로 읽힌다.
- 메모리 verify_local_api_constraint (로컬 kista-api 임의 기동 금지, 사용자 확인 필요) ↔ commands.md:28 (`test:e2e`는 로컬 kista-api·kista-trading 기동이 전제, 커밋 전 로컬 1회 실행). 기동 허락 절차가 문서 간에 정리돼 있지 않다.
- 메모리 feedback_orchestrate_subagents ("공용 프리미티브·설계 판단은 오케스트레이터가 먼저 정하고, Sonnet 병렬") ↔ 전역 CLAUDE.md ("판단이 끝난 기계적 수정은 상위 모델이 직접 하지 않고 하위 모델에 위임", "상위 모델은 범위 조사·방향 결정·사용자 질문만"). 역할 경계가 두 곳에서 조금 다르게 적혀 있다.
- 감사 S-02/S-03 (배지 팔레트 이탈 P2) ↔ `status-badge.ts`의 "canonical" 주석 (의도적 표기). S-03은 주석을 근거로 의도적이라 했으나 S-02 `seed-badge.ts`는 의도 주석이 없다.
- 감사 S-04 (사이드바 활성 토큰 미사용 P2) ↔ 현재 사이드바 코드 `bg-rose-50` 사용. 확정 결정인지 미해결 감사 항목인지 문서로 구분되지 않는다.
- 문서 `copy.md:5` "카드/리스트/토글은 명사구, 마침표 없음" ↔ 같은 파일 `copy.md:6`의 토스트 마침표 레이어별 규칙 — 두 축이 같은 "마침표" 주제라 읽기 혼란 가능 (내부 충돌은 아님).
- 테스트 강제(cacheArchitecture.test.ts) ↔ shared.md:16 "이 금지 규칙은 ... AST로 훑어 기계적으로 강제" — 일치. 다만 widgets.md의 `DashboardContent` 등 게이팅 예시는 테스트로 강제되지 않음 (문서상 강제 여부 미기재).
- README "Client Component는 백엔드를 직접 호출하지 않는다" ↔ entities.md:59 privacy 관리자 Server 직접 호출 — Client 규칙과는 충돌 없음, Route Handler 규칙의 예외 목록에 README는 없음.

## 10. 규칙이 코드 비대를 유발할 가능성이 있는 항목 (판단 없이 표시만)

아래는 "비대 유발 가능" 표시이며, 이 파일은 그 적정성을 판단하지 않는다.

1. 목록성 서버 상태는 Server prefetch + HydrationBoundary + Client 캐시 소비 (architecture.md:31). 근거 문장: "목록성 서버 상태는 `createQueryClient()` + `prefetchQuery()` + `<HydrationBoundary>`로 주입하고, 이후 빈 상태/목록 전환은 Client Component가 React Query 캐시를 SSOT로 소비한다". 목록 화면마다 Server 프리페치 함수와 Client 소비 컴포넌트 쌍이 생긴다.
2. Client Component 직접 kista-api 호출 전면 금지 + Route Handler 경유 (architecture.md:33, app.md:28 requireAuth). 근거 문장: "Client Component에서 직접 kista-api 호출 전면 금지 (CORS + 쿠키 문제)" / "신규 프록시 라우트 추가 시 kista-api 쪽 엔드포인트가 공개인지 반드시 확인하고 이 플래그를 맞출 것". 엔드포인트마다 Route Handler 파일과 requireAuth 판정이 붙는다. (`app/api/**` 프록시 쌍)
3. 체결 민감 값은 Server Component 계산 금지, queryOptions prefetch + hydrate + 무효화 대상 등록 (shared.md:54). 근거 문장: "체결 민감 값을 Server Component에서 직접 계산해 prop으로 넘기지 않는다. refresh가 없으므로 체결 후에도 갱신되지 않는다. queryOptions로 prefetch+hydrate하고, 그 키를 아래 대상에 포함시킨다." 체결에 민감한 화면마다 키·무효화 목록·테스트가 함께 늘어난다 (TradeNotificationBridge 대상 키 + 테스트 고정).
4. 인터셉팅 라우트 쌍 4파일 구조 (app.md:40-42). 근거 문장: "`app/(main)/@modal`(parallel route) + `default.tsx`(`null`) + `[...catchAll]/page.tsx`(`null`)" 및 "일반 `page.tsx`와 `@modal` 인터셉트 버전은 ... 완전히 동일하고 ... `XxxFormBody.tsx`로 한 번만 작성". 폼 화면마다 page·@modal·default·catchAll·FormBody·RouteModal 조합이 필요하다.
5. widget 화이트리스트 닫힘 + 화이트리스트 밖은 app 라우트 slot 조립 (widgets.md:14, 18). 근거 문장: "목록은 **닫혀 있다** — '등'으로 임의 확장하지 않는다" / "하위 위젯은 `ReactNode` prop으로 주입". 새 페이지 위젯 간 결합이 필요하면 app 레이어 조립 코드와 slot prop이 늘어난다.
6. 계층별 타입·정규화 분리 (shared.md:69-71, entities.md:65, strategy.md:7). 근거 문장: "KIS live 응답은 UI 타입과 필드명이 다를 수 있다 ... `entities/*/api`의 normalizer에서 변환한다" / "`TradingCycleResponse` 필드 추가 시 `types.ts` + `normalizeStrategy()`를 함께 수정". 엔티티마다 types·normalizer·api·queryKeys·queryOptions·hooks·index가 분리된다 (entities.md:17-26 슬라이스 구조).
7. 도메인 폼 복제 허용 (strategy.md:25, G-18). 근거 문장: "`useStrategyForm`의 submit guard가 시드·예수금·VR에 묶여 있어 재사용하지 않았다". DCA 폼은 별도 RHF+zod 구현.
8. 편집 뷰 이력 규칙 (app.md:41, strategy.md:25). 근거 문장: "편집 뷰마다 `shared/lib/subviewHistory`로 고유 토큰을 단 이력 항목을 하나 쌓아". 모달 내 하위 뷰마다 이력·종료 처리 분기가 필요하다.
9. 공용 컴포넌트 variant·의미 구분 (shared.md:96-99, :107-112). 근거 문장: "세 컴포넌트는 의미(값 선택 / 내용 전환 / 라우트 이동)로 고르고" / "버튼 스타일 SSOT는 `components/ui/button-variants.ts`의 `buttonVariants`다". 같은 역할 컴포넌트가 여럿 존재하고 선택 규칙을 따라야 한다.
10. 카피·토스트 레이어별 컨벤션 분기 (copy.md:6). 근거 문장: "새 토스트를 추가할 때 이 파일이 어느 레이어인지부터 확인하고 그 레이어의 컨벤션을 따른다" — 호출 위치별로 마침표 규칙이 달라 분기가 생긴다.
11. 잔여 항목: 가계부 집계 래퍼 강제 (finance.md:12, D-40) — 범용 함수 직접 호출 금지로 래퍼 파일이 늘어난다.

## 11. 기타 메모

- 이 목록은 문서 기재 기준이다. 실제 코드에서 같은 결정이 준수되는지는 검증하지 않았다 (범위 밖).
- 줄 번호는 읽은 시점 기준. 일부 항목은 절 제목 또는 근처 줄로 표기했다 (file(절) 형식).
- `docs/superpowers/fable-review/PROGRESS.md`는 이 리뷰의 기존 진행 파일로 보이며 이번 수집 범위에 포함하지 않았다.
- 유지 확정 중 "재심 주의" 표시가 필요한 항목: A-17(감사 대체 정책), G-90, U-54/U-55/G-91~G-93(감사 미해결 P2가 결정처럼 보일 수 있음), G-121(reject-reason 활성 spec 상태 불명), G-119(예산 비목표 본문 미확인).
