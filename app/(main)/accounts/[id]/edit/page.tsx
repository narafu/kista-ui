import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getAuthToken } from '@/lib/auth/token'
import { listAccounts } from '@/lib/api/accounts'
import { AccountEditForm } from '@/components/accounts/AccountEditForm'

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
      <div className="flex items-center gap-3">
        <Link href={`/accounts/${id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--rose-500)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 1 }}>
            {account.nickname}
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>계좌 수정</h1>
        </div>
      </div>

      <AccountEditForm account={account} />
    </div>
  )
}
