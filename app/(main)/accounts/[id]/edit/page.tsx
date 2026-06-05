import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAccounts } from '@entities/account'
import { EditAccountForm } from '@features/account/edit-account'
import { PageHeader } from '@widgets/page-header'

export const metadata: Metadata = {
  title: '계좌 수정 | KISTA',
  description: '연결된 계좌 설정을 수정합니다',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function AccountEditPage({ params }: Props) {
  const { id } = await params
  const token = await getAuthToken()

  if (!token) {
    return notFound()
  }

  const accounts = await listAccounts(token).catch(() => [])
  const account = accounts.find((a) => a.id === id)

  if (!account) {
    return notFound()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="계좌 관리"
        title="계좌 수정"
      />

      <EditAccountForm account={account} />
    </div>
  )
}
