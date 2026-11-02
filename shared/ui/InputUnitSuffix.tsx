import type { ReactNode } from 'react'
import { cn } from '@shared/lib/utils'

// 공용 Input 오른쪽에 단위(원 등)를 덧붙이는 래퍼 — Input 스타일을 유지해야 하는 폼용. 자체 상자를 그리는 숫자 입력은 UnitInput.
export function InputWithUnit({ unit, unitId, children, className }: { unit: string; unitId: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      {children}
      <span id={unitId} aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground">{unit}</span>
    </div>
  )
}
