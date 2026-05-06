import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { AccountDetailTabs } from '@/components/common/AccountDetailTabs'
import { cn } from '@/lib/utils'
import { MOCK_ACCOUNTS, MOCK_TRADES, MOCK_PORTFOLIO } from '@/lib/mock-data'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params
  const account = MOCK_ACCOUNTS.find((a) => a.id === id) ?? MOCK_ACCOUNTS[0]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{account.nickname}</h1>
        </div>
        <Link href={`/accounts/${id}/edit`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <Pencil className="h-4 w-4" />
        </Link>
      </div>

      <AccountDetailTabs
        account={account}
        trades={MOCK_TRADES}
        portfolio={MOCK_PORTFOLIO}
      />
    </div>
  )
}
