import type { Metadata } from 'next'
import { FLOW_TYPE_LABEL, flowTypeFromSlug } from '@entities/finance'
import { BudgetListBody } from './BudgetListBody'

interface Props {
  params: Promise<{ type: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const type = flowTypeFromSlug((await params).type)
  return {
    title: type ? `${FLOW_TYPE_LABEL[type]} 예산 관리 | KISTA` : '예산 관리 | KISTA',
    description: '카테고리별 월 예산을 관리합니다',
  }
}

export default function BudgetListPage({ params }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <BudgetListBody params={params} />
    </div>
  )
}
