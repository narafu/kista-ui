# UI/UX 일관성·재사용성·클린코드 감사 보고서

조사일: 2026-09-10. 범위: `app/`(126) `widgets/`(195) `features/`(172) `entities/`(164) `shared/`(85), 총 742개 파일. 읽기 전용 조사, 코드 미변경.

## 요약

전반적으로 FSD 계층 위반·`any` 타입·비인증 fetch 오남용은 **없음** (규칙 잘 지켜짐). 문제는 세 갈래:

1. **완전 동일 파일 중복** (app 라우트) — 기계적 통합 가능, 리스크 최소
2. **같은 목적의 UI/로직을 위젯·엔티티마다 각자 재구현** — 로딩 상태, 폼 보일러플레이트, 뮤테이션 훅 골격, 쿼리스트링 빌더
3. **디자인 토큰 적용 반쪽** — `rounded-[var(--r-md)]` 토큰과 `rounded-lg` 하드코딩이 파일마다 혼재, `cn()`/`cva` 채택 불균일(cva는 프로젝트 전체 0건)

## 우선순위 높음

| # | 영역 | 위치 | 문제 | 조치 |
|---|------|------|------|------|
| 1 | app | `app/(admin)/admin/{admin,pending,trades,users,accounts}/loading.tsx` | 5개 파일 바이트 단위 완전 동일 | 공통 `AdminTableLoadingSkeleton`로 추출, 각 파일은 재export |
| 2 | app | `app/(main)/@modal/(.)accounts/[id]/strategies/[sid]/{edit,reconfigure-vr}/loading.tsx`, `strategies/new/loading.tsx`, `finance/[id]/edit/loading.tsx`, `finance/new/loading.tsx` | 5개 파일 완전 동일 | 공통 `ModalFormLoadingSkeleton` 추출 |
| 3 | app | `app/(main)/finance/(dashboard)/(flow)/{expense,income,saving}/page.tsx` | 3개 파일이 `type` 인자 하나만 다르고 완전 동일 | `FlowPage({ type })` 위젯 하나로 합치고 각 route는 1줄 래퍼 |
| 4 | app | `app/(main)/finance/(dashboard)/(flow)/useFinanceFlowData.ts` (126줄) | app에 비즈니스 로직 통째로 존재 — FSD 위반 | `features/finance/` 또는 `widgets/finance-flow/`로 이동 |
| 5 | app | admin 4개 페이지(`admin/{page,logs,settings,accounts}.tsx`) | `PageHeader` 미사용, `h1`+`p` 인라인 반복 — 일반 앱은 전부 `PageHeader` 사용 | admin 섹션도 `@widgets/page-header` 통일 |
| 6 | widgets | `DesktopSidebar.tsx` vs `AdminSidebar.tsx` | 동일 "nav active 상태" 패턴 각자 구현, radius 토큰도 다름 | 공통 `SidebarNavItem` 추출 |
| 7 | widgets | 8개 위젯(finance-summary, finance-budget-progress, finance-record-list, asset-overview, cycle-history, strategy-detail, asset-record-list, stats-overview) | `flex items-center justify-center py-8 text-sm text-muted-foreground` + "불러오는 중…" 동일 마크업 복붙 | 공통 `LoadingRow` 컴포넌트 |
| 8 | widgets | `FearGreedGauge.tsx:33,54` | 순수 Tailwind 대체 가능한데 인라인 style 사용 (규칙 위반) | `relative`, `absolute inset-0 pointer-events-none`로 교체 |
| 9 | features | `TradingAlertToggle.tsx`, `BalanceCheckSetting.tsx` | 서버 상태를 `useState`로 복사(SSOT 위반) + `onError` 롤백 없음 → 뮤테이션 실패 시 UI 영구 불일치 | React Query 캐시 직접 구독으로 전환, `onError` 롤백 추가 |
| 10 | features | `ErrorLogsSectionClient.tsx:103` | 벌크 삭제 확인만 `variant="destructive"` 누락 (다른 6곳은 있음) | variant 추가 |
| 11 | entities | trade/stats/order/finance api 4곳 | 쿼리스트링 빌더(`URLSearchParams` + `if(x) q.set()`) 각자 재구현 | `shared/lib/query-string.ts`로 통합 |

## 우선순위 중간

- **폼 보일러플레이트**: `features/finance/*FormDialog.tsx` 5~6개가 `useState` 필드 + 수동 `trim()`/`Math.max` 검증 + `isPending ? '저장 중...' : '저장'` + `<Spinner size={14}/>`를 반복(13개 파일, 12곳). 공용 `<LoadingButton>` + 폼 필드 훅 후보.
- **뮤테이션 훅 골격 반복**: `useManageStrategyMutations.ts`, `EditAccountForm.tsx`, `useStrategyForm.ts`가 동일한 `invalidateQueries + toast.success + onError: apiMsg` 4종 세트를 복제. 공통 팩토리(`useStrategyActionMutation`) 후보.
- **AccountFormDialog만 취소 버튼 없음** — 나머지 4개 폼 다이얼로그는 `variant="outline"` 취소 버튼 보유.
- **radius 토큰 반쪽 적용**: widgets 다수 파일 `rounded-xl`/`rounded-lg` 하드코딩 vs 27개 파일은 `rounded-[var(--r-lg)]` 토큰 사용.
- **cn() 미사용 template literal 조건부 클래스**: widgets 6개 파일, entities 쪽 `AdminPrivacyBaseTable.tsx`, `RevealableValue.tsx`(화이트리스트 공용 위젯인데도 미사용).
- **cva 프로젝트 전체 0건** — "복잡한 변형은 cva" 규칙이 실질적으로 사문화.
- **normalize 헬퍼 도입 불균일**: `shared/lib/normalize`를 쓰는 곳은 strategy 하나뿐, order/trade는 `String()`/`Number()` 직접 캐스팅.
- **13개 page.tsx가 동일한 `getAuthToken` + `createQueryClient` + 조건부 `prefetchQuery` 3줄 골격 반복** — 얇은 헬퍼로 추출 여지(단, React Query SSR 관용 패턴이라 과도한 추상화는 주의).
- **모달/비모달 라우트 쌍**(strategies/new, finance/edit·new 등)의 20줄 로직이 `RouteModal` 래핑 여부만 다르고 중복.

## 우선순위 낮음 (참고용, opportunistic)

- 상태색 접근자 함수 2종 병존(`userStatusColorVar` vs `strategyStatusAccent`)
- 로고 이미지 크기 지정 방식 혼용(인라인 style vs `size-[Npx]` 클래스, 파일마다 다른 px 값)
- 섹션 타이틀 폰트 굵기 불일치(`font-bold` vs `font-semibold`)
- 로딩 표현이 "텍스트 문구"와 "스켈레톤 블록" 두 갈래로 미통일
- `app/global-error.tsx` 인라인 style 블록 다수 (globals.css 로드 실패 대비 최후 방어선일 가능성 있어 확인 필요)
- `admin/accounts/page.tsx`의 `STRATEGY_STATUS_COLOR` 인라인 style — Badge에 `tone` variant 추가시 제거 가능

## 확인 결과 이상 없음

- `any` 타입: entities/shared/features/app 전체 0건
- FSD 역방향 의존: entities→features/widgets, features→widgets/features cross-import 0건
- queryKey 패턴: 11개 도메인 모두 `all → xxxRoot() → list()/detail(id)` 계층 일관
- Route Handler: `createProxyRoute`로 이미 잘 추상화됨, 문제 없음
- 인증 체크(`requirePageToken`): 9곳에서 재사용 잘 되고 있음

## 다음 단계 제안

범위가 크니 한 번에 다 처리하지 말고 묶어서 단계적으로 진행 권장:

- **1단계 (기계적, 리스크 최소)**: 항목 1·2·3 — 완전 동일 파일 통합. 로직 변경 없음, 리뷰 가볍게.
- **2단계 (버그성)**: 항목 9·10 — SSOT 위반 + 롤백 누락은 실제 버그이므로 우선.
- **3단계 (공통 컴포넌트 추출)**: 항목 6·7·8, 로딩 상태 통일, LoadingButton.
- **4단계 (구조 이동)**: 항목 4 — FSD 위반 훅 이동. 항목 11 — 쿼리스트링 빌더 통합.
- **디자인 토큰/cva 정책**은 규모가 크므로 별도 스코프로 분리 추천(리팩토링이 아니라 스타일 가이드 재정립에 가까움).
