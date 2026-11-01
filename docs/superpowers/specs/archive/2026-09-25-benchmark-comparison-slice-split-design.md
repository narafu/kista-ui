# widgets/benchmark-comparison 슬라이스 분리 설계

배경: `widgets/benchmark-comparison`는 `docs/agents/widgets.md`에 이미 명시돼 있듯 서로 목적이 다른 두 축을 한 위젯에 담고 있다 — "규모 비교 축"(투자 대비 벤치마크 비교: 필터바·비교 차트·요약·안내)과 "5분위 원본 축"(투자 데이터와 무관하게 항상 렌더링되는 5분위 매매평균가 원본 시계열 + 지역 안내). 두 축을 독립 위젯 슬라이스로 분리한다.

## 분리 기준

목적축 기준으로 분리한다(자산유형 ETF/HOUSING 기준 아님 — `BenchmarkFilterBar`·`useBenchmarkFilters`·`HousingBenchmarkChart` 등 비교 축 로직이 두 자산유형에 걸쳐 공용이라 자산유형으로 나누면 경계가 애매해진다).

- 기존 `widgets/benchmark-comparison`: 비교 축만 남긴다.
- 신규 `widgets/housing-quintile-trend`: 5분위 원본 축을 담는다.

## 상태 소유권 — cross-import 없이 해결

새 위젯이 필요로 하는 `from`/`to`(비교 기간)는 `HousingBenchmarkComparison` 내부의 `useBenchmarkFilters` 상태에서 나온다. `app/(main)/stats/benchmark/page.tsx`는 Server Component라 이 상태를 직접 소유할 수 없다.

검토한 대안과 기각 사유:

1. **상태를 app 레이어로 리프팅** — `useBenchmarkFilters`(15개+ state 통합 훅, ETF/HOUSING 탭마다 독립적인 전략선택·period 얽힘)를 쪼개야 해서 회귀 리스크가 크고, `HousingBenchmarkComparison.test.tsx`(730줄) 대부분을 다시 써야 한다. 이 페이지 하나만 쓰는 순수 배관 컴포넌트가 추가로 생겨 재사용 이득도 없다. 기각.
2. **`HousingBenchmarkComparison`이 `housing-quintile-trend`를 직접 import** — diff는 작지만 `widgets.md`의 cross-import 금지 원칙에 대한 예외가 영구적으로 남는다. 기각.
3. **render-prop + app 레이어 client wrapper (채택)** — 상태는 그대로 `HousingBenchmarkComparison`이 소유하되, *합성*만 app 레이어로 옮긴다. app→widgets import는 항상 합법이라 예외가 생기지 않는다.

### 채택안 구조

`HousingBenchmarkComparison`에 prop 하나를 추가한다:

```ts
renderHousingExtras?: (range: { from?: string; to: string }) => ReactNode
```

HOUSING 탭 분기에서 이 함수를 호출한 결과를 그대로 렌더링한다(위젯은 `HousingQuintileTrend`라는 이름도, 그 존재도 모른다 — 순수 콜백).

`app/(main)/stats/benchmark/BenchmarkPageContent.tsx`(신규, `'use client'`)가 두 위젯을 알고 연결한다:

```tsx
'use client'
import { HousingBenchmarkComparison } from '@widgets/benchmark-comparison'
import { HousingQuintileTrend } from '@widgets/housing-quintile-trend'

interface Props {
  enabled: boolean
  defaultTo: string
}

export function BenchmarkPageContent({ enabled, defaultTo }: Props) {
  return (
    <HousingBenchmarkComparison
      enabled={enabled}
      defaultTo={defaultTo}
      renderHousingExtras={({ from, to }) => (
        <HousingQuintileTrend enabled={enabled} from={from} to={to} />
      )}
    />
  )
}
```

`page.tsx`는 Server Component·prefetch·`HydrationBoundary` 구조를 그대로 유지하고, 렌더 대상만 `HousingBenchmarkComparison` → `BenchmarkPageContent`로 바꾼다.

이 패턴은 `docs/agents/widgets.md`가 이미 기록한 "화이트리스트 밖 조합은 app 레이어 slot(ReactNode prop)으로 합성" 원칙의 자연스러운 확장이다 — 자식이 부모 내부 상태(데이터)를 필요로 할 때는 순수 ReactNode 대신 데이터를 받는 콜백을 슬롯으로 쓴다는 변형만 추가된다. 문서에 이 변형을 새 선례로 남긴다(아래 "문서 갱신" 참고).

## 파일 변경 목록

### 신규 슬라이스 `widgets/housing-quintile-trend/`

- `HousingQuintileTrend.tsx` — 신규 컨테이너. 기존 `HousingBenchmarkComparison`이 갖고 있던 `trendRegionName` state + `handleTrendRegionChange`를 그대로 옮겨 소유. `HousingBenchmarkQuintileTrendChart` + `HousingBenchmarkRegionQuintileInfo`를 기존과 동일한 `<div className="flex flex-col gap-4">`로 묶어 렌더.
- `HousingBenchmarkQuintileTrendChart.tsx` + `.test.tsx` — `widgets/benchmark-comparison`에서 그대로 이동. formatter import 경로만 `./housingBenchmarkChartFormatters` → `@entities/stats`로 변경.
- `HousingBenchmarkRegionQuintileInfo.tsx` + `.test.tsx` — 이동. content import 경로만 `./housingBenchmarkContent` → `./housingQuintileContent`로 변경.
- `housingQuintileContent.ts` — 기존 `housingBenchmarkContent.ts`에서 `HOUSING_QUINTILES`, `HousingQuintileContent`, `HousingRegionName`, `HOUSING_QUINTILES_BY_REGION`, `getHousingQuintilesByRegionName`, `NATIONWIDE_QUINTILES`, `CAPITAL_AREA_QUINTILES` 이동. `getHousingQuintilesByRegionName`의 fallback에 쓰이는 기본 지역명은 `@entities/stats`의 `DEFAULT_HOUSING_REGION_NAME`을 import해서 사용(중복 정의하지 않음).
- `index.ts` — `HousingQuintileTrend` export.
- `HousingQuintileTrend.test.tsx` — 신규. 기존엔 이 wiring(차트에서 지역 변경 → 안내 패널 갱신)이 컨테이너 레벨에서 테스트된 적이 없었다(`HousingBenchmarkComparison.test.tsx`는 quintile 컴포넌트를 스텁으로 mock했다). 캡슐화하는 김에 최소 1개 케이스 추가: `HousingBenchmarkQuintileTrendChart`의 `onRegionChange` 콜백이 호출되면 `HousingBenchmarkRegionQuintileInfo`에 전달되는 `regionName`이 갱신되는지 확인.

### `entities/stats` 확장

- `lib/housingBenchmarkChartFormatters.ts` + `.test.ts` — `widgets/benchmark-comparison`에서 이동(변경 없음). 비교 축 3개 컴포넌트(`HousingBenchmarkChart`/`EtfPriceChart`/`HousingPriceIndexChart`)와 신규 슬라이스의 `HousingBenchmarkQuintileTrendChart`가 공용으로 쓰던 파일이라 widget 레벨에 두면 양쪽 다 cross-import가 필요해진다. `entities/finance/lib/aggregate.ts`(여러 자산 위젯이 공유하는 순수 함수) 선례와 동일한 이유로 entities 레이어로 옮긴다.
- `lib/housingRegionDefaults.ts` — `DEFAULT_HOUSING_REGION_CODE`, `DEFAULT_HOUSING_REGION_NAME`(둘 다 `string`) 이동. 서버 기본값과 동일한 도메인 상수라 entities가 맞는 위치다.
- `index.ts`에 위 두 파일의 export 추가.

### `widgets/benchmark-comparison` 변경

- `HousingBenchmarkComparison.tsx`:
  - `HousingBenchmarkQuintileTrendChart`, `HousingBenchmarkRegionQuintileInfo` import 제거
  - `trendRegionName` state, `handleTrendRegionChange` 제거
  - `renderHousingExtras?: (range: { from?: string; to: string }) => ReactNode` prop 추가
  - 기존 HOUSING 탭 블록(191~197줄 근처의 quintile 섹션)을 `{activeAsset === 'HOUSING' ? renderHousingExtras?.({ from, to }) : null}`로 교체(래퍼 div는 새 위젯 내부로 이동했으므로 컨테이너에는 남기지 않는다)
  - `DEFAULT_HOUSING_REGION_CODE`, `DEFAULT_HOUSING_REGION_NAME` import를 `./housingBenchmarkContent` → `@entities/stats`로 변경
- `housingBenchmarkContent.ts`: quintile 관련 export 전부 삭제, ETF 콘텐츠(`ETF_BENCHMARKS`, `EtfBenchmarkContent`, `BenchmarkRiskTier`, `getEtfBenchmarkContent`, `ETF_BENCHMARK_CURRENCY_NOTICE_FALLBACK`)만 남긴다.
- `model/useBenchmarkFilters.ts`: `DEFAULT_HOUSING_REGION_CODE` import 경로를 `../housingBenchmarkContent` → `@entities/stats`로 변경.
- `HousingBenchmarkChart.tsx`, `EtfPriceChart.tsx`, `HousingPriceIndexChart.tsx`: formatter import 경로를 `./housingBenchmarkChartFormatters` → `@entities/stats`로 변경.
- `HousingBenchmarkQuintileTrendChart.tsx`(.test.tsx), `HousingBenchmarkRegionQuintileInfo.tsx`(.test.tsx) — 삭제(새 슬라이스로 이동 완료).
- `HousingBenchmarkComparison.test.tsx`: `./HousingBenchmarkQuintileTrendChart` mock 제거. 410줄 근처 assertion을 `renderHousingExtras` prop에 스텁 함수(`() => <div data-testid="housing-extras-stub" />`)를 넘기고 HOUSING 탭에서 렌더되는지, ETF 탭에서는 호출되지 않는지 확인하는 형태로 교체. 그 외 assertion은 무변경.

### `app/(main)/stats/benchmark/`

- `BenchmarkPageContent.tsx` 신규 (위 코드 참고).
- `page.tsx`: import를 `HousingBenchmarkComparison` → `BenchmarkPageContent`로 교체, JSX 렌더 대상 교체. Server Component·prefetch·`HydrationBoundary` 구조는 무변경.

## 에러 처리 / 엣지 케이스

순수 구조 리팩터라 런타임 동작은 변경하지 않는다. 확인할 엣지 케이스는 다음 두 가지뿐이다(둘 다 회귀 테스트로 커버):

- `renderHousingExtras`가 없을 때(prop 생략) 컨테이너가 크래시하지 않아야 한다 — optional chaining으로 처리.
- ETF 탭에서는 `renderHousingExtras`가 호출되지 않아야 한다(기존에도 HOUSING 탭 전용이었음, 조건 위치 동일하게 유지).

## 테스트 계획

- 이동만 하는 파일(`HousingBenchmarkQuintileTrendChart`, `HousingBenchmarkRegionQuintileInfo`, `housingBenchmarkChartFormatters`)의 기존 테스트는 import 경로만 바꿔 그대로 통과해야 한다 — 회귀 확인용으로 재실행.
- `HousingBenchmarkComparison.test.tsx`: quintile mock 제거 + 1개 assertion 교체만, 나머지 약 700줄은 무변경으로 통과해야 한다.
- `HousingQuintileTrend.test.tsx` 신규: 지역 변경 wiring 1개 케이스 추가(위 파일 변경 목록 참고).
- 최종 검증(로직 확정 후 1회): `npm run typecheck` 전체 + 관련 테스트 파일만 좁혀서(`--run` 대상: 위 변경된 파일들). 전체 스위트는 최종 1회로 충분.
- 실제 렌더링 확인: dev 서버 기동 후 `/stats/benchmark`에서 ETF/HOUSING 탭 전환, 5분위 섹션 표시 및 지역 변경 시 안내 패널 갱신을 Playwright로 1회 확인.

## 문서 갱신

- `docs/agents/widgets.md`: `benchmark-comparison` 항목을 비교 축 전용으로 갱신(quintile 관련 서술 제거). `housing-quintile-trend` 슬라이스 항목 신설. "화이트리스트 밖 조합" 단락에 이번 render-prop 변형(자식이 부모 내부 상태를 필요로 할 때 콜백을 슬롯으로 쓰는 패턴)을 `marketPanels`/`month` 패턴 옆에 새 선례로 추가.

## 커밋 전 검토

로직 이동 + 신규 조합 컴포넌트라 커밋 직전 리뷰어 검수 필수. 파일 이동이 많아 diff 라인 수는 크지만 실질 로직 변경은 `HousingBenchmarkComparison.tsx`의 prop 교체와 `BenchmarkPageContent.tsx` 신규 작성 정도라 `/code-review medium`으로 충분(인증/토큰/쿠키 흐름과 무관, 순수 UI 구조 리팩터).
