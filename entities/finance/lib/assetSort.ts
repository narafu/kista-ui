import type { CategoryIndexEntry } from './categoryIndex'

// 자산 항목 공용 정렬 — 자산탭 목록(widgets/asset-record-list)과 일괄등록 투자 섹션
// (bulkRegisterPreview)이 같은 순서를 쓴다.
// 키 순서: 카테고리 경로 → 소유자 → 전략 → 기관 → 계좌명 → 자산군 → 시장 → 금액 큰 순 → id.
// 문자열은 'ko' 비교, 빈 값(null/undefined/'')은 키마다 맨 뒤.

// 자산군·시장 enum 선언 순서 — entities/meta를 import할 수 없어(같은 계층) 호출부가 /api/meta 순서를 넘긴다.
export interface AssetEnumOrder {
  assetClasses: readonly string[]
  markets: readonly string[]
}

interface AssetSortFields {
  id: string
  amount: number
  accountOwner?: string | null
  strategy?: string
  accountInstitution?: string | null
  accountName?: string
  assetClass?: string
  market?: string
}

type CategoryPath = CategoryIndexEntry['path']

function compareText(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b) return Number(!a) - Number(!b)
  return a.localeCompare(b, 'ko')
}

// 순서 배열에 없는 값(빈 값, meta 로딩 전·폴백)은 맨 뒤
function compareEnum(order: readonly string[], a: string | undefined, b: string | undefined): number {
  const rank = (v: string | undefined) => {
    const i = v ? order.indexOf(v) : -1
    return i < 0 ? order.length : i
  }
  return rank(a) - rank(b)
}

// 1번 키 — 단계마다 관리자 sortOrder 오름차순, 같으면 이름 가나다순. 한쪽이 다른 쪽의 상위 경로면
// (중간 depth에 직접 등록된 항목) 짧은 쪽이 먼저. 삭제된 카테고리(경로 없음)는 맨 뒤.
export function compareCategoryPath(a: CategoryPath | undefined, b: CategoryPath | undefined): number {
  if (!a || !b) return Number(!a) - Number(!b)
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const diff = a[i].sortOrder - b[i].sortOrder || a[i].name.localeCompare(b[i].name, 'ko')
    if (diff !== 0) return diff
  }
  return a.length - b.length
}

// 2~8번 키 — 카테고리가 같을 때(또는 일괄등록처럼 카테고리로 이미 그룹핑된 경우)의 순서
export function compareAssetDetail(a: AssetSortFields, b: AssetSortFields, order: AssetEnumOrder): number {
  return (
    compareText(a.accountOwner, b.accountOwner) ||
    compareText(a.strategy, b.strategy) ||
    compareText(a.accountInstitution, b.accountInstitution) ||
    compareText(a.accountName, b.accountName) ||
    compareEnum(order.assetClasses, a.assetClass, b.assetClass) ||
    compareEnum(order.markets, a.market, b.market) ||
    b.amount - a.amount ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) // 로케일 무관 코드 단위 비교 — SSR·브라우저에서 같은 순서
  )
}
