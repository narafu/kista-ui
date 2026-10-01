'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { Spinner } from '@shared/ui/Spinner'
import { buttonVariants } from '@/components/ui/button-variants'

interface Props {
  href?: string
  className?: string
  children?: React.ReactNode
}

export function NewAccountButton({ href = '/accounts/new', className, children = '계좌 등록' }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(() => router.push(href))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        buttonVariants({ variant: 'brand' }),
        'h-9 gap-1.5 px-4 rounded-[var(--r-md)] text-sm',
        'shadow-[0_2px_8px_rgba(225,29,72,0.30)]',
        className,
      )}
    >
      {isPending ? (
        <>
          <Spinner size={16} />
          등록 중...
        </>
      ) : (
        <>
          <Plus className="size-4" />
          {children}
        </>
      )}
    </button>
  )
}
