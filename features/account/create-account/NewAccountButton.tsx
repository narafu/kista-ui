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
    if (isPending) return
    startTransition(() => router.push(href))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      // disabled로 바꾸면 이동 대기 중 포커스가 body로 빠진다 — NewStrategyButton과 같은 패턴
      aria-disabled={isPending}
      className={cn(
        buttonVariants({ variant: 'brand' }),
        'aria-disabled:opacity-50',
        'h-9 gap-1.5 px-4 rounded-[var(--r-md)] text-sm',
        'shadow-[0_2px_8px_rgba(225,29,72,0.30)]',
        className,
      )}
    >
      {isPending ? <Spinner size={16} /> : <Plus className="size-4" />}
      {children}
    </button>
  )
}
