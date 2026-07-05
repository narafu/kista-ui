import { cn } from '@shared/lib/utils'

/** 카드 셸 스켈레톤 — loading.tsx에서 실제 카드 자리를 채울 때 사용. 높이는 className으로 지정한다. */
export function CardSkeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-[var(--r-lg)] bg-card border border-border animate-pulse', className)} />
}
