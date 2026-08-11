import { ASSET_CATEGORIES, KNOWN_ASSET_CLASSES } from './aggregate'
import type { Asset, AssetCategory } from '../model/types'

// 카테고리별/자산군별 현황(asset-overview)·구성비(asset-composition) 색상 — 두 위젯이
// 공유한다. 같은 항목(예: '투자', '미국주식')은 두 위젯에서 항상 같은 색으로 보여야 한다.
// --chart-1~5는 로즈골드 브랜드 톤 안에서만 순환해(#B66951 계열) 항목이 늘어나면 갈색끼리
// 구분이 어렵다. 전용 --asset-series-1~6(app/globals.css)을 쓴다 — dataviz 스킬의
// validate_palette.js 6항목(명도대·채도·CVD 인접대비·정상시각대비·표면대비)을 라이트/다크
// 양쪽에서 통과한 팔레트로, 로즈골드 브랜드 톤(1번 슬롯)에서 출발해 청록·금·남보라·세이지·자두로
// 퍼진다. 순서를 바꾸면 인접 색상 대비가 깨지므로 globals.css의 순서를 그대로 따른다.
const ASSET_CHART_COLORS = [
  'var(--asset-series-1)',
  'var(--asset-series-2)',
  'var(--asset-series-3)',
  'var(--asset-series-4)',
  'var(--asset-series-5)',
  'var(--asset-series-6)',
]

function colorAt(index: number): string {
  if (index < 0) return 'var(--muted-foreground)'
  return ASSET_CHART_COLORS[index % ASSET_CHART_COLORS.length]
}

// 카테고리는 4종 고정 enum이라 양쪽 위젯이 항상 같은 ASSET_CATEGORIES 순서를 그대로 쓴다 — 인덱스
// 드리프트가 생길 수 없다.
export function assetCategoryColor(category: AssetCategory): string {
  return colorAt(ASSET_CATEGORIES.indexOf(category))
}

// 자산군은 자유 입력이라 위젯마다 보는 부분집합이 다르다 — asset-overview는 선택된 한 달만,
// asset-composition은 최근 6개월만 필터링해서 본다. 각자 그 부분집합 안에서 등장 순서로 색을
// 매기면 같은 자산군이 위젯마다 다른 색으로 보일 수 있다. 두 위젯 모두 이미 전체 assets를 들고
// 있으므로, 필터링 이전의 전체 기록에서 파생한 "정준 순서"를 공유해 인덱스를 맞춘다.
// KNOWN_ASSET_CLASSES를 무조건 전부 깔고 시작하면 안 된다 — 실제 등장한 적 없는 자산군까지
// 슬롯을 차지해, 자유 입력 자산군 하나만 섞여도 팔레트 길이(6)를 넘겨 곧바로 색이 겹친다
// (예: 기록이 [미국주식, 부동산]뿐이면 KNOWN_ASSET_CLASSES 6개가 이미 슬롯을 채워 '부동산'이
// 7번째 자리에서 '미국주식'과 같은 색으로 wrap된다). 실제로 등장한 항목만으로 순서를 구성한다 —
// 그래도 "실제 등장한" 자산군이 팔레트 길이(6)를 넘기면(예: 사용자가 자유 입력 자산군을 7종
// 이상 기록) 그 이후부터는 colorAt의 `% 6`로 다시 처음 색부터 반복 배정된다(구분 실패, 크래시
// 아님) — 현재 이 앱 규모에서는 감수 가능한 한계로 본다.
export function assetClassColorMap(assets: Asset[]): (assetClass: string) => string {
  const present = new Set(assets.map((asset) => asset.assetClass))
  const order = KNOWN_ASSET_CLASSES.filter((assetClass) => present.has(assetClass))
  for (const asset of assets) {
    if (!order.includes(asset.assetClass)) order.push(asset.assetClass)
  }
  return (assetClass: string) => colorAt(order.indexOf(assetClass))
}
