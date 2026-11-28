import { cn } from '@shared/lib/utils'

// 이전 값을 보여주는 동안(placeholderData) 갱신 중임을 알린다 — 값 영역을 opacity로 흐리면 텍스트 대비가 깨져(a11y.md) 문구로 구분한다.
// live region은 처음부터 있어야 바뀐 문구가 읽히므로 비활성일 때도 빈 요소로 남긴다.
export function RefreshingStatus({ active, className }: { active: boolean; className?: string }) {
  return (
    <span role="status" aria-live="polite" aria-label={active ? '갱신 중' : undefined} className={cn('text-xs text-muted-foreground', className)}>
      {active ? '갱신 중' : null}
    </span>
  )
}
