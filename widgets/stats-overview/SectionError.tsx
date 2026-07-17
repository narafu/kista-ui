interface Props {
  message?: string
}

/**
 * 섹션 단위 에러 폴백 — 풀페이지형 `@widgets/error-display`의 `ErrorDisplay`는 h1·배지·내비 버튼을
 * 포함해 카드 하나짜리 섹션 대체용으로는 과하다. 주변 위젯과 동일한 카드 토큰만 사용하는 경량 버전.
 */
export function SectionError({ message = '통계를 불러오지 못했습니다' }: Props) {
  return (
    <div className="rounded-[var(--r-lg)] bg-card border border-border p-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
