import type { Metadata } from 'next'
import { PageHeader } from '@widgets/page-header'
import { BulkRegisterForm } from '@widgets/finance-bulk-register'

export const metadata: Metadata = {
  title: '가계부 일괄 등록 | KISTA',
  description: '지난달 자산·수입·소비·저축 기록을 이번 달로 한 번에 등록합니다',
}

export default function BulkRegisterPage() {
  return (
    <div>
      <PageHeader eyebrow="가계부" eyebrowHref="/finance" title="모두 등록" />
      <BulkRegisterForm />
    </div>
  )
}
