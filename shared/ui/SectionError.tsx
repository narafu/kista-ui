'use client'

import { useContext, useState } from 'react'
import { QueryClientContext } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

interface Props {
  message?: string
}

/**
 * 섹션 단위 에러 폴백 — 풀페이지형 `@widgets/error-display`의 `ErrorDisplay`는 h1·배지·내비 버튼을
 * 포함해 카드 하나짜리 섹션 대체용으로는 과하다. 주변 위젯과 동일한 카드 토큰만 사용하는 경량 버전.
 *
 * "다시 시도"는 화면에 마운트된(active) 쿼리 중 실패 상태인 것만 다시 조회한다 — 실패 원인 쿼리가
 * 부모 훅·props 여러 단계 위에 있어도 호출부가 refetch를 넘길 필요가 없다(retry=0 기본값이라 자동 재시도 없음).
 * QueryClientProvider 밖(단위 테스트 등)에서는 버튼을 숨긴다.
 */
export function SectionError({ message = '통계를 불러오지 못했습니다' }: Props) {
  const queryClient = useContext(QueryClientContext)
  const [retrying, setRetrying] = useState(false)

  function handleRetry() {
    if (!queryClient || retrying) return
    setRetrying(true)
    void queryClient
      .refetchQueries({ type: 'active', predicate: (q) => q.state.status === 'error' })
      .finally(() => setRetrying(false))
  }

  return (
    <div className="rounded-[var(--r-lg)] bg-card border border-border p-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {queryClient && (
        <Button variant="outline" size="sm" className="mt-3 aria-disabled:opacity-50" aria-disabled={retrying} onClick={handleRetry}>
          다시 시도
        </Button>
      )}
    </div>
  )
}
