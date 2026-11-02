import type { Metadata } from 'next'
import { InjectCapitalFormBody } from './InjectCapitalFormBody'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export const metadata: Metadata = {
  title: '자금 추가',
  description: '진행 중인 사이클에 예수금이나 보유 주식을 추가합니다',
}

export default function InjectCapitalPage({ params }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <InjectCapitalFormBody params={params} />
    </div>
  )
}
