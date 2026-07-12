# Phase 2 UX 흐름 개선 설계서

- 근거: `docs/superpowers/audit/2026-07-12-ui-audit.md` 부록 B 항목 + Phase 2 착수 탐사
- 원칙: 신규 백엔드 API 없이 기존 데이터·훅 재사용. 화면 단위 Sonnet 구현 가능한 수준까지 명세.

## 판정 변경 (탐사 결과)

| ID | 판정 | 근거 |
|---|---|---|
| A-18 | **기각** | `app/(main)/layout.tsx:58` main이 이미 `pb-24 lg:pb-9`(96px) — 바텀내비(~60px) 충분히 클리어. 감사 관찰은 스크롤 중간 프레임 |
| A-21 | 축소(P3 폴리시) | '바로 주문'은 이미 rose 그라데이션·white — 캡처 시점이 휴장일이라 `opacity-50` 상태였음. 개선: 사유 배지 노출로 축소 |
| 신규 B-01 | **추가(P2)** | `MobileBottomNav.tsx:29-32` 활성 상태 `text-rose-600`/`bg-rose-500` 직접 사용 — 다크에서 라이트 값 렌더(S-04와 동일 근원, 감사 누락분) |

## 작업 항목 명세

### B-01 (신규): MobileBottomNav 다크 대응 — `widgets/layout/MobileBottomNav.tsx`

활성 `text-rose-600` → `text-sidebar-active-fg`, 도트 `bg-rose-500` → `bg-sidebar-active-fg`. 사이드바와 동일 토큰 계열로 통일. (라이트에서 `--sidebar-active-fg: #95513C` = rose-600과 동일값이라 라이트 시각 변화 없음)

### A-04: 대시보드 개인 KPI 행 — `widgets/dashboard/DashboardOverview.tsx`

- 데스크톱: PageHeader 아래·1행 위에 `sm:kpi-grid` 유사 3칸 KPI 행 추가. 모바일: 캘린더 위 2×?열 스택
- KPI 3종 (모두 기존 데이터, 신규 API 없음):
  1. **계좌** — `accountIds.length` (서버 prop 이미 존재) + sub: 연결 증권사 수
  2. **운영 전략** — `useAllStrategiesQuery` 재사용, `status === 'ACTIVE'` 카운트 + sub: 전체 N개 중
  3. **이번 주 체결** — `useWeeklyTradeSummaryQuery`(캘린더가 이미 페치, 캐시 공유) 매수/매도 건수 합 + sub: 매수 n · 매도 n
- `KpiCard` 재사용: 1번 default, 2번 soft, 3번 default variant. 로딩은 `skeleton` prop
- **총자산 KPI는 제외** — 계좌별 KIS live portfolio 호출 필요(비용·rate limit). 백로그로 이월 명시

### A-07·A-12·A-17·A-25: IconButton 패턴 — `shared/ui/IconButton.tsx` 신설 + 적용 3곳

- `shared/ui/IconButton.tsx`: `size-11`(44px) 히트영역·중앙 아이콘·`aria-label` 필수 prop·`variant: 'ghost' | 'tinted'`. 기존 `RevealableValue.tsx:18-28`의 눈 토글, account_detail 헤더 연필, settings 닉네임 연필에 적용
- RevealableValue는 시각 크기 유지(icon size-4) + 히트영역만 negative margin으로 44px 확보 (`-m-3.5 p-3.5` 패턴) — 레이아웃 시프트 금지
- 모바일 상단 바 아이콘(`app/(main)/layout.tsx:38,43`)은 `size-8` → `size-10`으로 확대 (44px 근사, 헤더 높이 제약 고려)

### A-19: strategy_detail 뒤로가기 위치 — `app/(main)/accounts/[id]/strategies/[sid]/page.tsx` (헤더 렌더 위치 탐색 후)

`MAGX ← 토쓰` → 제목 위 eyebrow 줄에 `← 토쓰` breadcrumb 배치 (PageHeader eyebrow 패턴 재사용). 제목 줄은 `MAGX`만

### A-21(축소): 바로 주문 사유 노출 — `widgets/strategy-detail/StrategyDetail.tsx:245-273`

`isHoliday || hasDeficit`일 때 버튼 옆에 기존 Badge(warn)로 사유 텍스트('휴장일'/'예수금 부족') 표시. 클릭 인터셉트 toast는 유지. 버튼 자체는 `disabled` 속성으로 전환하지 않음(현행 유지)

### A-22: 전략 목록 계좌 그룹핑 — `widgets/all-strategies/AllStrategiesList.tsx`

- `accounts` prop이 이미 있으므로 **계좌별 섹션 그룹 렌더**로 변경: 계좌 nickname + 증권사 배지를 섹션 헤더로, 그 아래 해당 전략 카드 그리드
- 계좌 1개면 섹션 헤더 생략(현행과 동일 외형)
- '더 보기' 페이지네이션은 그룹핑과 충돌 → 제거하고 전체 렌더 (현재 전략 5개 수준, 초대제 SaaS 규모상 문제없음 — 100+ 시 재검토 주석)
- 기존 `AllStrategiesList.test.tsx` 갱신 필수

### A-15: account_detail 잔고 이력 소량 데이터 — `widgets/account-detail/` (해당 테이블 컴포넌트)

행 수 < 3일 때 테이블 아래 남는 공간을 채우지 않도록 컬럼 카드 `h-fit` 적용(현재 stretch 여부 확인 후). 데이터 0행이면 기존 EmptyState 재사용

## 구현 그룹 (Sonnet 병렬, 파일 비중복)

| 그룹 | 항목 | 파일 |
|---|---|---|
| 2-A | A-04 + B-01 | widgets/dashboard/, widgets/layout/MobileBottomNav.tsx |
| 2-B | IconButton 신설 + 적용 | shared/ui/, widgets/revealable-value/, widgets/account-detail/(헤더), features/settings/(닉네임), app/(main)/layout.tsx |
| 2-C | A-19 + A-21 + A-22 + A-15 | strategy-detail·all-strategies·account-detail(테이블)·strategies page |

주의: 2-B와 2-C가 widgets/account-detail을 나눠 만짐 — 2-B는 헤더 연필만, 2-C는 잔고 테이블만 (파일 단위로 겹치면 2-C에 통합)

## 검증

- 그룹별 typecheck + `npm run test:run` (AllStrategiesList.test 갱신 포함)
- 완료 후 dashboard·strategies·account_detail 라이트/다크·모바일/데스크톱 재캡처 판독 (Fable)
