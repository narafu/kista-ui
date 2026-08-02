import { queryOptions } from '@tanstack/react-query'
import { getMonthlyHolidays, getMonthlyHolidaysClient, getMonthlyHolidaysPublic } from '../api'
import { marketKeys } from './queryKeys'

const HOLIDAYS_STALE_TIME = 1000 * 60 * 60 * 24 // 24시간 — 서버는 월 1회만 갱신

// server-safe(no 'use client'): Server Component는 token으로 prefetchQuery, Client Component는
// token 없이 useQuery(useMonthlyHolidaysQuery)에서 동일 옵션을 재사용한다.
//
// queryFn 3분기:
//   - 브라우저: clientFetch 기반(Route Handler 경유)만 유효 — 서버에서 relative fetch는 host가 없어 동작하지 않는다
//   - 서버 + token: kista-api를 인증 헤더와 함께 직접 호출
//   - 서버 + 비인증: Route Handler를 거칠 수 없으므로 kista-api 공개 엔드포인트를 직접 호출
export function monthlyHolidaysQueryOptions(year: number, month: number, token?: string) {
  return queryOptions<string[]>({
    queryKey: marketKeys.holidays(year, month),
    queryFn: () => {
      if (typeof window !== 'undefined') return getMonthlyHolidaysClient(year, month)
      return token ? getMonthlyHolidays(year, month, token) : getMonthlyHolidaysPublic(year, month)
    },
    staleTime: HOLIDAYS_STALE_TIME,
  })
}
