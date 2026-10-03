import type { Metadata } from 'next'
import { BudgetListBody } from './BudgetListBody'

interface Props {
  params: Promise<{ type: string }>
}

export const metadata: Metadata = {
  title: '예산 관리 | KISTA',
  description: '카테고리별 월 예산을 관리합니다',
}

export default function BudgetListPage({ params }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <BudgetListBody params={params} />
    </div>
  )
}
