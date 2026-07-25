'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { Spinner } from '@shared/ui/Spinner'

interface Props {
  accountId: string
  className?: string
}

export function NewStrategyButton({ accountId, className }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(() => router.push(`/accounts/${accountId}/strategies/new`))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-md',
        'bg-gradient-to-br from-rose-500 to-rose-700 text-white text-xs font-semibold',
        'shadow-[0_1px_4px_rgba(225,29,72,0.30)] hover:opacity-90 transition-opacity disabled:opacity-50',
        className,
      )}
    >
      {isPending ? <Spinner size={14} /> : <Plus className="size-3.5" />}
      전략 추가
    </button>
  )
}
