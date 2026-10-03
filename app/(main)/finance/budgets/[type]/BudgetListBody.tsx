import { notFound } from 'next/navigation'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { PageHeader } from '@widgets/page-header'
import { BudgetManager } from '@features/finance/manage-budgets'
import { FLOW_TYPE_LABEL, budgetListQueryOptions, financeCategoryListQueryOptions, flowTypeFromSlug } from '@entities/finance'
import { requirePageToken } from '@shared/lib/auth/token'
import { createQueryClient } from '@shared/lib/query'

interface Props {
  params: Promise<{ type: string }>
}

// 일반 page.tsx와 @modal 인터셉트 버전이 공유하는 조립(NewAssetFormBody 패턴). 목록은 종료 동작이
// 없어 dismiss를 받지 않는다 — 모달 닫기는 RouteModal(X·배경·ESC)이 맡는다.
export async function BudgetListBody({ params }: Props) {
  const { params: { type: slug }, token } = await requirePageToken(params)
  const type = flowTypeFromSlug(slug)
  if (!type) return notFound()

  const queryClient = createQueryClient()
  await Promise.all([
    queryClient.prefetchQuery(financeCategoryListQueryOptions(type, token)).catch(() => undefined),
    queryClient.prefetchQuery(budgetListQueryOptions(token)).catch(() => undefined),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageHeader eyebrow="가계부" eyebrowHref={`/finance/${slug}`} title={`${FLOW_TYPE_LABEL[type]} 예산 관리`} description="카테고리별 월 예산 등록·수정·삭제" />
      <BudgetManager type={type} />
    </HydrationBoundary>
  )
}
