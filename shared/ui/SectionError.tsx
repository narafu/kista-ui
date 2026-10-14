import { Button } from '@/components/ui/button'

interface Props {
  message?: string
  // 다시 조회할 수 있는 화면은 재시도 수단을 함께 둔다
  onRetry?: () => void
}

/**
 * 섹션 단위 에러 폴백 — 풀페이지형 `@widgets/error-display`의 `ErrorDisplay`는 h1·배지·내비 버튼을
 * 포함해 카드 하나짜리 섹션 대체용으로는 과하다. 주변 위젯과 동일한 카드 토큰만 사용하는 경량 버전.
 */
export function SectionError({ message = '통계를 불러오지 못했습니다', onRetry }: Props) {
  return (
    <div className="rounded-[var(--r-lg)] bg-card border border-border p-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  )
}
