'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { Spinner } from '@shared/ui/Spinner'
import { Button } from '@/components/ui/button'

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
    <Button
      variant="brand"
      size="cta"
      onClick={handleClick}
      // native disabled면 포커스가 body로 빠져 이동 대기 중·모달을 닫은 뒤 이 버튼으로 복귀하지 못한다 —
      // focusableWhenDisabled는 aria-disabled만 걸고 클릭·키 입력을 막는다
      disabled={isPending}
      focusableWhenDisabled
      className={cn('aria-disabled:opacity-50', className)}
    >
      {isPending ? <Spinner size={14} /> : <Plus className="size-3.5" />}
      전략 추가
    </Button>
  )
}
