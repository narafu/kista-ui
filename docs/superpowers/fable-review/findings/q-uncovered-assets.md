# Q. 지침서 01~09 미포함 영역 측정 (차트·스타일·scripts·e2e·설정·public)

측정 기준: 2026-11-13, main 1487ea9f 워킹트리(clean). 판단 없음, 숫자·file:line만. "미확인"은 확인 못 한 것.

## 1. 차트

### 1-1. 라이브러리
| 라이브러리 | 사용 파일 수 | 줄 수 합 | 비고 |
|---|---|---|---|
| recharts ^3.8.1 | 제품 12 | 1,819 | PieChart/Pie/Cell(게이지 1), LineChart(8), AreaChart·ComposedChart류(AssetTrend·Composition·Privacy) |
| lightweight-charts ^5.2.0 | 1 (`widgets/dashboard/MarketChartCardInner.tsx`) | 279 | 캔들+MA 4선+RSI. 유일한 캔들 차트 |
| d3 | 0 | 0 | 미사용 |
| 직접 SVG/canvas | 차트용 0 (`<svg`는 login·SettingsPageContent·Spinner 등 비차트). 게이지도 recharts Pie | - | 같은 종류에 라이브러리/직접 혼용 없음 |
- recharts 파일 12개 전부 파일 상단에 `// eslint-disable-next-line react-doctor/prefer-dynamic-import` 1줄씩(12건: HousingBenchmarkChart:6, EtfPriceChart:6, HousingPriceIndexChart:6, AssetCompositionInner:6, FinanceTrendInner:7, PrivacyBaseChartInner:9, HousingBenchmarkQuintileTrendChart:6, IndicatorLineChart:3, AssetTrendInner:7, FearGreedTrend:4, FearGreedGauge:1, EquityLineChart:3).

### 1-2. 차트 컴포넌트 전수표 (소비처 = 해당 파일 외 비테스트 import 파일)
| 파일 | 줄 | 종류 | 라이브러리 | 소비처 | 형제 테스트(줄) |
|---|---|---|---|---|---|
| widgets/admin-privacy-trade-list/PrivacyBaseChartInner.tsx | 405 | 선+영역+기준선 3패널 | recharts | 1 (PrivacyBaseChart) | 없음(AdminPrivacyBaseTable.test 308 간접, model/privacyChartSeries.test 170) |
| ↳ PrivacyBaseChart.tsx(래퍼) 138 / privacyChartParts.tsx(범례) 100 | | | | 1 / 1 | - |
| widgets/asset-trend/AssetTrendInner.tsx | 214 | 선(+영역) | recharts | 1 (AssetTrend) + Privacy·FinanceTrendInner가 import | AssetTrend.test 127 |
| widgets/housing-quintile-trend/HousingBenchmarkQuintileTrendChart.tsx | 200 | 선 5계열 | recharts | 1 | 201 |
| widgets/asset-composition/AssetCompositionInner.tsx | 193 | 막대(적층)/영역 | recharts | 1 | AssetComposition.test 114 |
| widgets/finance-trend/FinanceTrendInner.tsx | 127 | 막대/선 | recharts | 1 | 없음 |
| widgets/benchmark-comparison/HousingBenchmarkChart.tsx | 125 | 선 2계열 | recharts | 1 (BenchmarkResult) | HousingBenchmarkComparison.test 784(공유) |
| widgets/benchmark-comparison/HousingPriceIndexChart.tsx | 118 | 선 | recharts | 1 | 위와 공유 |
| widgets/benchmark-comparison/EtfPriceChart.tsx | 117 | 선 | recharts | 1 | 위와 공유 |
| shared/ui/EquityLineChart.tsx | 101 | 선 | recharts | 1 (EquityCurveChart) | 19 |
| widgets/stats-overview/EquityCurveChart.tsx | 67 | 래퍼 | - | 4 | 없음 |
| widgets/fear-greed-card/FearGreedTrend.tsx | 85 | 선(스파크라인류) | recharts | 1 (FearGreedCardInner) | 없음 |
| widgets/fear-greed-card/FearGreedGauge.tsx | 77 | 반원 게이지 | recharts Pie | 1 | 29 |
| widgets/crypto-market-indicators/IndicatorLineChart.tsx | 57 | 선 | recharts | 1 (CryptoIndicatorCards) | 없음(niceTicks.test 28) |
| widgets/dashboard/MarketChartCardInner.tsx | 279 | 캔들+MA+RSI | lightweight-charts | 1 (MarketChartCard) | 197 |
- 지연 로딩 래퍼(06 담당, 줄만): AssetTrend 39, AssetComposition 39, FinanceTrend 62, FearGreedCard 36, MarketChartCard 26.
- 소비처 1곳 아닌 것: EquityCurveChart 4, AssetTrendInner 3(자기 래퍼 + FinanceTrendInner + PrivacyBaseChartInner가 import — 차트끼리 import).

### 1-3. 평행 구조 (recharts 11파일, 게이지 제외)
| 덩어리 | 반복 횟수(파일 수) | 위치 |
|---|---|---|
| `<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />` 동일 1줄 | 10 | HousingBenchmarkChart:66, HousingPriceIndexChart:77, EtfPriceChart:76, AssetCompositionInner:90, FinanceTrendInner:75, IndicatorLineChart:39, AssetTrendInner:160, FearGreedTrend:63, HousingBenchmarkQuintileTrendChart:154, EquityLineChart:71 |
| `<ResponsiveContainer width="100%" height="100%">` | 12 (11파일; Privacy 3회) | HousingBenchmarkChart:64, EtfPriceChart:74, HousingPriceIndexChart:75, AssetCompositionInner:88, FinanceTrendInner:73, PrivacyBaseChartInner:313/349/373, HousingBenchmarkQuintileTrendChart:152, IndicatorLineChart:37, AssetTrendInner:158, EquityLineChart:69 |
| `tickLine={false} axisLine={false}` (XAxis·YAxis 각각) | 24줄 / 12파일 | 위 목록과 동일 파일들 + FearGreedTrend:64-65 |
| `minTickGap` | 11 | 위와 동일 |
| `margin={{...}}` 리터럴 | 10 | HousingBenchmarkChart:65, EtfPriceChart:75, HousingPriceIndexChart:76, AssetCompositionInner:89, FinanceTrendInner:74, IndicatorLineChart:38, AssetTrendInner:159, FearGreedTrend:51, HousingBenchmarkQuintileTrendChart:153, EquityLineChart:70 |
| `domain={['auto','auto']}` | 8 | HousingBenchmarkChart:80, HousingPriceIndexChart:91, EtfPriceChart:91, FinanceTrendInner:77, PrivacyBaseChartInner:317, HousingBenchmarkQuintileTrendChart:169, AssetTrendInner:162, EquityLineChart:85 |
| `accessibilityLayer` | 6 | HousingBenchmarkChart:65, EtfPriceChart:75, HousingPriceIndexChart:76, HousingBenchmarkQuintileTrendChart:153, EquityLineChart:17, FearGreedGauge:8 (나머지 6차트는 없음) |
| `min-h-[240px]` 래퍼 클래스 | 9줄 / 7파일 | HousingBenchmarkChart:61, EtfPriceChart:71, HousingPriceIndexChart:72, FinanceTrend:12, FinanceTrendInner:48·72, HousingBenchmarkQuintileTrendChart:151, AssetTrendInner:157, AssetTrend:12 |
| `<Tooltip ... contentStyle={TOOLTIP_CONTENT_STYLE}>` | 9 (10파일 import, Privacy·AssetTrend는 커스텀 content) | |
| 로딩/에러/빈상태 삼항 (`isLoading ? Skeleton : isError ? SectionError : empty ? EmptyState : chart`) + 카드 헤더 | benchmark-comparison 3파일(HousingBenchmarkChart 125 / EtfPriceChart 117 / HousingPriceIndexChart 118)이 동일 골격 — EtfPriceChart↔HousingPriceIndexChart `diff` 변경 줄 59(양쪽 합), 차트 본체(`<ResponsiveContainer>`~`</ResponsiveContainer>`)는 각 ~25줄 | |
- 공용 프리미티브: `shared/lib/chart/axisTick.ts`(2줄, `AXIS_TICK` — 소비처 12파일 import), `shared/lib/chart/tooltip.ts`(9줄, `TOOLTIP_CONTENT_STYLE` — 소비처 9파일). **축·그리드·ResponsiveContainer·범례·빈 데이터·카드 래퍼를 묶은 공용 차트 컴포넌트는 없음**. 상수 2개만 공용. 툴팁 아이템 색 규칙은 `app/globals.css`의 `.recharts-tooltip-item`(CSS 쪽 보정).
- Legend: 3파일만 사용(AssetTrendInner:168 `wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }}`, IndicatorLineChart:50 동일 리터럴, FinanceTrendInner 1, Privacy 1). 같은 `wrapperStyle` 리터럴 2회 반복.
- 범례를 Legend 대신 직접 만든 곳: privacyChartParts.tsx(100줄, 범례 칩 클래스 맵 file:30-45), HousingBenchmarkQuintileTrendChart(계열 배열 :46-50).
- 반응형 크기: 고정 높이 클래스(`h-[240px] sm:h-[320px]` 등) + ResponsiveContainer. ResizeObserver 직접 사용은 차트에 0(lightweight-charts 쪽은 MarketChartCardInner 내부 — 아래 참고).
- 다크 대응: recharts 11파일 전부 `var(--muted-foreground/--card/--border/--chart-n)` 토큰 경유, `dark:`/`useTheme` 0건. lightweight-charts만 `getComputedStyle`로 CSS 변수 값을 읽어 `toRgba`로 변환(MarketChartCardInner.tsx:44-74, 읽는 변수: --background/--foreground/--muted-foreground/--border/--pos/--neg/--asset-series-3·5·6/rsi) — 테마 전환 대응 방식이 recharts(CSS 변수 직참조)와 다름.
- 색: 차트 코드 내 hex 리터럴 0건. `rgb(` 직접값은 2건(툴팁 그림자: AssetTrendInner.tsx:42 `shadow-[0_4px_12px_rgb(0_0_0/0.12)]`, FinanceTrendInner.tsx:89 `boxShadow: '0 4px 12px rgb(0 0 0 / 0.12)'` — 같은 그림자 값 2곳), 색은 전부 `var(--…)`. 차트 팔레트 토큰: `--chart-1..`, `--asset-series-*`, `--quintile-1..5`, `--pos/--neg/--info/--warn/--avg-gap-*`. 차트 파일 내 `var(--` 83줄.
- 차트용 순수 로직: `widgets/crypto-market-indicators/niceTicks.ts`(38줄, 소비처 2: IndicatorLineChart:8, CryptoIndicatorCards:12; 테스트 28줄), `widgets/dashboard/marketChartCategories.ts`(64), `widgets/admin-privacy-trade-list/model/privacyChartSeries.ts`(+test 170), `widgets/fear-greed-card/fearGreedZones.ts`(zoneOf), `entities/stats/lib/housingBenchmarkChartFormatters.ts`(+test), `widgets/stats-overview/lib/normalizeEquityCurve.ts`(+test 30). niceTicks는 한 위젯 폴더 안에 있고 다른 recharts 차트는 recharts 자동 눈금을 씀.
- 직접 SVG vs 라이브러리 혼합: 같은 종류(선 차트) 11개 전부 recharts, 혼합 없음. 선 차트 중 FearGreedTrend는 커스텀 dot 등 SVG 요소만 recharts 안에서 사용.

(1-추가) 차트 색 하드코딩: 차트 파일 내 hex 0건이나 `widgets/fear-greed-card/fearGreedZones.ts`에 hex 문자열 5건(게이지·트렌드 구간색, FearGreedGauge/FearGreedTrend가 `zoneOf().color` 사용). 그 외 차트 색은 CSS 토큰(`--chart-*`, `--asset-series-*`, `--quintile-*`, `--pos/--neg`). 반면 `--chart-3`·`--chart-5`는 차트가 안 씀(아래 2-3). `ThemeCards.tsx` hex 7건은 차트 아님.

## 2. 스타일·토큰

### 2-1. css 파일
- css 파일은 `app/globals.css` 1개뿐 (588줄). 다른 css 0.
- 구획(줄 범위 → 줄 수): `@import`·`@source`·`@custom-variant` 1-8 (8) / `@theme inline` 10-82 (≈73줄, 선언 68개) / `:root` 토큰 83-213 (≈131줄, 선언 86개) / `.dark` 오버라이드 214-307 (≈94줄, 선언 75개) / `@layer base` 309-336 (28) / 유틸·컴포넌트 클래스(`.num .display .reveal-stagger .text-pos…` + 반응형 그리드 + 모바일 텍스트 스케일) 337-406 (≈70) / 에러 페이지 키프레임·클래스 407-502 (≈96, keyframes 2: errorFadeUp·errorDotBlink + revealUp 별도) / `.glass-card`·`.rejected-reason-card`·`.brand-radial-*` 503-547 (≈45) / 벤더 보정: `img[data-nimg]` 8줄 548-563, sonner `:root [data-sonner-toaster]` 565-570, `.recharts-tooltip-item` 576-588 (≈41). `@keyframes` 총 3.
- 로딩: Pretendard는 `app/globals.css:1`에서 jsdelivr CDN `@import url(...)`(외부 요청, dynamic-subset). Bricolage Grotesque는 `next/font/google`(`app/layout.tsx:3,9`, 변수 `--font-bricolage`, `.display` 클래스), Geist Mono는 `geist/font/mono`(`app/layout.tsx:2`, `--font-mono`). 아이콘: lucide-react 단일(66파일 import, 64회 named import 라인 + 5회 쌍따옴표형, components/ui 포함), 다른 아이콘 라이브러리 0. `@theme inline`의 `--font-sans: var(--font-sans)`(globals.css:13, 자기 참조 형태) 와 `:root`의 `--font-sans: 'Pretendard Variable'…`(:198)가 따로 있음.

### 2-2. CSS 변수 전수 (157개 고유 이름)
- 구성: `@theme`의 `--color-*` 별칭 58개 + 그 외 99개(shadcn 표준 이름 32 + 자체 67).
- 값이 같은 변수 쌍(`:root` 기준 15묶음, `.dark` 기준 11묶음). 대표: `--accent`=`--rose-50`=`--selection-bg`(#FCEFE8), `--primary`=`--rose-500`=`--sidebar-primary`=`--brand-fg-soft`(#A35A43), `--accent-foreground`=`--rose-600`=`--sidebar-accent-foreground`=`--sidebar-active-fg`(#95513C), `--foreground`=`--card-foreground`=`--popover-foreground`=`--secondary-foreground`, `--ring`=`--sidebar-ring`, `--sidebar`=`--sidebar-bg`, `--sidebar-foreground`=`--sidebar-fg`, `--chart-1`=`--asset-series-1`=`--selection-border`(#B66951), `--border`=`--input`=`--sidebar-border`, `--secondary`=`--muted`. 다크: `--primary`=`--ring`=`--sidebar-primary`=`--sidebar-ring`=`--selection-hover-border`, `--chart-1`=`--sidebar-accent-foreground`=`--sidebar-active-fg`=`--brand-fg-soft`=`--selection-border`=`--rose-600`=`--rose-700`.
- 체계 병존: **shadcn 표준 32개**(--background…--ring, --chart-1~5, --radius, --sidebar-* 8개) + **자체 67개**(`--rose-*` 9, `--pos/--neg/--warn/--info/--status-*/--gold/--admin-*/--brand-*/--selection-*/--asset-series-*/--quintile-*/--avg-gap-*/--r-*/--sh-*/--font-*` 등). 의미가 겹치는 쌍: `--sidebar` / `--sidebar-bg`, `--sidebar-foreground` / `--sidebar-fg`, `--sidebar-accent` / `--sidebar-active-bg`, `--sidebar-accent-foreground` / `--sidebar-active-fg`, `--destructive` / `--status-error`, `--primary` / `--brand-fg-soft`, `--radius` · `--radius-*` / `--r-sm·md·lg·xl`, `--chart-1` / `--asset-series-1`. 사용 횟수(tsx·ts, components 포함, 클래스+`var()` 합): shadcn 표준 이름 ≈1,187(bg-card/text-muted-foreground 등 797 포함) vs 자체 이름 ≈510. 세부: `bg|text|border-primary` 24, `-destructive` 69 vs `var(--status-error)` 계열 `status-*` 88, `brand*` 88(`var(--brand…)` 40), `pos/neg` 클래스 34+var 20, `warn/info/status-ok` 클래스 40+var 65, 날것 팔레트(`bg-red-500` 류) 32, `bg-white/black` 8.
- **코드에서 참조 0인 변수**(css+ts/tsx, `@theme` 별칭 경유 클래스 사용 포함 판정):
  - 확정 미참조 25(변수 12 + `@theme` 별칭 13): `--rose-800`, `--sh-pop`, `--sidebar-fg`, `--chart-3`, `--chart-5`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring` (12) + `@theme` 별칭 중 클래스·직접 참조 0인 13개(`--color-sidebar-ring/-border/-accent-foreground/-accent/-primary-foreground/-primary/-foreground`, `--color-chart-2/3/4/5`, `--color-rose-100`, `--color-brand-fg-soft`). (`--sidebar-*` shadcn 8개: components/ui에 sidebar 컴포넌트 없음 — 파일 목록은 2-5 참조.)
  - 애매(유틸리티·외부 라이브러리가 읽음): `--font-heading`(`font-heading` 클래스로 card.tsx:41·alert-dialog.tsx:104 사용), `--radius-sm·lg·xl·2xl·3xl·4xl`(`rounded-*` 유틸로 노출 — 사용 클래스 수 미집계), `--error-text·--warning-text·--info-text·--success-text`(sonner 라이브러리가 읽는 변수, globals.css:565-570).
  - 직접 `var()` 0이고 `@theme` 별칭 클래스로만 쓰이는 13개: `--card-foreground`·`--primary-foreground`·`--secondary-foreground`·`--accent`·`--accent-foreground`·`--destructive`·`--input`·`--ring`·`--sidebar`·`--sidebar-bg`·`--sidebar-active-bg`·`--sidebar-active-fg`·`--admin-fg` (정상 사용, 미사용 아님).
  - 참조 1회뿐: `--quintile-2~5`, `--asset-series-2`, `--avg-gap-1`, `--selection-border/-bg/-halo`, `--r-xl`.
- 판정 방법: `scripts`로 python 집계(git ls-files의 ts/tsx/css/mjs/js, docs 제외; `--name` 토큰 경계 매칭 + `@theme` 별칭의 `(접두)-name` 클래스 매칭).

### 2-3. Tailwind 임의값 (app·entities·features·widgets·shared·components, 비테스트 포함 .ts/.tsx)
- `[...]` 임의값 유틸리티 총 667건. 패턴별: `text-[` 102 · `rounded-[` 128 · `h-[` 67 · `bg-[` 48 · `min/max-w/h-[` 55 · `p/m/gap-[` 59 · `border-[` 30 · `shadow-[` 22 · `w-[` 19 · `grid-cols-[` 9.
- 상위 반복 20: `rounded-[var(--r-lg)]` 50 · `text-[var(--status-error)]` 31 · `rounded-[var(--r-sm)]` 28 · `rounded-[var(--r-md)]` 24 · `py-[18px]` 20 · `text-[var(--brand-fg-soft)]` 19 · `text-[var(--warn)]` 16 · `font-[800]` 16 · `min-h-[240px]` 15 · `shadow-[var(--sh-card)]` 9 · `rounded-[10px]` 9 · `min-h-[224px]` 9 · `h-[240px]` 9 · `bg-[var(--brand-fg-soft)]` 9 · `px-[14px]` 8 · `h-[22px]` 8 · `h-[280px]` 7 · `border-[var(--warn)]` 7 · `bg-[var(--warn-bg)]` 7 · `text-[var(--status-ok)]` 6 (`min-h-[280px]` 6, `transition-[border-color,box-shadow]` 6).
- `-[var(--x)]` 형태 합계 282건(비테스트 ts/tsx).
- 토큰이 `@theme`에 노출돼 있는데 `[var(--…)]`로 쓰는 경우: `--status-error`(31건; `@theme`에 `--color-status-error`:68 존재), `--warn`(16건; `--color-warn`:70 존재), `--brand-fg-soft`(19+9건; `--color-brand-fg-soft`:73 존재하나 `text-brand-fg-soft` 클래스 사용 0), `--r-*`(102건, `@theme`에 `--r-*` 미노출 → `rounded-[var(--r-*)]` 외 방법 없음).

### 2-4. 커스텀 유틸리티·클래스 (globals.css 최상위, `@utility`/`@layer components` 0건 — 전부 레이어 밖 평문 클래스)
- 사용처 0곳 (비테스트 .ts/.tsx grep): `.sm:kpi-grid`, `.sm:portfolio-grid`, `.md:profit-grid`, `.lg:form-grid`, `.lg:settings-grid` (globals.css:381-385 + 반응형 :387-398 ≈ 19줄), `.text-pos-bg`, `.text-neg-bg`(globals.css:371-372).
- 사용처 1곳: `.bg-pos-bg`, `.bg-neg-bg`, `.brand-radial-bg`, `.error-code-num`, `.error-page-bg`, `.error-path-trace`(ErrorDisplay.tsx:102), `.error-status-line`, `.error-status-line-sep`, `.error-status-line-time`, `.rejected-reason-card`, `.recharts-tooltip-item`(vendor).
- 사용처 2~8: `.error-pulse-dot` 2, `.bg-status-ok-bg` 3, `.glass-card` 4, `.bg-warn-bg` 5, `.text-status-ok` 6, `.reveal-stagger` 8, `.text-neg` 8, `.text-pos` 10. 10+: `.num` 15, `.display` 17, `.text-warn` 18.
- 에러 페이지 전용 클래스 ≈ 96줄(407-502)이 `widgets/error-display/ErrorDisplay.tsx` 1파일(+`app/global-error.tsx` 인라인)을 위해 존재.

### 2-5. 인라인 `style={{` — 비테스트 .tsx 58건 / 32개 파일 중 상위: rejected/page.tsx 6, global-error.tsx 5, ThemeCards.tsx 4, pending/page.tsx 4, ErrorDisplay 3, DashboardEmpty 3, AccountCard 3, EquityLineChart 3, login/page.tsx 3
- 분류(근사, 줄 단위): 토큰값 리터럴(`'var(--…)'` 포함) 19 / 이미지 크기 px(`height: 56, width: 56` 류) 4 / 계산값(`width: \`${pct}%\``·`transform: rotate`·`paddingTop`·`maxWidth`) 6 / 여러 줄 `style={{`(내용 별도, ApprovalNotice:13·login/page:62·global-error:26·42 등) 4 / 그 외 런타임 색(`backgroundColor: item.color`·`borderColor: strategyStatusAccent(...)`·`color: textColor` 등 변수·함수 반환값) 25.
- 토큰값 인라인은 `className="text-[var(--x)]"`로 쓰는 곳도 같은 파일에 공존(예: app/rejected/page.tsx은 style, 대부분은 클래스).

### 2-6. `components/ui/**` (shadcn base-nova, Base UI; `components.json` style=base-nova, baseColor=neutral, iconLibrary=lucide)
| 파일 | 줄 | 외부 소비처 파일 | 테스트 참조 | 생성 후 손수정 흔적 |
|---|---|---|---|---|
| alert-dialog | 168 | 14 | 2 | 커밋 4회 |
| button (+button-variants.ts 53줄) | 22 | 52 | 1 | variants 커스텀 `size: form(h-12)·cta(h-8)`(button-variants.ts:43,45), 커밋 4회 |
| card | 78 | 28 | 1 | 커밋 2회 |
| checkbox | 31 | 4 | 0 | **주석으로 명시**(checkbox.tsx:8-9 "shadcn 생성본에서 고친 점: …") |
| dialog | 153 | 3 | 0 | 닫기 `sr-only` 한글(dialog.tsx:71), 커밋 4회 |
| input | 20 | 28 | 1 | 커밋 2회 |
| label | 20 | 17 | 0 | - |
| pagination | 130 | **1** (shared/ui/PaginationBar만) | 0 | - |
| popover | 54 | 5 | 0 | 커밋 3회 |
| radio-group | 40 | 3 | 0 | **주석 명시**(radio-group.tsx:18-19) |
| select | 185 | 24 | 0 | 커밋 5회 |
| skeleton | 13 | 35 | 0 | - |
| sonner | 49 | **1** (Toaster 마운트) | 0 | globals.css sonner 보정 별도 |
| switch | 34 | 9 | 0 | **주석 명시**(switch.tsx:7-8, "Checkbox와 같은 문법으로") |
- 파일 14개 + `button-variants.ts`, 합계 1,068줄(button-variants 포함 시). 소비처 0곳인 파일 없음, 1곳: pagination·sonner. 소비처 3~5곳: dialog 3, radio-group 3, checkbox 4, popover 5.
- 같은 역할 `shared/ui` 래퍼 쌍: `PaginationBar`↔pagination(1:1 래핑), `FormDialog`↔dialog, `ConfirmDeleteDialog`↔alert-dialog, `IconButton`·`FormActions`↔button, `SegmentedTabs/SegmentedToggle/SectionTabBar`(ui에 tabs 없음), `Surface`↔card(06 소관), 스켈레톤 3종(`CardSkeleton`/`AdminTableSkeleton`/`LoadingRow`)↔skeleton(06 소관). shared/ui는 51개 항목(.test·form/ 포함).

## 3. scripts/

| 파일 | 줄 | 하는 일 | 호출처 | 의존성 | 최근 커밋 / 커밋수 | 테스트 |
|---|---|---|---|---|---|---|
| a11y-check/run.mjs | 307 | axe(PC·모바일×라이트·다크)·포커스 링·다이얼로그 포커스 점검, 위반 시 exit 1 | package.json `a11y-check`, docs/agents/a11y.md·commands.md | @playwright/test, node:*, axe-core(eslint-plugin-jsx-a11y 전이 의존성, run.mjs:11 주석), ../shared/seed.mjs | 2026-11-12 / 10 | 없음 |
| a11y-check/README.md | 44 | 위 사용법 | - | - | 2026-11-12 / 13 | - |
| fetch-spec.mjs | 42 | :8080·:8081 OpenAPI를 openapi.json 하나로 병합(02 소관) | package.json `fetch:spec` | node:fs | 2026-10-02 / 2 | 없음 |
| shared/seed.mjs | 94 | dev 시드 계좌·전략 ID 기본값 + 로컬 API 조회로 덮음 | a11y-check/run.mjs:9, visual-diff/{run.mjs:14, scenarios.mjs:4, fixtures/trading.mjs:3}, **e2e/strategy.spec.ts:34·53·69** | node:fs | 2026-11-10 / 7 | 없음 |
| visual-diff/run.mjs | 237 | 두 커밋 next dev 기동·프록시·fixture·촬영 오케스트레이션 | package.json `visual-diff`, docs/agents/commands.md | spawn/execFileSync(git·npm), proxy/fixtures/scenarios/shoot/seed | 2026-10-24 / 7 | 없음 |
| visual-diff/shoot.mjs | 90 | 시나리오별 head/base 촬영·픽셀 비교 | run.mjs:15 | @playwright/test, sharp(next 전이 의존성, shoot.mjs:4 주석) | 2026-11-08 / 5 | 없음 |
| visual-diff/scenarios.mjs | 123 | 48개 시나리오 정의(`name`·`path`) | run.mjs:13 | ../shared/seed.mjs | 2026-11-08 / 14 | 없음 |
| visual-diff/fixtures/api.mjs | 77 | :8080 fixture(privacyBases 등) | run.mjs:11 | - | 2026-10-24 / 6 | 없음 |
| visual-diff/fixtures/trading.mjs | 116 | :8081 fixture(preview 분기 모드) | run.mjs:12 | ../../shared/seed.mjs | 2026-11-10 / 12 | 없음 |
| visual-diff/proxy.mjs | 66 | GET/HEAD만 통과하는 읽기 전용 프록시 | run.mjs:10 | node:http | 2026-10-18 / 4 | 없음 |
| visual-diff/sheet.mjs | 78 | 결과 스크린샷 비교 시트(09 소관) | 호출처 0(knip.json:8 entry 예외) | sharp | 2026-10-03 / 1 | 없음 |
| visual-diff/README.md | 76 | 사용법 | - | - | 2026-10-25 / 16 | - |
- 합계: 코드 10파일 1,230줄 + README 2파일 120줄 = 1,350줄. `scripts/` 테스트 0개(vitest `exclude`에 scripts 없음 — `scripts/**/*.test.*` 자체가 없음).
- 호출처 없는 스크립트: `visual-diff/sheet.mjs` 1건(문서 참조·package.json 없음, README에는 언급). workflow(`.github/workflows`)·`deploy/`에서 scripts 호출 0건.
- 겹치는 준비 코드(같은 일을 몇 곳에서 반복):
  - 브라우저 기동 `chromium.launch()`: a11y-check/run.mjs:265, visual-diff/shoot.mjs:62 (2곳). e2e는 Playwright 러너(config)가 맡아 별개.
  - 컨텍스트 옵션(`locale:'ko-KR', timezoneId:'Asia/Seoul', reducedMotion:'reduce'` + viewport): a11y-check/run.mjs:75 / shoot.mjs:14 (2곳, 같은 옵션).
  - `VIEWPORTS = { pc:{1440×900}, mo:{390×844} }` 동일 리터럴: a11y-check/run.mjs:14 / shoot.mjs:7 (2곳). `SETTLE_MS` 상수는 각자(2500 vs 4000).
  - dev 토큰 발급 `POST {8080}/api/auth/{dev-token|dev-admin-token}`: a11y-check/run.mjs:66 `devToken()`, visual-diff/run.mjs:144 `devToken()`, shared/seed.mjs:32(인라인), e2e/global.setup.ts:34-41(`dev-token·dev-e2e-token·dev-admin-token`) — **4곳**.
  - `kista-token` 쿠키 주입: a11y-check/run.mjs:76, shoot.mjs:15-17, e2e/global.setup.ts:13 (3곳).
  - `http://localhost:8080` / `:8081` 리터럴: a11y-check/run.mjs:13, fetch-spec.mjs:7, shared/seed.mjs:32·34, playwright.config.ts:8-9, e2e/global.setup.ts:4-5, visual-diff/run.mjs(UPSTREAM 상수) — 7곳.
  - 쓰기 차단(GET/HEAD 외 abort/403): a11y-check/run.mjs:77 `ctx.route`와 visual-diff/proxy.mjs 각자 구현(방식 다름: 브라우저 레벨 abort vs 프록시 403).
- 앱과 어긋날 수 있는 사본:
  - a11y-check `PAGES`(run.mjs:26-35) 라우트 손으로 나열: guest 2 / user 18 / admin 8 = 28개, + `DIALOG_PAGES`(:37-40) 12, `FORM_DIALOGS`(:44) 2. 앱 라우트(`page.tsx`) 35개. 목록에 없는 앱 라우트(대조 결과): `/strategies`, `/pending`, `/rejected`, `/finance/new`, `/finance/[id]/edit`, `/finance/budgets/[type]`, `/finance/bulk-register`, `/accounts/[id]/strategies/[sid]/edit`, `/accounts/[id]/strategies/[sid]/reconfigure-vr`. 앱 라우트에서 자동 생성되지 않음.
  - visual-diff scenarios.mjs: 48개 시나리오 경로 손으로 나열(`path:` 48개), 시드 ID 하드코딩(shared/seed.mjs:6-11의 UUID 5개 + scenarios 내 `00000000-0000-4000-8000-0000000c0171` 류 fixture ID).
  - `shared/seed.mjs`의 UUID 5개는 "kista-api scripts/dev-seed/seed.sh"에서 만든 값의 사본(주석 명시, seed.mjs:1-2) — 로컬 API 조회로 덮지만 조회 실패 시 기본값 사용.
  - 계정 정보: 토큰은 dev 엔드포인트 호출로 얻고 계정 정보 자체의 사본은 없음(위 UUID 제외).

## 4. e2e

- 위치 2곳: `e2e/`(spec 5 + setup 1)와 `tests/e2e/`(spec 1 + support 2). 별도 vitest `tests/account-cache-fixture.test.ts`(129줄)가 `tests/e2e/support`를 검증. `testing/`(mockApi 104·renderApp 30·mockApi.test 53)은 vitest용 헬퍼.
- `playwright.config.ts` (53줄): projects 3 = `setup`(e2e/global.setup.ts) → `account-cache`(tests/e2e/account-cache-consistency.spec.ts, fullyParallel false) → `chromium`(e2e/**/*.spec.ts, tests/e2e 제외); `fullyParallel: true`, retries 설정 없음(기본 0), reporter list, `webServer`: `npm run dev -- --port 3100`(E2E_PORT), `reuseExistingServer: false`, timeout 120s, env API_BASE_URL/TRADING_API_BASE_URL.
- 인증 방식: `e2e/global.setup.ts`(43줄)가 로컬 API(:8080)의 `/api/auth/{dev-token,dev-e2e-token,dev-admin-token}`를 POST해 `e2e/.auth/{user,account-cache,admin}.json` storageState(kista-token 쿠키만)를 생성. 시작 전 :8081 `/actuator/health` 확인. 각 spec이 `test.use({ storageState })` 또는 `browser.newContext()`.

| 파일 | 줄 | 케이스 | 검증 내용 | 로컬 API 전제 | 실데이터 변경 |
|---|---|---|---|---|---|
| e2e/global.setup.ts | 43 | 1(setup) | 토큰 3종 발급→storageState | :8080 local 프로파일, :8081 | 쓰기 없음(토큰 발급 POST) |
| e2e/admin.spec.ts | 17 | 2 | ADMIN /admin 접근, 사용자 테이블 렌더 | :8080·:8081 | 없음 |
| e2e/auth-guard.spec.ts | 35 | 4 | 비인증 /dashboard 허용, /accounts→/login, "/"→/dashboard, USER의 /admin→/dashboard | setup 프로젝트 의존(:8080·:8081) | 없음 |
| e2e/dashboard.spec.ts | 22 | 2 | USER 대시보드 렌더, 비회원 빈 상태 | :8080 | 없음 |
| e2e/ledger-budget.spec.ts | 37 | 1 | 시드 폼 가용 예수금 경고 — `page.route`로 seed-preview GET·trading-cycles POST를 가로채 500 반환 | :8080(MOCK/KIS 시드 계좌) | 없음(POST를 브라우저에서 차단) |
| e2e/strategy.spec.ts | 76 | 6(조건부 skip 1건: strategy.spec.ts:70 `test.skip(!hasSeed('vr'))`) | 전략 목록·등록 폼 예수금 입력·설정 화면·투자금 추가/인출 폼 오류·VR 상세 | dev 시드(MOCK 전략) 필수 | 없음(확인 다이얼로그에서 취소) |
| tests/e2e/account-cache-consistency.spec.ts | 202 | 2 | 계좌 생성/삭제 후 Router Cache 일관성(리로드 없이) | :8080, 빈 사용자 `...0003` | **있음**: `request.post('/api/accounts')`:77 · `request.delete('/api/accounts/:id')`:58, UI 계좌 생성 POST — 전용 접두사 `e2e-account-cache-`·루프백 API·유저 ID 단언 후 정리 |
| tests/e2e/support/account-cache-fixture.ts / account-cache-lock.ts | 86 / 103 | - | 정리 안전장치(루프백 origin·소유자 ID 단언)·동시 실행 락 | - | 위 케이스용 |
- 케이스 합계 17(spec 6파일 기준; setup 제외), spec 줄 합 391, support 189줄, e2e 관련 전체(config·setup·testing 제외) 937줄(tests/ 하위 vitest 포함).
- 형제 vitest와 겹치는 검증: `e2e/auth-guard.spec.ts` 4케이스 중 `/dashboard` 무토큰 통과·`/accounts` 무토큰 리다이렉트 2건은 `proxy.test.ts:84`·`:94`(267줄, 11케이스)가 같은 분기를 검증. "/"는 `proxy.test.ts:77`에 `makeRequest('/')` 케이스가 있으나 단언 내용 미확인, USER의 /admin 차단 대응은 미확인. `e2e/dashboard.spec.ts` 비회원 빈 상태는 `widgets/dashboard/DashboardContent.test.tsx`가 가까움(대응 케이스 줄 단위 비교 미확인). `e2e/ledger-budget.spec.ts`의 "경고만 띄우고 등록 요청은 보낸다"는 `strategy.spec.ts` 주석("원장 부족 배지 같은 분기는 컴포넌트 단위 테스트가 맡는다")과 대응.
- 공용 fixture·helper: e2e/ 하위에 공용 helper 파일 없음(5 spec이 각자 `test.use`·`goto`). 공유되는 것은 `e2e/.auth/*.json`(setup 산출물)과 `scripts/shared/seed.mjs`(strategy.spec 3회 동적 import). `tests/e2e/support/*`는 account-cache spec 1곳만 소비.
- 공유 여부: e2e는 Playwright 러너 + storageState, scripts(a11y-check·visual-diff)는 raw `chromium.launch` + 쿠키 직접 주입 — **브라우저 준비·로그인·라우트 표를 서로 공유하지 않고 각자 갖는다**(seed.mjs만 e2e↔scripts 공유). CI에서 e2e·scripts 실행 없음(.github/workflows 참조 0건).

## 5. 빌드·lint·타입 설정

### 5-1. 파일별 줄 수·구획
| 파일 | 줄 | 내용 구획 |
|---|---|---|
| next.config.ts | 12 | `reactStrictMode`, `output:'standalone'`, `deploymentId`(process.env.DEPLOYMENT_VERSION), `allowedDevOrigins`. **headers/CSP/rewrites/redirects/images/experimental 0줄**(전부 없음). CSP·`connect-src` 등 문자열은 레포 전체 grep 0건 → "같은 출처 목록이 다른 파일에도 적힘" 해당 없음 |
| eslint.config.mjs | 81 | 아래 5-2 |
| tsconfig.json | 46 | compilerOptions 22줄(strict true, target ES2017, moduleResolution bundler, allowJs true, skipLibCheck true, incremental) / paths 8개 / include·exclude |
| vitest.config.ts | 28 | jsdom, setupFiles, globals, env TZ=UTC, execArgv(`--no-experimental-webstorage`), exclude(e2e·tests/e2e·.claude·.worktrees), alias 8개 |
| vitest.setup.ts | 91 | 테스트 셋업(MockEventSource 등 — 07 소관) |
| postcss.config.mjs | 5 | `@tailwindcss/postcss` 1개. tailwind.config 파일 없음(v4 CSS-first, 설정은 globals.css) |
| knip.json | 19 | ignore(api-types.ts) · ignoreFiles(sheet.mjs) · ignoreDependencies(`sharp`) · ignoreIssues(components/ui exports·types) |
| components.json | 25 | shadcn base-nova, rsc, cssVariables, lucide, aliases 5 |
| doctor.config.json | 15 | react-doctor ignore overrides: components/ui/** 대상 규칙 4개 |
| proxy.ts | 214 | (런타임 담당) |
| `.nvmrc`·`.npmrc`·`package.json engines`·`instrumentation*` | 0 | **없음** |
| `.env.example` | 10키 | 아래 5-5 |
- `tsconfig` paths alias 8개(`@app @widgets @features @entities @shared @testing @/lib @/components`)가 `vitest.config.ts` alias 8개와 같은 목록(두 곳에 각자 선언). `tsconfig` `include`에 `**/*.ts` 포함 → `scripts/*.mjs` 제외(allowJs true이나 include에 *.mjs/js 없음).

### 5-2. eslint.config.mjs (81줄)
- config 배열 항목: `tseslint.config(` 인자 11개(next core-web-vitals, jsx-a11y strict, 규칙 블록 1, react-doctor stub, react-hooks, `...tseslint.configs.recommended`(스프레드), unused-vars, runtimeFiles, entities hooks, app, app layout, ignores) — 규칙 블록(files/rules 객체) 약 10.
- 손으로 쓴 `no-restricted-*`: `no-restricted-syntax` selector 5종(cacheSelectors 2·hookRefreshSelector 1·titleSuffixSelectors 1·nestedLayoutTitleSelector 1, eslint.config.mjs:17-27) + `no-restricted-imports` 1(next/cache `unstable_cache`·`cacheTag`, :53-55). 선언 줄 ≈ 12(:17-27) + 사용 블록 4개(:49-64). `restrict()` 헬퍼 1. 파일 glob별 예외: `files` 블록 4(runtime 4 glob / entities hooks / app / app layout) + `ignores: nonRuntimeFiles` 3회 재사용(2 glob) + 전역 ignores 7패턴(node_modules·.worktrees·.next·out·build·next-env.d.ts·components/ui).
- react-doctor stub(eslint.config.mjs:6-14), 주석 인용: "react-doctor(`npm run doctor`)는 ESLint 플러그인을 배포하지 않지만, 코드의 `eslint-disable react-doctor/*` 주석을 억제 지시로 읽는다. ESLint가 그 주석을 "rule not found"로 막지 않도록 어떤 규칙명이든 no-op으로 응답하는 stub을 등록한다." + 같은 블록 주석: "stub은 아무것도 보고하지 않아 react-doctor 주석이 전부 "unused directive"로 잡히고, `eslint --fix`가 그 주석을 지워버린다 — 규칙 단위로 끌 수 없어 전역으로 끈다."(`reportUnusedDisableDirectives: 'off'`). 영향: 이 설정으로 **모든 `eslint-disable`의 미사용 감지가 꺼짐**(react-doctor 외 주석 포함).
- `eslint-disable` 주석: 제품(비테스트) ts/tsx/mjs 53줄, 테스트 포함 55줄. 규칙별(비테스트, 52건 중 상위 10): react-doctor/prefer-dynamic-import 12 · rendering-conditional-render 6 · no-array-index-as-key 4 · react-hooks/exhaustive-deps 3 · query-mutation-missing-invalidation 3 · no-derived-use 3 · nextjs-no-client-side-redirect 3 · no-pass-live-state-to-parent 2 · no-pass-data-to-parent 2 · no-event-handler 2 (나머지 12종 각 1). react-doctor 계열 49 / react-hooks 3 / 그 외 규칙 0. 12건(23%)이 recharts import 한 줄(1-1절).

### 5-3. 타입 우회 (비테스트 .ts/.tsx, `shared/lib/api-types.ts` 제외)
- `@ts-ignore` 0 · `@ts-nocheck` 0 · `as any` 0 · `: any` 0. `@ts-expect-error` 제품 0 / 테스트 5. `as unknown as` 제품 7줄(CapitalForm.tsx:88·95, strategyFormHelpers.ts:60, ReconfigureVrSections.tsx:85, shared/ui/form/useAppForm.ts:53, PrivacyBaseFormDialog.tsx:123, PrivacyOrderFormDialog.tsx:53) + vitest.setup.ts 2줄 / `*.test.*` 5줄.
- `strict: true`. `noUncheckedIndexedAccess`·`exactOptionalPropertyTypes` 등 추가 옵션 없음.

### 5-4. 환경변수 `process.env` 접근 (비테스트 .ts/.tsx/.mjs, docs 제외)
- 앱 코드: `shared/lib/env.ts` 19줄 3곳(:4,:11,:16 — API_BASE_URL/NEXT_PUBLIC_API_BASE_URL/TRADING_API_BASE_URL/NEXT_PUBLIC_TRADING_API_BASE_URL) / **env.ts를 거치지 않는 직접 접근 15줄**: `app/(auth)/login/page.tsx:33`(KAKAO_CLIENT_ID), `app/firebase-messaging-sw.js/route.ts:3-8`(FIREBASE 6키), `entities/fcm/api/index.ts:5`(VAPID), `shared/lib/firebase.ts:5-10`(FIREBASE 6키), `next.config.ts:8`(DEPLOYMENT_VERSION). Firebase 6키가 route.ts:3-8 과 firebase.ts:5-10 두 곳에 같은 목록으로 반복.
- e2e·설정·스크립트: playwright.config.ts:6-8, e2e/global.setup.ts:4-5, tests/e2e/account-cache-consistency.spec.ts:21, scripts/shared/seed.mjs:78, scripts/visual-diff/run.mjs:88·124.
- `.env.example`(10키: KAKAO_CLIENT_ID, API_BASE_URL 없음·NEXT_PUBLIC_API_BASE_URL, TRADING_API_BASE_URL, FIREBASE 7) vs 코드 사용 키 차이: 코드는 읽지만 예시에 **없는 키** `API_BASE_URL`(env.ts:4 우선순위 1), `DEPLOYMENT_VERSION`, `NEXT_PUBLIC_TRADING_API_BASE_URL`(env.ts:16 폴백), `E2E_*` 3종(E2E_API_BASE·E2E_TRADING_API_BASE·E2E_PORT), `KISTA_DEV_SEED`. 예시에 있고 코드도 쓰는 키는 일치. 별도로 `.env.production.public`(추적 파일, `NEXT_PUBLIC_*` 값 9개 포함 — Dockerfile ARG와 짝).

### 5-5. 의존성
- `dependencies` 21 / `devDependencies` 22.
- 역할별 2개 이상: 차트 2(recharts·lightweight-charts), className 유틸 3(clsx·tailwind-merge·class-variance-authority — 하나의 `cn` 구성). 날짜·아이콘(lucide-react만)·상태(react-query만)·폼(react-hook-form + zod + @hookform/resolvers 1세트)·토스트(sonner만): 중복 없음.
- import 파일 1개뿐인 의존성(소스 import 기준): clsx(shared/lib/utils.ts), tailwind-merge(shared/lib/utils.ts), geist(app/layout.tsx), **lightweight-charts**(MarketChartCardInner.tsx), shadcn(globals.css `@import "shadcn/tailwind.css"`), tw-animate-css(globals.css), @next/eslint-plugin-next·eslint-plugin-jsx-a11y·eslint-plugin-react-hooks·typescript-eslint(eslint.config.mjs), @vitejs/plugin-react(vitest.config.ts), @testing-library/jest-dom(vitest.setup.ts), tailwindcss(globals.css). import 0(CLI·타입·러너라 정상): @tailwindcss/postcss(postcss.config), @types/*, eslint, jsdom, knip, openapi-typescript, postcss, typescript, @vitest/coverage-v8, react-dom.
- 선언 안 됐는데 import되는 것: `sharp`(scripts/visual-diff/shoot.mjs:4·sheet.mjs:8, next 전이 의존성; knip.json이 `ignoreDependencies`로 예외), `axe-core`(a11y-check/run.mjs:12, jsx-a11y 전이 의존성). `shadcn` 패키지가 `dependencies`(런타임 쪽)에 있음.

## 6. public/ 정적 자산
| 파일 | 바이트 | md5 |
|---|---|---|
| public/apple-touch-icon.png | 46,156 | cf8131a3… |
| public/apple-touch-icon-precomposed.png | 46,156 | cf8131a3… (**위와 동일**) |
| public/icon-192.png | 52,424 | 3d83298a… |
| public/icon-512.png | 370,257 | 46ddc210… |
| public/logo.png | 39,546 | a2f71fe8… (256×139, `style={{height,width}}`로 22~78px 표시) |
| app/favicon.ico | 25,931 | c30c7d42… |
- public 5파일 554,539 B. 같은 md5 1쌍(apple-touch-icon / -precomposed). svg·webp·폰트 파일 0(폰트는 CDN·next/font). `public/` 서비스 워커 파일 없음 — `app/firebase-messaging-sw.js/route.ts`(27줄)가 Route Handler로 SW 응답, `app/manifest.ts` 26줄. `logo.png` 참조 9파일(app/pending·rejected, DashboardEmpty, ErrorDisplay, BrandWordmark, DesktopSidebar, MobileHeader, layout, FcmForegroundListener).

## 7. 종합 (숫자만)
| 영역 | 파일 수 | 줄 수 | 평행 구조 건수 | 미사용/단일 사용 | 사본 건수 |
|---|---|---|---|---|---|
| 차트 | 제품 15 + 래퍼 8 (recharts 12, lightweight-charts 1) | 차트 본체 2,098 + 래퍼 507 + 순수로직 ≈100 | CartesianGrid 동일 줄 10 · ResponsiveContainer 12 · tick/axisLine 24줄 · margin 10 · domain 8 · 3분기 카드 골격 3파일 | 라이브러리 1개 단일 사용(lightweight-charts 1파일); 공용 프리미티브 = 상수 2개(소비 12·9) | 같은 rgb 그림자 2 · Legend wrapperStyle 2 · 색 hex 하드코딩 5(fearGreedZones) |
| 스타일·토큰 | css 1 + components/ui 15 | globals.css 588, ui 1,068 | 값 같은 변수 묶음 15(light)+11(dark), 두 토큰 체계 병존(표준 32 / 자체 67) | 변수 미참조 25(변수 12+별칭 13) · 애매 11(radius 6·font-heading·sonner 4) · 미사용 클래스 7 · 사용 1곳 클래스 11 · ui 소비처 1곳 2파일 | `-[var(--x)]` 282 · 임의값 `[...]` 667 · 인라인 `style={{` 58 |
| scripts | 코드 10 + README 2 | 1,230 + 120 | devToken 4곳 · 쿠키 주입 3곳 · `chromium.launch` 2 · VIEWPORTS 2 · 컨텍스트 옵션 2 | 호출처 0: 1(sheet.mjs); 테스트 0 | 라우트 사본 28(a11y PAGES)+48(scenarios), 시드 UUID 5 |
| e2e | spec 6 + setup 1 + support 2 | 389 + 43 + 189 | 공용 helper 0(각 spec이 `test.use` 반복 5회) | 조건부 skip 1 | vitest와 겹치는 케이스 ≥2(auth-guard↔proxy.test) |
| 설정 | 9(next 12, eslint 81, tsconfig 46, vitest 28, postcss 5, knip 19, components.json 25, doctor 15, .env.example) | ≈250 | tsconfig paths ↔ vitest alias 8개 중복 선언 | engines·.nvmrc·.npmrc·instrumentation 0 | eslint-disable 53(react-doctor 49), `as unknown as` 7, process.env 직접 15(env.ts 외), Firebase 6키 2곳 |
| 의존성 | deps 21 / dev 22 | - | 역할 중복 차트 2종 | 소스 import 1파일 12 · 선언 없이 import 2(sharp·axe-core) | - |
| public | 5 + favicon | 554,539 B | - | - | 동일 md5 1쌍 |
