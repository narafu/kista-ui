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
    if (isPending) return
    startTransition(() => router.push('/finance/new'))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      // disabled로 바꾸면 포커스가 body로 빠져 모달을 닫은 뒤 이 버튼으로 복귀하지 못한다
      aria-disabled={isPending}
      className={cn(
        buttonVariants({ variant: 'brand', size: 'cta' }),
        'aria-disabled:opacity-50',
        className,
      )}
    >
      {isPending ? <Spinner size={14} /> : <Plus className="size-3.5" />}
      자산 등록
    </button>
  )
}
