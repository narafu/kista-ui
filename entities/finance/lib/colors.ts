import { ASSET_CLASS_ORDER, ASSET_L1_CATEGORY_IDS } from './aggregate'
import type { AssetClass } from '../model/types'

// 카테고리별/자산군별 현황(asset-overview)·구성비(asset-composition) 색상 — 두 위젯이
// 공유한다. 같은 항목(예: 투자 카테고리, EQUITY)은 두 위젯에서 항상 같은 색으로 보여야 한다.
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

// 카테고리는 L1 4종 고정이라 양쪽 위젯이 항상 같은 ASSET_L1_CATEGORY_IDS 순서를 그대로 쓴다.
export function assetCategoryColor(categoryId: string): string {
  return colorAt(ASSET_L1_CATEGORY_IDS.indexOf(categoryId))
}

// AssetClass는 서버 enum(닫힌 6값, 팔레트 길이와 정확히 일치)이라 구 assetClassColorMap의
// "실제 등장한 자산군만으로 정준 순서 구성" 방어가 불필요해졌다 — 고정 순서로 바로 색을 매긴다.
export function assetClassColor(assetClass: AssetClass): string {
  return colorAt(ASSET_CLASS_ORDER.indexOf(assetClass))
}

// 수입/소비/저축 L1 카테고리는 사용자가 임의로 생성해 자산군처럼 고정 순서가 없다 — 호출부가
// sortOrder로 정렬한 L1 id 목록(orderedRootIds)을 넘기면 그 안에서의 위치로 색을 매긴다.
// 같은 정렬 결과를 넘기는 한 위젯 간에도 항목별 색이 항상 일치한다.
export function flowCategoryColor(orderedRootIds: string[], rootId: string): string {
  return colorAt(orderedRootIds.indexOf(rootId))
}
