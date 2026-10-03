// 예산 관리 라우트(/finance/budgets/[type]/...) 전용 — 예산 응답(FinanceBudget)에 type이 없어 경로에 싣는다.
// 슬러그는 가계부 탭 href(/finance/income 등)와 같은 소문자를 쓴다.
export type FlowType = 'INCOME' | 'EXPENSE' | 'SAVING'

const SLUG_BY_TYPE: Record<FlowType, string> = { INCOME: 'income', EXPENSE: 'expense', SAVING: 'saving' }

// 서버 Body의 PageHeader 제목용 — useMeta(labelOf)는 클라이언트 훅이라 서버에서 쓸 수 없다.
export const FLOW_TYPE_LABEL: Record<FlowType, string> = { INCOME: '수입', EXPENSE: '소비', SAVING: '저축' }

export function flowTypeSlug(type: FlowType): string {
  return SLUG_BY_TYPE[type]
}

export function flowTypeFromSlug(slug: string): FlowType | null {
  const entry = Object.entries(SLUG_BY_TYPE).find(([, s]) => s === slug)
  return entry ? (entry[0] as FlowType) : null
}

export function budgetListHref(type: FlowType): string {
  return `/finance/budgets/${flowTypeSlug(type)}`
}

export function newBudgetHref(type: FlowType, opts: { duplicateFrom?: string; categoryId?: string } = {}): string {
  const params = new URLSearchParams()
  if (opts.duplicateFrom) params.set('duplicateFrom', opts.duplicateFrom)
  if (opts.categoryId) params.set('categoryId', opts.categoryId)
  const qs = params.toString()
  return `${budgetListHref(type)}/new${qs ? `?${qs}` : ''}`
}

export function editBudgetHref(type: FlowType, id: string): string {
  return `${budgetListHref(type)}/${encodeURIComponent(id)}/edit`
}
