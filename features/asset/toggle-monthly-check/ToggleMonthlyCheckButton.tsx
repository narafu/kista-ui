'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@shared/lib/utils'
import { useSetMonthlyClosingMutation } from '@entities/finance'

interface Props {
  month: string
  completed: boolean
}

export function ToggleMonthlyCheckButton({ month, completed }: Props) {
  const mutation = useSetMonthlyClosingMutation()

  function handleClick() {
    mutation.mutate(
      { month, completed: !completed },
      {
        onSuccess: () => {
          toast.success(completed ? '이번 달 기록 점검 완료를 해제했습니다' : '이번 달 기록 점검을 완료로 표시했습니다')
        },
      },
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={mutation.isPending}
      aria-pressed={completed}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60',
        completed
          ? 'border-[var(--status-ok)] bg-[var(--status-ok-bg)] text-[var(--status-ok)]'
          : 'border-dashed border-muted-foreground/50 bg-transparent text-muted-foreground hover:border-foreground/60 hover:text-foreground',
      )}
    >
      {completed ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
      {mutation.isPending ? '저장 중...' : completed ? '기록 점검 완료됨' : '이번 달 기록 점검 완료로 표시'}
    </button>
  )
}
