import type { Metadata } from 'next'
import { EditStrategyFormBody } from './EditStrategyFormBody'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export const metadata: Metadata = {
  title: '전략 수정 | KISTA',
  description: '전략 설정을 변경합니다',
}

export default function EditStrategyPage({ params }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <EditStrategyFormBody params={params} />
    </div>
  )
}
