import {
  SYSTEM_LOAN_CATEGORY_ID,
  SYSTEM_REAL_ESTATE_CATEGORY_ID,
  SYSTEM_SAVINGS_CATEGORY_ID,
  isInvestmentCategoryId,
  isMonthClosed,
} from '@entities/finance'
import type { AssetClass, AssetSnapshot, AssetSnapshotRequest, FinanceAccount, Market, MonthlyClosing } from '@entities/finance'

export type AssetFormMode = 'create' | 'edit' | 'duplicate'

// 계좌 Select 미선택("미지정") 센티널 — Base UI Select는 빈 문자열 value를 허용하지 않는다.
export const NO_ACCOUNT_VALUE = 'NONE'

// 예적금·대출·부동산 L1은 자산군·시장이 사실상 고정값이라 등록 시 매번 고를 필요가 없다 —
// 해당 L1을 능동적으로 고르면 이 값으로 강제하고 Select 자체를 숨긴다. 투자(그 외) L1은 실제로
// 국내/해외·자산군이 다양해 기존처럼 자유 선택을 유지한다.
export const FIXED_ASSET_META: Record<string, { assetClass: AssetClass; market: Market }> = {
  [SYSTEM_SAVINGS_CATEGORY_ID]: { assetClass: 'CASH', market: 'DOMESTIC' },
  [SYSTEM_LOAN_CATEGORY_ID]: { assetClass: 'CASH', market: 'DOMESTIC' },
  [SYSTEM_REAL_ESTATE_CATEGORY_ID]: { assetClass: 'REAL_ESTATE', market: 'DOMESTIC' },
}

export const MODE_LABEL: Record<AssetFormMode, string> = {
  create: '등록',
  edit: '수정',
  duplicate: '복제 등록',
}

// 같은 이름의 계좌를 구분할 수 있도록 기관·소유자를 덧붙인다.
export function accountOptionLabel(account: FinanceAccount): string {
  return [account.name, account.institution, account.owner].filter(Boolean).join(' · ')
}

export interface AssetFormInitialValues {
  entryDate: string
  accountId: string
  assetClass: AssetClass
  market: Market
  strategy: string
  memo: string
  amountDigits: string
}

export function initialFormValues(initial: AssetSnapshot | undefined, today: string): AssetFormInitialValues {
  return {
    entryDate: initial?.entryDate ?? today,
    accountId: initial?.accountId ?? NO_ACCOUNT_VALUE,
    assetClass: initial?.assetClass ?? 'CASH',
    market: initial?.market ?? 'DOMESTIC',
    strategy: initial?.strategy ?? '',
    memo: initial?.memo ?? '',
    amountDigits: initial ? String(initial.amount) : '',
  }
}

// 기준일이 기록 점검 완료(마감)된 달이면 서버가 등록·수정을 409로 거부한다 — 제출 전에 막는다.
// 수정은 새 기준일뿐 아니라 원본 기준일의 달도 잠겨 있으면 거부되므로(서버 가드와 동일) 둘 다 검사한다.
// 복제/등록은 신규 생성이라 원본 날짜와 무관하다 — edit 모드에서만 원본 달을 함께 본다.
export function isEntryLocked(
  closings: MonthlyClosing[],
  scopeGroupId: Parameters<typeof isMonthClosed>[2],
  entryDate: string,
  mode: AssetFormMode,
  initial: AssetSnapshot | undefined,
): boolean {
  if (isMonthClosed(closings, entryDate.slice(0, 7), scopeGroupId)) return true
  if (mode !== 'edit' || !initial) return false
  return isMonthClosed(closings, initial.entryDate.slice(0, 7), scopeGroupId)
}

export interface CategoryChangeEffect {
  clearStrategy: boolean
  fixed?: { assetClass: AssetClass; market: Market }
}

// L1을 능동적으로 바꾼 경우에만 효과가 있다(next[0]이 이전과 같으면 하위 레벨 선택이라 해당 없음).
// - '투자' 아닌 값으로 바꾸면 숨겨지는 전략 필드를 비운다.
// - 예적금·대출·부동산으로 바꾸면 자산군·시장을 고정값으로 강제한다.
// 편집 진입 시 기존 레코드를 복원하는 경로는 이 핸들러가 아니라 useState 초기값으로 채우므로 건드리지 않는다.
export function categoryChangeEffect(prevRoot: string | undefined, next: string[]): CategoryChangeEffect {
  if (next[0] === prevRoot) return { clearStrategy: false }
  return {
    clearStrategy: !isInvestmentCategoryId(next[0]),
    fixed: FIXED_ASSET_META[next[0] ?? ''],
  }
}

interface PayloadInput {
  categoryId: string
  accountId: string
  entryDate: string
  assetClass: AssetClass
  market: Market
  strategy: string
  memo: string
  amountDigits: string
}

export function buildAssetPayload(v: PayloadInput): AssetSnapshotRequest {
  return {
    categoryId: v.categoryId,
    accountId: v.accountId === NO_ACCOUNT_VALUE ? undefined : v.accountId,
    entryDate: v.entryDate,
    assetClass: v.assetClass,
    market: v.market,
    // 화면에는 L1이 '투자'일 때만 노출되지만, 필드 자체는 카테고리 무관 자유 필드다(구 제약의
    // 후계 없음) — 비노출 상태에서도 기존 값(레거시 기록 등)을 건드리지 않고 그대로 제출한다.
    strategy: v.strategy.trim() || undefined,
    memo: v.memo.trim() || undefined,
    amount: Number(v.amountDigits),
  }
}
