'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { Spinner } from '@shared/ui/Spinner'

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
        'inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)]',
        'bg-gradient-to-br from-rose-500 to-rose-700 text-white text-sm font-semibold',
        'shadow-[0_2px_8px_rgba(225,29,72,0.30)] hover:opacity-90 transition-opacity disabled:opacity-60',
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
