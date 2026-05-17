import { PageHeader } from '@/components/common/PageHeader'
import { NewAccountStepper } from '@/components/accounts/NewAccountStepper'

export default function NewAccountPage() {
  return (
    <div>
      <PageHeader eyebrow="계좌 관리" title="새 계좌 연결" />
      <NewAccountStepper />
    </div>
  )
}
