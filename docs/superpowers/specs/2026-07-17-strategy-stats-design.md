# 전략 수익 통계 기능 설계

날짜: 2026-07-17
범위: kista-api + kista-ui 양쪽 저장소 (문서는 kista-ui에 보관)

## 목적

사용자가 자신의 분할매매 전략이 실제로 얼마나 수익을 내는지 확인한다. 네 가지 질문에 답한다.

1. **누적 자산 추이** — 투입한 시드 대비 지금까지 얼마나 불었나
2. **사이클 단위 성과** — 사이클마다 실현손익·소요일수가 어땠나 (전략 설정 검증)
3. **전략 유형 간 비교** — INFINITE/PRIVACY/VR 중 어느 전략이 더 벌고 있나
4. **벤치마크 대비** — 시장 지수(SPY/QQQ)에 넣었을 때보다 나은가

정확도는 **근사치 기준**: 기존 `cycle_position` 스냅샷과 `strategy_cycle` 데이터로 계산하고 수수료는 무시한다. 새 수집 파이프라인은 만들지 않는다 (지수 시세 캐시 제외).

## 지표 정의

### ① 누적 자산 추이 (equity curve)

- 날짜별 사용자 전체 사이클 자산 합산: `사이클 자산 = usd_deposit + holdings × closing_price`
  - 소스: `cycle_position` 일별 스냅샷. 하루 여러 건이면 최신 건 사용
- **투입 원금 라인** 병행 표시: 해당 날짜에 활성인 사이클들의 `start_amount` 합
- 한계(허용된 근사): 사이클에 배정되지 않은 계좌 예수금은 미포함 — "전략 운용 자산" 기준임을 UI에 명시

### ② 사이클 성과

- 종료 사이클: `실현손익 = end_amount − start_amount`, `수익률 = 실현손익 / start_amount`, `소요일수 = end_date − start_date`
- 진행 중 사이클: 최신 스냅샷 기준 미실현 평가손익
- **VR recurring 주의**: `recurringAmount` 적립이 사이클 도중 예수금에 더해지면 실현손익이 부풀 수 있다. 롤오버가 새 사이클을 만드는 구조라 사이클 내 적립이 없으면 문제없음 — 구현 시 확인하고 필요하면 적립액을 차감한다

### ③ 전략 유형 비교

타입별(INFINITE/PRIVACY/VR) 종료 사이클 집계:
사이클 수, 승률(수익 사이클 비율), 평균 수익률, 평균 소요일, 누적 실현손익 + 진행 중 미실현 합산

### ④ 벤치마크

- 조회 기간 시작일 기준으로 자산 곡선과 지수(SPY/QQQ 토글)를 **시작점 100으로 정규화**해 오버레이
- KPI: "지수 대비 초과수익"
- 한계(허용된 근사): 기간 중간 신규 시드 투입 시 단순 비교가 왜곡됨 — 원금 라인 병행 표시로 보완

## kista-api 설계

### 신규 엔드포인트 (StatsController, `@AuthenticationPrincipal UUID userId` 스코프)

| 엔드포인트 | 응답 |
|---|---|
| `GET /api/stats/summary` | 총 실현손익·미실현·총 수익률 + 전략 타입별 집계 배열(③) |
| `GET /api/stats/equity-curve?from=&to=&benchmark=SPY\|QQQ` | `points: [{date, totalAsset, principal}]` + `benchmark: [{date, close}]` (raw 값 — 정규화는 프론트) |
| `GET /api/stats/cycles?type=&cursor=` | 사이클 성과 목록(종료+진행 중), `CycleHistoryPageResponse`와 같은 커서 페이지네이션 |

### 지수 시세 저장

- 신규 테이블 `market_index_prices(ticker, trade_date, close)` — `(ticker, trade_date)` UNIQUE
- **Alpaca Market Data API** `/v2/stocks/{symbol}/bars?timeframe=1Day` (무료 IEX 피드), 기존 `AlpacaProperties` API 키 재사용
- 데이터 API 호스트가 `data.alpaca.markets`로 다름 → `AlpacaProperties`에 `dataBaseUrl` 필드 추가
- 갱신: **lazy backfill** — equity-curve 요청 시 DB 누락 구간만 fetch·저장. 별도 스케줄러 없음. Alpaca 장애 시 저장분까지만 반환하고 곡선은 정상 응답

### Hexagonal 배치

```
domain/model/stats/     StatsSummary, StrategyTypeStats, EquityCurve, CyclePerformance (record)
domain/port/in/         UserStatsUseCase
domain/port/out/        IndexPricePort (DB 조회/저장), IndexPriceFeedPort (외부 시세 fetch)
application/service/stats/  StatsService — 소유 계좌 전체 → 사이클·스냅샷 집계
                            @Transactional(readOnly) 기본 + backfill 경로만 쓰기
adapter/out/alpaca/     AlpacaIndexPriceAdapter (IndexPriceFeedPort 구현)
adapter/out/persistence/marketindex/  Entity + JpaRepository + PersistenceAdapter 3종
adapter/in/web/         StatsController + 전용 Response DTO (from() 팩토리)
```

- 집계는 서비스 레이어 계산 (사용자당 사이클 수십~수백 규모 — 네이티브 쿼리 최적화는 필요해질 때)
- **날짜 처리**: `cycle_position.created_at`은 UTC, `strategy_cycle.start_date/end_date`는 KST. 기존 `TradeDateConverter` 정책(UTC 거래일 → KST +1일)으로 곡선 날짜 축을 KST 거래일로 통일. Alpaca bars의 미국 거래일도 같은 규칙으로 변환해 곡선·지수 날짜를 일치시킨다

## kista-ui 설계

### 라우팅 · 페이지

- `app/(main)/stats/page.tsx` — Server Component에서 `getAuthToken()` → `apiFetch`로 summary + equity-curve(기본 3개월) 병렬 페칭 (`Promise.all` + 각 항목 `.catch(() => null)`), 위젯에 `initialData` 전달
- `DesktopSidebar`에 "통계" 네비 항목 추가. `MobileBottomNav`는 항목 수 보고 구현 시 판단

### FSD 슬라이스

```
entities/stats/          # /fsd-scaffold entities stats
  api/index.ts           getStatsSummary, getEquityCurve, getCyclePerformances (Route Handler 경유)
  model/types.ts         StatsSummary, EquityCurvePoint, CyclePerformance ...
  hooks/                 useStatsSummaryQuery, useEquityCurveQuery(from, to, benchmark, initialData)
                         queryKey: ['statsSummary'], ['equityCurve', from, to, benchmark], ['statsCycles', type]
widgets/stats-overview/
  StatsKpiRow            kpi-card 재사용 — 총 실현손익·미실현·총 수익률·초과수익
  EquityCurveChart       recharts 라인차트 (FearGreedTrend 패턴) — 자산·원금·지수(정규화) 3선,
                         기간 프리셋(1M/3M/6M/1Y/전체) + SPY/QQQ 토글 (클라이언트 상태 → queryKey 변경)
  StrategyTypeComparison 타입별 집계 테이블
  CyclePerformanceList   커서 무한스크롤 (cycle-history 위젯 패턴 재사용)
```

- 정규화(시작점 100)는 프론트 순수 함수 + 단위 테스트
- 차트 구현 시 dataviz 스킬 로드 (팔레트·다크모드)

### 에러 · 엣지 케이스

- 신규 사용자(데이터 없음): "아직 기록된 사이클이 없습니다" empty state — `DashboardEmpty` 패턴
- 벤치마크 결손(Alpaca 장애): 자산·원금 선만 표시 + 안내 문구
- summary/curve 중 하나만 실패 시 페이지는 뜨고 실패 섹션만 `error-display`

## 테스트

- kista-api: `StatsService` 집계 단위 테스트(승률·수익률·VR recurring 케이스), `AlpacaIndexPriceAdapter` 어댑터 테스트, 컨트롤러 슬라이스 테스트
- kista-ui: 정규화 함수·hooks Vitest, 위젯 렌더 테스트(empty/정상/벤치마크 결손), `npm run typecheck`, Playwright 스크린샷으로 실제 렌더 확인

## 구현 순서 (개요)

1. kista-api: 지수 시세 (테이블·어댑터·backfill) → stats 도메인·서비스 → 컨트롤러·DTO
2. kista-ui: `npm run fetch:spec && npm run gen:types` → entities/stats → widgets/stats-overview → 페이지·네비
3. 검증: 양쪽 테스트 + typecheck + Playwright 스크린샷
