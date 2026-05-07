import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { listAccounts } from '@/lib/api/accounts'
import { AccountEditForm } from '@/components/accounts/AccountEditForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AccountEditPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return notFound()
  }

  const accounts = await listAccounts(session.access_token).catch(() => [])
  const account = accounts.find((a) => a.id === id)

  if (!account) {
    return notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/accounts/${id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">계좌 수정</h1>
      </div>

      <AccountEditForm account={account} />
    </div>
  )
}
