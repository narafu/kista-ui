import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@shared/lib/utils'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { SectionError } from '@shared/ui/SectionError'

interface FallbackOptions {
  isLoading?: boolean
  /** 보여 줄 데이터가 없는 실패만 넘긴다(`isError && !data`) */
  isError?: boolean
  /** 이 구역의 조회 오류. 502·503이면 서버 재시작 안내를 보인다 */
  error?: unknown
  /** 생략하면 `SectionError` 기본 문구 */
  errorMessage?: string
  isEmpty?: boolean
  empty?: string
  skeleton?: 'text' | 'chart'
  /** 카드 안에서 본문 자리를 유지할 때 높이 클래스를 준다. 주면 실패 표시의 자체 테두리를 뺀다 */
  fallbackClassName?: string
}

/** 로딩·실패·빈 상태 판정의 단일 구현. `AsyncSection`과 `DataList`가 함께 쓴다. 본문을 그릴 차례면 null. */
export function asyncFallback({ isLoading, isError, error, errorMessage, isEmpty, empty, skeleton = 'text', fallbackClassName }: FallbackOptions): ReactNode {
  const box = (node: ReactNode) =>
    fallbackClassName ? <div className={cn('flex items-center justify-center', fallbackClassName)}>{node}</div> : node

  if (isLoading) {
    if (skeleton === 'chart') {
      return <Skeleton role="status" aria-live="polite" aria-label="차트 불러오는 중" className={cn('w-full', fallbackClassName ?? 'h-[240px]')} />
    }
    return box(<LoadingRow />)
  }
  if (isError) {
    return box(<SectionError bare={!!fallbackClassName} message={errorMessage} error={error} />)
  }
  if (isEmpty && empty) return box(<EmptyState variant="text" message={empty} />)
  return null
}

interface Props<T> extends Omit<FallbackOptions, 'isEmpty'> {
  data: T | null | undefined
  isEmpty?: (data: T) => boolean
  children: (data: T) => ReactNode
}

/** 한 구역의 로딩·실패·빈 상태와 본문. `isLoading`을 생략하면 데이터가 없는 동안 로딩이다. */
export function AsyncSection<T>({ data, isLoading, isError, isEmpty, children, ...rest }: Props<T>) {
  const hasData = data !== null && data !== undefined
  const fallback = asyncFallback({
    ...rest,
    isError: isError && !hasData,
    isLoading: !(isError && !hasData) && (isLoading ?? !hasData),
    isEmpty: hasData ? isEmpty?.(data) : !isLoading,
  })
  if (fallback || !hasData) return fallback
  return children(data)
}
