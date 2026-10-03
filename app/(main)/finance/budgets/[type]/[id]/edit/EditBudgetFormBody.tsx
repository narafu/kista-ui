import { notFound } from 'next/navigation'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { PageHeader } from '@widgets/page-header'
import { BudgetForm } from '@features/finance/manage-budgets'
import { FLOW_TYPE_LABEL, budgetListHref, budgetListQueryOptions, financeCategoryListQueryOptions, flowTypeFromSlug, getCategoryPath } from '@entities/finance'
import { requirePageToken } from '@shared/lib/auth/token'
import { createQueryClient } from '@shared/lib/query'
import type { DismissMode } from '@shared/lib/dismiss'

interface Props {
  params: Promise<{ type: string; id: string }>
  // 'push'(기본): 일반 페이지 라우트. 'back': 인터셉팅 라우트(@modal) — NewAssetFormBody와 동일한 이유로 분리.
  dismiss?: DismissMode
}

export async function EditBudgetFormBody({ params, dismiss }: Props) {
  const { params: { type: slug, id }, token } = await requirePageToken(params)
  const type = flowTypeFromSlug(slug)
  if (!type) return notFound()

  const queryClient = createQueryClient()
  const [categories, budgets] = await Promise.all([
    queryClient.fetchQuery(financeCategoryListQueryOptions(type, token)),
    queryClient.fetchQuery(budgetListQueryOptions(token)),
  ])
  // 다른 type 카테고리의 예산 id로 들어오면 트리가 맞지 않아 폼이 깨진다 — 없는 예산과 같이 404
  const budget = budgets.find((b) => b.id === id)
  if (!budget || getCategoryPath(categories, budget.categoryId).length === 0) return notFound()

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageHeader eyebrow={`${FLOW_TYPE_LABEL[type]} 예산 관리`} eyebrowHref={budgetListHref(type)} title="예산 수정" description="카테고리·적용 기간·월 예산 입력" />
      <BudgetForm type={type} initial={budget} dismiss={dismiss} />
    </HydrationBoundary>
  )
}
