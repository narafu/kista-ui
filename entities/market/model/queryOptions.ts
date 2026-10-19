import { queryOptions } from '@tanstack/react-query'
import { getMonthlyHolidaysClient, getMonthlyHolidaysPublic } from '../api'
import { marketKeys } from './queryKeys'

const HOLIDAYS_STALE_TIME = 1000 * 60 * 60 * 24 // 24시간 — 서버는 월 1회만 갱신

// server-safe(no 'use client'): Server Component의 prefetchQuery와 Client Component의
// useQuery(useMonthlyHolidaysQuery)가 동일 옵션을 재사용한다.
//
// queryFn 2분기 (공개 엔드포인트라 토큰을 쓰지 않는다 — 만료 AT를 붙이면 401):
//   - 브라우저: clientFetch 기반(Route Handler 경유)만 유효 — 서버에서 relative fetch는 host가 없어 동작하지 않는다
//   - 서버: Route Handler를 거칠 수 없으므로 kista-api 공개 엔드포인트를 직접 호출
export function monthlyHolidaysQueryOptions(year: number, month: number) {
  return queryOptions<string[]>({
    queryKey: marketKeys.holidays(year, month),
    queryFn: () => {
      if (typeof window !== 'undefined') return getMonthlyHolidaysClient(year, month)
      return getMonthlyHolidaysPublic(year, month)
    },
    staleTime: HOLIDAYS_STALE_TIME,
  })
}
