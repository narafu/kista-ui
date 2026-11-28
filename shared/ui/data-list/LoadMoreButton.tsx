'use client'

import { Button } from '@/components/ui/button'

export interface LoadMore {
  hasMore?: boolean
  isFetching?: boolean
  isError?: boolean
  onLoadMore: () => void
}

/** 커서 목록의 "더 보기" — 다음 페이지가 없고 받는 중도 아니면 아무것도 그리지 않는다. */
export function LoadMoreButton({ hasMore, isFetching, isError, onLoadMore }: LoadMore) {
  if (!hasMore && !isFetching) return null
  return (
    <div className="flex flex-col items-center gap-1 border-t py-4">
      {isError && !isFetching && (
        <p role="alert" className="text-sm text-status-error">다음 내역을 불러오지 못했습니다. 다시 시도해주세요.</p>
      )}
      <Button type="button" variant="outline" onClick={() => onLoadMore()} disabled={isFetching}>
        {isFetching ? '불러오는 중…' : '더 보기'}
      </Button>
    </div>
  )
}
