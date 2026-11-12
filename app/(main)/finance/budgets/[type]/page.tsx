import type { Metadata } from 'next'
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const type = flowTypeFromSlug((await params).type)
  return {
    title: type ? `${FLOW_TYPE_LABEL[type]} 예산 관리` : '예산 관리',
    description: '카테고리별 월 예산을 관리합니다',
  }
}

export default async function BudgetListPage({ params }: Props) {
  const { params: { type: slug }, token } = await requirePageToken(params)
  const type = flowTypeFromSlug(slug)
  if (!type) return notFound()

  const queryClient = createQueryClient()
  await Promise.all([
    queryClient.prefetchQuery(financeCategoryListQueryOptions(type, token)).catch(() => undefined),
    queryClient.prefetchQuery(budgetListQueryOptions(token)).catch(() => undefined),
  ])

  return (
    <div className="max-w-lg mx-auto">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PageHeader eyebrow={FLOW_TYPE_LABEL[type]} eyebrowHref={`/finance/${slug}`} title={`${FLOW_TYPE_LABEL[type]} 예산 관리`} description="카테고리별 월 예산 추가·수정·삭제" />
        <BudgetManager type={type} />
      </HydrationBoundary>
    </div>
  )
}
