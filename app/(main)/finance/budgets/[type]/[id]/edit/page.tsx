import type { Metadata } from 'next'
import { EditBudgetFormBody } from './EditBudgetFormBody'

interface Props {
  params: Promise<{ type: string; id: string }>
}

export const metadata: Metadata = {
  title: '예산 수정 | KISTA',
  description: '카테고리별 월 예산을 수정합니다',
}

export default function EditBudgetPage({ params }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <EditBudgetFormBody params={params} />
    </div>
  )
}
