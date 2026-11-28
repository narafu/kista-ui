import type { AssetClass, MonthlyClosing } from '../model/types'

// finance_categories 자산(ASSET) L1은 고정 UUID 시스템 시드다(kista-api V13 시드값과 동일, 수정·삭제 불가).
// 구 AssetCategory enum(INVESTMENT/SAVINGS/LOAN/REAL_ESTATE)의 후계 — 같은 순서를 유지해 정렬·색상
// 인덱스가 그대로 이어지게 한다.
export const SYSTEM_INVESTMENT_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000403'
export const SYSTEM_SAVINGS_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000401'
export const SYSTEM_LOAN_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000404'
export const SYSTEM_REAL_ESTATE_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000402'

export const ASSET_L1_CATEGORY_IDS = [
  SYSTEM_INVESTMENT_CATEGORY_ID,
  SYSTEM_SAVINGS_CATEGORY_ID,
  SYSTEM_LOAN_CATEGORY_ID,
  SYSTEM_REAL_ESTATE_CATEGORY_ID,
]

// L1은 시스템 카테고리라 이름 변경이 불가하다(kista-api FinanceCategory.isSystem() → 수정 403) —
// 서버 집계(breakdown/composition/check)처럼 categoryId만 실려오는 결과를 위해 이름을 직접 들고 있는다.
// 구 formatAssetCategoryLabel(ASSET_CATEGORY_LABEL)의 후계.
const ASSET_L1_CATEGORY_LABEL: Record<string, string> = {
  [SYSTEM_INVESTMENT_CATEGORY_ID]: '투자',
  [SYSTEM_SAVINGS_CATEGORY_ID]: '예적금',
  [SYSTEM_LOAN_CATEGORY_ID]: '대출',
  [SYSTEM_REAL_ESTATE_CATEGORY_ID]: '부동산',
}

export function formatAssetL1CategoryLabel(categoryId: string): string {
  return ASSET_L1_CATEGORY_LABEL[categoryId] ?? categoryId
}

// AssetClass는 서버 enum(닫힌 6값)이라 구 KNOWN_ASSET_CLASSES의 "미등록 값은 뒤에 이어붙이기" 방어가 불필요하다.
export const ASSET_CLASS_ORDER: AssetClass[] = ['CASH', 'EQUITY', 'FIXED_INCOME', 'COMMODITY', 'CRYPTO', 'REAL_ESTATE']

// 운용전략 필드는 L1이 '투자'일 때만 의미가 있다 — 문자열 비교 대신 이 함수를 통해서만 판정한다.
export function isInvestmentCategoryId(categoryId: string | undefined): boolean {
  return categoryId === SYSTEM_INVESTMENT_CATEGORY_ID
}

// 해당 월(YYYY-MM)이 마감(기록 점검 완료)됐는지. 마감된 달은 재무 기록 등록·수정·삭제·공유가 잠긴다.
// 마감 스코프는 kista-api 가드와 동일하게 판정한다 — 그룹 소속(scopeGroupId 있음)이면 그 그룹의
// 마감 행만, 무그룹이면 개인 마감 행(groupId null)만 본다. list 응답은 개인·그룹 마감을 함께 반환하므로
// 스코프에 맞는 행만 골라야 판정이 어긋나지 않는다. 스코프에 맞는 행이 없으면 미마감(가드도 동일).
// scopeGroupId는 useMonthlyClosingScopeGroupId()(실제 소속) 값을 넘긴다.
export function isMonthClosed(closings: MonthlyClosing[], month: string, scopeGroupId?: string): boolean {
  const match = closings.find(
    (closing) =>
      closing.month === month && (scopeGroupId ? closing.groupId === scopeGroupId : !closing.groupId),
  )
  return match?.completed ?? false
}
