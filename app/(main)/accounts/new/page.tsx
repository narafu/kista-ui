import type { Metadata } from 'next'
import { PageHeader } from '@components/common/PageHeader'
import { NewAccountStepper } from '@components/accounts/NewAccountStepper'

export const metadata: Metadata = {
  title: '계좌 연결 | KISTA',
  description: '한국투자증권 KIS API 계좌를 연결합니다',
}

export default function NewAccountPage() {
  return (
    <div>
      <PageHeader eyebrow="계좌 관리" title="새 계좌 연결" />
      <NewAccountStepper />
    </div>
  )
}
