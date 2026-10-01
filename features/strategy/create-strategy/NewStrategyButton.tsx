'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { Spinner } from '@shared/ui/Spinner'
import { buttonVariants } from '@/components/ui/button-variants'

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
        buttonVariants({ variant: 'brand' }),
        'gap-1.5 h-8 px-3 rounded-md text-xs',
        className,
      )}
    >
      {isPending ? <Spinner size={14} /> : <Plus className="size-3.5" />}
      전략 추가
    </button>
  )
}
