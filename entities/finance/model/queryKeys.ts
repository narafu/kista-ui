import type { Period } from '../lib/period'
import type { AssetCompositionBasis, FinanceCategoryType } from './types'

// 목록 키에 그룹 세그먼트가 없다 — kista-api가 그룹 스코프를 호출자의 실제 소속(1인 1그룹)으로
// 판정해 클라이언트가 그룹을 고를 수 없다. 소속이 바뀌면(초대 수락·탈퇴·추방) financeKeys.all을
// 무효화해 새 스코프로 재조회한다.
export const financeKeys = {
  all: ['finance'] as const,
  assetSnapshotsRoot: () => [...financeKeys.all, 'asset-snapshots'] as const,
  assetSnapshots: () => [...financeKeys.assetSnapshotsRoot(), 'list'] as const,
  categoriesRoot: () => [...financeKeys.all, 'categories'] as const,
  categories: (type: FinanceCategoryType) => [...financeKeys.categoriesRoot(), type, 'list'] as const,
  // 관리자 시스템 카테고리 — 그룹과 무관한 별도 네임스페이스.
  systemCategoriesRoot: () => [...financeKeys.all, 'system-categories'] as const,
  systemCategories: (type: FinanceCategoryType) => [...financeKeys.systemCategoriesRoot(), type, 'list'] as const,
  accountsRoot: () => [...financeKeys.all, 'accounts'] as const,
  accounts: () => [...financeKeys.accountsRoot(), 'list'] as const,
  monthlyClosingsRoot: () => [...financeKeys.all, 'monthly-closings'] as const,
  monthlyClosings: () => [...financeKeys.monthlyClosingsRoot(), 'list'] as const,
  groups: () => [...financeKeys.all, 'groups', 'list'] as const,
  groupMembers: (groupId: string) => [...financeKeys.all, 'groups', groupId, 'members'] as const,
  // from/to는 조회 범위('YYYY-MM-DD', from 생략 = 하한 없음). 월을 옮길 때마다 새 키로 재조회되지만
  // gcTime(10분) 안이면 캐시 히트다.
  transactionsRoot: () => [...financeKeys.all, 'transactions'] as const,
  transactions: (from: string | undefined, to: string) => [...financeKeys.transactionsRoot(), from, to, 'list'] as const,
  budgetsRoot: () => [...financeKeys.all, 'budgets'] as const,
  budgets: () => [...financeKeys.budgetsRoot(), 'list'] as const,
  // 서버 집계 — 원본 리소스별 루트 아래에 두지 않고 하나의 루트로 모은다. 집계 하나가 여러 원본에 걸려
  // 있어(예산 대비 = 거래·예산·카테고리, 일괄 등록 미리보기 = 자산·거래·카테고리, 자산 점검 = 자산·카테고리명)
  // prefix 하나로는 의존을 표현할 수 없기 때문이다. 자산 기록·거래·예산·카테고리 mutation이 전부 이 루트를
  // 함께 무효화한다(계좌는 수정·삭제·공유 전환 — 계좌명이 점검·미리보기에 실림. 그룹 소속 변경·일괄 등록은
  // financeKeys.all이라 이미 포함). 무효화는 활성 쿼리만 재조회한다. 연간 flow 키의 month는 queryOptions가
  // 'YYYY-01'로 정규화해 넘긴다(서버가 연도만 씀).
  aggregatesRoot: () => [...financeKeys.all, 'aggregates'] as const,
  assetSummary: (month: string | undefined) => [...financeKeys.aggregatesRoot(), 'asset-summary', month ?? null] as const,
  assetTrend: (months: number | undefined, endMonth: string | undefined) =>
    [...financeKeys.aggregatesRoot(), 'asset-trend', months ?? 'all', endMonth ?? null] as const,
  assetComposition: (basis: AssetCompositionBasis, months: number | undefined, endMonth: string | undefined) =>
    [...financeKeys.aggregatesRoot(), 'asset-composition', basis, months ?? 'all', endMonth ?? null] as const,
  assetCheck: (month: string) => [...financeKeys.aggregatesRoot(), 'asset-check', month] as const,
  flowSummary: (type: FinanceCategoryType, { mode, month }: Period) =>
    [...financeKeys.aggregatesRoot(), 'flow-summary', type, mode, month] as const,
  flowTrend: (type: FinanceCategoryType, { mode, month }: Period, range: number | undefined) =>
    [...financeKeys.aggregatesRoot(), 'flow-trend', type, mode, month, range ?? 'all'] as const,
  budgetProgress: (type: FinanceCategoryType, { mode, month }: Period) =>
    [...financeKeys.aggregatesRoot(), 'budget-progress', type, mode, month] as const,
  bulkRegisterPreview: (sourceMonth: string) => [...financeKeys.aggregatesRoot(), 'bulk-register-preview', sourceMonth] as const,
}
