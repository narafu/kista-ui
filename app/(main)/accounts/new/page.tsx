import type { Metadata } from 'next'
import { PageHeader } from '@widgets/page-header'
import { CreateAccountStepper } from '@features/account/create-account'

export const metadata: Metadata = {
  title: '새 계좌 연결',
  description: '증권사·거래소 계좌를 연결합니다',
}

export default function NewAccountPage() {
  return (
    <div className="max-w-lg mx-auto">
      <PageHeader eyebrow="계좌 목록" eyebrowHref="/accounts" title="새 계좌 연결" />
      <CreateAccountStepper />
    </div>
  )
}
