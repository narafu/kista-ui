import { notFound } from 'next/navigation'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { PageHeader } from '@widgets/page-header'
import { BudgetForm } from '@features/finance/manage-budgets'
import { FLOW_TYPE_LABEL, budgetListHref, budgetListQueryOptions, financeCategoryListQueryOptions, flowTypeFromSlug, getCategoryPath } from '@entities/finance'
import type { FinanceBudget } from '@entities/finance'
import { requirePageToken } from '@shared/lib/auth/token'
import { createQueryClient } from '@shared/lib/query'
import type { DismissMode } from '@shared/lib/dismiss'

interface Props {
  params: Promise<{ type: string }>
  searchParams: Promise<{ duplicateFrom?: string; categoryId?: string }>
  // 'push'(기본): 일반 페이지 라우트. 'back': 인터셉팅 라우트(@modal) — NewAssetFormBody와 동일한 이유로 분리.
  dismiss?: DismissMode
}

export async function NewBudgetFormBody({ params, searchParams, dismiss }: Props) {
  const [{ params: { type: slug }, token }, { duplicateFrom, categoryId }] = await Promise.all([requirePageToken(params), searchParams])
  const type = flowTypeFromSlug(slug)
  if (!type) return notFound()

  const queryClient = createQueryClient()
  // 폼의 useState 초기값이 첫 렌더에 확정되므로 프리필 값은 서버에서 찾아 prop으로 넘긴다.
  // 예산 단건 조회 API가 없어 목록에서 찾는다. 복제 원본 조회 실패는 빈 추가 폼으로 폴백(자산 복제와 동일).
  const [categories, budgets] = await Promise.all([
    queryClient.fetchQuery(financeCategoryListQueryOptions(type, token)),
    duplicateFrom ? queryClient.fetchQuery(budgetListQueryOptions(token)).catch((): FinanceBudget[] => []) : Promise.resolve<FinanceBudget[]>([]),
  ])
  const inType = (id?: string): id is string => !!id && getCategoryPath(categories, id).length > 0
  const source = budgets.find((b) => b.id === duplicateFrom && inType(b.categoryId))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageHeader
        eyebrow={`${FLOW_TYPE_LABEL[type]} 예산 관리`}
        eyebrowHref={budgetListHref(type)}
        title={source ? '예산 복제' : '예산 추가'}
        description={source ? '원본과 적용 기간이 겹치면 저장되지 않습니다. 적용 기간을 변경하세요.' : '카테고리·적용 기간·월 예산 입력'}
      />
      <BudgetForm type={type} duplicateFrom={source} defaultCategoryId={inType(categoryId) ? categoryId : undefined} dismiss={dismiss} />
    </HydrationBoundary>
  )
}
