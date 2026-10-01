'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { Spinner } from '@shared/ui/Spinner'
import { buttonVariants } from '@/components/ui/button-variants'

interface Props {
  className?: string
}

export function NewAssetButton({ className }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(() => router.push('/finance/new'))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        buttonVariants({ variant: 'brand', size: 'cta' }),
        className,
      )}
    >
      {isPending ? <Spinner size={14} /> : <Plus className="size-3.5" />}
      자산 등록
    </button>
  )
}
