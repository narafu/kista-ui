'use client'

import { useMarketSessionQuery, useMonthlyHolidaysQuery } from '@entities/market'
import { todayKst } from '@shared/lib/format'

interface TodayMarketStatus {
  marketStatusMessage: string | null
  isConfirmedHoliday: boolean
}

// 오늘이 휴장일인지, 아직 조회 중/실패라 확정할 수 없는지를 판정한다.
// 서버 거래일(/api/market/session의 tradingDay)이 SSOT다 — KST 토요일 새벽은 미국 금요일 장 중이라 KST 날짜로 판정하면 틀린다.
// 서버가 거래일을 내려주지 않으면(구버전 배포 중 tradeDateKst=null) KST 날짜 기반 판정으로 폴백한다:
// 주말은 조회 없이 즉시 휴장으로 확정하고, 평일은 월간 휴장일 조회 결과로 판정한다.
export function useTodayMarketStatus(): TodayMarketStatus {
  const { session, loading: isSessionLoading } = useMarketSessionQuery()
  const todayStr = todayKst()
  const [kstYear, kstMonth] = todayStr.split('-').map(Number)
  const { holidays, isError: isHolidayError, loading: isHolidayLoading } = useMonthlyHolidaysQuery(kstYear, kstMonth)

  if (session?.tradeDateKst != null) return { marketStatusMessage: null, isConfirmedHoliday: session.tradingDay === false }
  if (isSessionLoading && !session) return { marketStatusMessage: '미국 증시 휴장 여부를 확인하는 중입니다', isConfirmedHoliday: false }

  const dayOfWeek = new Date(todayStr + 'T00:00:00').getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const marketStatusMessage = !isWeekend
    ? isHolidayError
      ? '미국 증시 휴장 여부를 확인하지 못했습니다'
      : isHolidayLoading
        ? '미국 증시 휴장 여부를 확인하는 중입니다'
        : null
    : null
  const isConfirmedHoliday = isWeekend || (!marketStatusMessage && holidays.includes(todayStr))

  return { marketStatusMessage, isConfirmedHoliday }
}
