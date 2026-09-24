import type { Metadata } from 'next'
import { NewStrategyFormBody } from './NewStrategyFormBody'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: '전략 등록 | KISTA',
  description: '이 계좌에 적용할 매매 전략을 등록합니다',
}

export default function NewStrategyPage({ params }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <NewStrategyFormBody params={params} />
    </div>
  )
}
