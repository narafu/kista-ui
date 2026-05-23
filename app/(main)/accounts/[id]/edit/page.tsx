import { notFound } from 'next/navigation'
import { getAuthToken } from '@/lib/auth/token'
import { listAccounts } from '@/lib/api/accounts'
import { AccountEditForm } from '@/components/accounts/AccountEditForm'
import { PageHeader } from '@/components/common/PageHeader'

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

      <AccountEditForm account={account} />
    </div>
  )
}
