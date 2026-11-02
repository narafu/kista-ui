import type { Metadata } from 'next'
import { WithdrawCapitalFormBody } from './WithdrawCapitalFormBody'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export const metadata: Metadata = {
  title: '투자금 인출',
  description: '진행 중인 사이클에서 예수금을 인출합니다',
}

export default function WithdrawCapitalPage({ params }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <WithdrawCapitalFormBody params={params} />
    </div>
  )
}
