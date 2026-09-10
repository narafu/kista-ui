# UI/UX 일관성·재사용성·클린코드 감사 보고서

조사일: 2026-09-10. 범위: `app/`(126) `widgets/`(195) `features/`(172) `entities/`(164) `shared/`(85), 총 742개 파일. 읽기 전용 조사, 코드 미변경.

**처리 현황(2026-09-10 세션)**: 우선순위 높음 1·2·3·5·6·7·8·9·10·11 전부 완료. 중간 항목 중 `AccountFormDialog` 취소버튼 완료. 항목 4는 조사 결과 오판으로 판명(하단 참고) — 스킵. 나머지 중간/낮음 항목은 하단 "스킵 사유" 참고.

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
| 4 | app | `app/(main)/finance/(dashboard)/(flow)/useFinanceFlowData.ts` (126줄) | ~~app에 비즈니스 로직 통째로 존재 — FSD 위반~~ **오판으로 판명** — `docs/agents/widgets.md`에 "서브라우트 전환으로 위젯 cross-import 없이 period를 공유하기 위해 app 레이어에 둔 의도적 설계"로 이미 문서화돼 있음. 4개 감사 서브에이전트가 각자 자기 레이어만 읽고 `docs/agents/*`를 상호 대조하지 않아 발생한 오탐 | **스킵** — 이동하지 않음. 대신 항목 3(income/expense/saving 3파일 완전 동일)만 `FlowPageView` 컴포넌트로 통합 완료(로직 위치는 그대로) |
| 5 | app | admin 4개 페이지(`admin/{page,logs,settings,accounts}.tsx`) | `PageHeader` 미사용, `h1`+`p` 인라인 반복 — 일반 앱은 전부 `PageHeader` 사용 | admin 섹션도 `@widgets/page-header` 통일 |
| 6 | widgets | `DesktopSidebar.tsx` vs `AdminSidebar.tsx` | 동일 "nav active 상태" 패턴 각자 구현, radius 토큰도 다름 | 공통 `SidebarNavItem` 추출 |
| 7 | widgets | 8개 위젯(finance-summary, finance-budget-progress, finance-record-list, asset-overview, cycle-history, strategy-detail, asset-record-list, stats-overview) | `flex items-center justify-center py-8 text-sm text-muted-foreground` + "불러오는 중…" 동일 마크업 복붙 | 공통 `LoadingRow` 컴포넌트 |
| 8 | widgets | `FearGreedGauge.tsx:33,54` | 순수 Tailwind 대체 가능한데 인라인 style 사용 (규칙 위반) | `relative`, `absolute inset-0 pointer-events-none`로 교체 |
| 9 | features | `TradingAlertToggle.tsx`, `BalanceCheckSetting.tsx` | 서버 상태를 `useState`로 복사(SSOT 위반) + `onError` 롤백 없음 → 뮤테이션 실패 시 UI 영구 불일치 | React Query 캐시 직접 구독으로 전환, `onError` 롤백 추가 |
| 10 | features | `ErrorLogsSectionClient.tsx:103` | 벌크 삭제 확인만 `variant="destructive"` 누락 (다른 6곳은 있음) | variant 추가 |
| 11 | entities | trade/stats/order/finance api 4곳 | 쿼리스트링 빌더(`URLSearchParams` + `if(x) q.set()`) 각자 재구현 | `shared/lib/query-string.ts`로 통합 |

## 우선순위 중간

- **폼 보일러플레이트**: `features/finance/*FormDialog.tsx` 5~6개가 `useState` 필드 + 수동 `trim()`/`Math.max` 검증 + `isPending ? '저장 중...' : '저장'` + `<Spinner size={14}/>`를 반복(13개 파일, 12곳). 저장 버튼 부분은 `SaveButton`으로 완료(2026-09-10). 필드/검증 훅 추출은 미착수 — 폼마다 검증 규칙이 달라 설계 판단 필요, 별도 스코프.
- **뮤테이션 훅 골격 반복**: `useManageStrategyMutations.ts`, `EditAccountForm.tsx`, `useStrategyForm.ts`가 동일한 `invalidateQueries + toast.success + onError: apiMsg` 4종 세트를 복제. 미착수 — 공통 팩토리 설계가 필요해 별도 스코프로 남김.
- **AccountFormDialog만 취소 버튼 없음** — **완료**(2026-09-10). `SaveButton`과 함께 취소 버튼 추가.
- **radius 토큰 반쪽 적용**: widgets 다수 파일 `rounded-xl`/`rounded-lg` 하드코딩 vs 27개 파일은 `rounded-[var(--r-lg)]` 토큰 사용. `AdminSidebar`(항목 6 관련분)만 완료, 나머지 미착수 — 파일 수가 많아 별도 스코프.
- **cn() 미사용 template literal 조건부 클래스**: widgets 6개 파일 등. 미착수.
- **cva 프로젝트 전체 0건**: 미착수 — 스타일 가이드 재정립 수준의 별도 작업.
- **normalize 헬퍼 도입 불균일**: 미착수.
- **13개 page.tsx가 동일한 `getAuthToken` + `createQueryClient` + 조건부 `prefetchQuery` 3줄 골격 반복**: **스킵 권장** — React Query SSR 관용 패턴이라 얇은 헬퍼로 뽑아도 이득이 적고 과잉추상화 위험(advisor 판단).
- **모달/비모달 라우트 쌍**(strategies/new, finance/edit·new 등)의 20줄 로직 중복: **스킵 권장** — `docs/agents/app.md`의 인터셉팅 라우트 quirk가 이미 이 트레이드오프를 documented tradeoff로 기록.

## 우선순위 낮음 (참고용, opportunistic)

- 상태색 접근자 함수 2종 병존(`userStatusColorVar` vs `strategyStatusAccent`) — **스킵**: 서로 다른 도메인(유저 상태 vs 전략 상태), 통합하면 두 도메인을 다 아는 함수 하나가 남아 더 나빠짐.
- 로고 이미지 크기 지정 방식 혼용(인라인 style vs `size-[Npx]` 클래스) — **스킵**: `docs/agents/app.md`에 "Next.js Image + Tailwind preflight 경고 회피용 의도적 워크어라운드"로 이미 문서화됨. Tailwind 클래스로 바꾸면 그 fix를 되돌리는 것.
- 섹션 타이틀 폰트 굵기 불일치(`font-bold` vs `font-semibold`) — 미착수, 사소함.
- 로딩 표현이 "텍스트 문구"와 "스켈레톤 블록" 두 갈래로 미통일 — 미착수. 실사용 UX 이슈이긴 하나 ~10개 위젯에 걸친 디자인 결정(테스트 커버리지 없음)이라 별도 스코프로 남김.
- `app/global-error.tsx` 인라인 style 블록 다수 — **스킵**: `globals.css` 로드 실패 시의 최후 방어선일 가능성이 높아(Tailwind 클래스는 그 실패 시나리오에서 작동 안 함) 건드리지 않음.
- `admin/accounts/page.tsx`의 `STRATEGY_STATUS_COLOR` 인라인 style — **스킵**: `Badge.tsx`가 `tone: 'none'`을 "색은 className/style로 주입 — entities 배지 클래스 조합용"으로 명시적으로 문서화한 의도된 escape hatch. 위반이 아니라 정확히 그 용도로 쓰이고 있음.

## 감사 방법론 노트 (다음 audit 세션을 위해)

이번 세션에서 4개 감사 서브에이전트가 각자 담당 레이어(`app`/`widgets`/`features`/`entities`+`shared`)만 읽고 `docs/agents/*.md`를 상호 대조하지 않아, 실제로는 의도된 설계(항목 4, 항목 10, 로고 style, global-error style)를 FSD 위반·규칙 위반으로 오탐한 사례가 4건 나왔다. 다음에 유사 감사를 돌릴 때는 각 서브에이전트에게 해당 레이어의 `docs/agents/*.md`를 먼저 읽고 "이미 문서화된 의도적 패턴인지" 확인한 뒤 이슈로 등록하라고 지시할 것.

## 확인 결과 이상 없음

- `any` 타입: entities/shared/features/app 전체 0건
- FSD 역방향 의존: entities→features/widgets, features→widgets/features cross-import 0건
- queryKey 패턴: 11개 도메인 모두 `all → xxxRoot() → list()/detail(id)` 계층 일관
- Route Handler: `createProxyRoute`로 이미 잘 추상화됨, 문제 없음
- 인증 체크(`requirePageToken`): 9곳에서 재사용 잘 되고 있음

## 다음 단계 제안 (완료 후 남은 것)

높음 항목 전부·중간 항목 일부(AccountFormDialog 취소버튼)·"오판 3건" 확인까지 2026-09-10 세션에서 종료. 앞으로 더 볼 만한 건 우선순위 중간에 미착수로 남은 것들뿐이며, 전부 별도 스코프(설계 판단 필요) 권장:

- 폼 필드/검증 공통 훅 추출 (폼마다 검증 규칙 달라 설계 필요)
- 뮤테이션 훅 공통 팩토리 (`useStrategyActionMutation` 등)
- widgets 전반 radius 토큰 통일 (파일 수 많음)
- 로딩 텍스트/스켈레톤 표현 통일 (디자인 결정, 테스트 커버리지 없음)

디자인 토큰/cva 정책은 리팩토링이 아니라 스타일 가이드 재정립 수준이라 여전히 분리 권장.
