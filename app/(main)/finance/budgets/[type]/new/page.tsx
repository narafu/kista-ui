import type { Metadata } from 'next'
import { NewBudgetFormBody } from './NewBudgetFormBody'

interface Props {
  params: Promise<{ type: string }>
  searchParams: Promise<{ duplicateFrom?: string; categoryId?: string }>
}

export const metadata: Metadata = {
  title: '예산 추가 | KISTA',
  description: '카테고리별 월 예산을 추가합니다',
}

export default function NewBudgetPage({ params, searchParams }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <NewBudgetFormBody params={params} searchParams={searchParams} />
    </div>
  )
}
