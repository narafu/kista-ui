'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAdminPrivacyBasesQuery } from '@entities/privacy'
import { useCandlesRangeQuery } from '@entities/market'
import { EmptyState } from '@shared/ui/EmptyState'
import { buildPrivacyChartSeries, candleRangeFor, latestYearlyResetByTicker, sliceSeriesByRange } from './model/privacyChartSeries'
import { ChartSkeleton, LEGEND_GROUPS, LEGEND_GROUPS_WITH_AVG_GAP, Swatch, useIsNarrow } from './privacyChartParts'

// recharts는 무거워 Inner로 분리해 지연 로드한다 (asset-trend/AssetTrend + AssetTrendInner 패턴)
const PrivacyBaseChartInner = dynamic(() => import('./PrivacyBaseChartInner'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
})

interface Props {
  windowFrom?: string
  windowTo?: string
  // '올해' 기간 — 선택 종목의 마지막 연초 재설정일부터 보여준다(windowFrom/windowTo는 비어 온다)
  sinceYearlyReset?: boolean
}

const DEFAULT_TICKER = 'SOXL'

export function PrivacyBaseChart({ windowFrom: rangeFrom, windowTo, sinceYearlyReset = false }: Props) {
  const pathname = usePathname()
  const narrow = useIsNarrow()
  const searchParams = useSearchParams()
  const { data: allBases = [], isError: basesError, isLoading: basesLoading, refetch: refetchBases } = useAdminPrivacyBasesQuery()
  const tickers = useMemo(() => [...new Set(allBases.map((b) => b.ticker))].sort(), [allBases])
  // 선택 종목은 URL(?ticker=)이 SSOT — 공유·새로고침해도 유지된다. 목록에 없는 값은 기본 종목으로 돌린다
  const pickedTicker = searchParams.get('ticker')
  const ticker = pickedTicker && tickers.includes(pickedTicker) ? pickedTicker : tickers.includes(DEFAULT_TICKER) ? DEFAULT_TICKER : tickers[0] ?? DEFAULT_TICKER

  function pickTicker(value: string | null) {
    if (!value) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('ticker', value)
    // 종목은 클라이언트 차트만 쓰는 값이라 router.replace로 서버 페이지(매매표 prefetch)를 다시 그리지 않고
    // history만 바꾼다 — Next가 useSearchParams와 동기화한다
    window.history.replaceState(null, '', `${pathname}?${params.toString()}`)
  }

  // 누적 손익의 연초 재설정 판정·추정에 전체 이력이 필요해 종목 전체로 계산한 뒤 조회 기간으로 자른다.
  // 종가도 전체 이력 범위(최대 5년)로 받는다 — 기간 필터를 바꿔도 같은 키라 다시 조회하지 않는다.
  // ponytail: 이력이 5년을 넘으면 오래된 구간은 종가·현금비중·재설정 추정이 빈다 — 그때 기간별로 나눠 조회한다
  const tickerBases = useMemo(() => allBases.filter((b) => b.ticker === ticker), [allBases, ticker])
  const candleRange = useMemo(() => candleRangeFor(tickerBases), [tickerBases])
  const candlesQuery = useCandlesRangeQuery(ticker, candleRange)
  const windowFrom = sinceYearlyReset ? latestYearlyResetByTicker(tickerBases).get(ticker) : rangeFrom
  // 주문 점은 가격선을 가릴 때가 있어 끌 수 있게 한다. 종목·기간이 바뀌어 차트가 다시 마운트돼도 유지되도록 여기 둔다
  const [showOrders, setShowOrders] = useState(false)
  // 평단가-종가 괴리 강조 — 켜면 괴리 10%·20% 이상 구간의 평단가를 색으로 표시한다
  const [showAvgGap, setShowAvgGap] = useState(false)
  // PC 차트 툴팁 — 값은 모바일처럼 차트 아래 정보 줄에 항상 나오고, 그래프를 가리는 떠다니는 툴팁은 켰을 때만 추가로 띄운다(기본 꺼짐)
  const [showPcTooltip, setShowPcTooltip] = useState(false)
  const series = useMemo(() => buildPrivacyChartSeries(tickerBases, candlesQuery.data ?? []), [tickerBases, candlesQuery.data])
  const rows = useMemo(() => sliceSeriesByRange(series.rows, windowFrom, windowTo), [series.rows, windowFrom, windowTo])
  const missingCloseCount = rows.filter((r) => r.close == null).length

  function renderBody() {
    if (basesError) {
      return (
        <div role="alert" className="py-8 text-center">
          <p className="text-sm text-muted-foreground">P 매매표를 불러오지 못했습니다</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetchBases()}>다시 시도</Button>
        </div>
      )
    }
    if (basesLoading) return <ChartSkeleton />
    if (allBases.length === 0) return <EmptyState variant="text" message="등록된 P 매매표가 없습니다." />
    if (rows.length === 0) return <EmptyState variant="text" message={'선택한 기간에 표시할 매매표가 없습니다.\n기간을 넓혀 다시 확인해 주세요.'} />
    if (candlesQuery.isLoading) return <ChartSkeleton />
    const legend = (
      <div role="group" aria-label="범례" className="space-y-1 text-xs text-muted-foreground">
            {(showAvgGap ? LEGEND_GROUPS_WITH_AVG_GAP : LEGEND_GROUPS).map((group) => (
              // 묶음 제목 열을 고정하고 항목은 오른쪽 칸에서만 줄바꿈한다 — 좁은 화면에서 항목이 제목 아래로 흘러내리지 않게
              <div key={group.title} className="flex items-start gap-3">
                <span className="w-14 shrink-0 font-medium text-foreground">{group.title}</span>
                <span className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                  {group.items.map((item) => (
                    <span key={item.label} className="inline-flex items-center gap-1.5">
                      <Swatch className={item.swatch} />
                      {item.label}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
    )
    return (
      <div className="space-y-3">
        {candlesQuery.isError ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 pl-1 text-xs text-[var(--warn)]">
            <span>종가를 불러오지 못해 종가·현금비중을 표시하지 않습니다.</span>
            <Button variant="outline" size="sm" onClick={() => void candlesQuery.refetch()}>다시 시도</Button>
          </div>
        ) : missingCloseCount > 0 ? (
          <p className="pl-1 text-xs text-muted-foreground">종가 조회 범위(최대 5년) 밖이거나 종가가 없는 {missingCloseCount}일은 종가·현금비중을 표시하지 않습니다.</p>
        ) : null}

        {/* 패널마다 recharts Legend를 두면 차트 사이에 떠서 산만해, 카드 상단에 패널별 묶음으로 한 번만 둔다.
            모바일은 화면이 좁아 범례가 5줄을 차지하므로 기본 접힘 — 하단 정보 줄에도 같은 색 표식이 붙어 있다 */}
        <details className="pl-1 text-xs sm:hidden">
          <summary className="cursor-pointer text-muted-foreground">범례</summary>
          <div className="mt-2">{legend}</div>
        </details>
        <div className="hidden sm:block">{legend}</div>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 pl-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Switch id="privacy-chart-show-orders" size="sm" checked={showOrders} onCheckedChange={setShowOrders} />
            <label htmlFor="privacy-chart-show-orders" className="cursor-pointer">매수·매도 주문 표시</label>
          </span>
          <span className="inline-flex items-center gap-2">
            <Switch id="privacy-chart-show-avg-gap" size="sm" checked={showAvgGap} onCheckedChange={setShowAvgGap} />
            <label htmlFor="privacy-chart-show-avg-gap" className="cursor-pointer">평단가 괴리 강조</label>
          </span>
          <span className="hidden items-center gap-2 sm:inline-flex">
            <Switch id="privacy-chart-show-pc-tooltip" size="sm" checked={showPcTooltip} onCheckedChange={setShowPcTooltip} />
            <label htmlFor="privacy-chart-show-pc-tooltip" className="cursor-pointer">차트 툴팁 표시</label>
          </span>
        </div>

        {/* 종목·기간·건수가 바뀌거나 화면 폭이 모바일로 넘어가면(Brush가 사라져 되돌릴 수단이 없음) 구간을 처음(전체)으로 되돌리도록 다시 마운트한다 */}
        <PrivacyBaseChartInner key={`${ticker}|${windowFrom}|${windowTo}|${rows.length}|${narrow}`} rows={rows} ticker={ticker} showOrders={showOrders} showAvgGap={showAvgGap} showPcTooltip={showPcTooltip} />
      </div>
    )
  }

  // Card 기본 overflow-hidden은 스크롤 컨테이너를 만들어 모바일 정보 줄의 sticky를 막는다 — clip은 잘라내기만 한다
  return (
    <Card className="mb-6 overflow-clip">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">P 매매표 추이</CardTitle>
          {/* 현재 PRIVACY는 SOXL 한 종목뿐이라 고를 게 있을 때만 보인다 — 종목명은 가격 패널 제목에 나온다 */}
          {tickers.length > 1 && (
            <Select value={ticker} onValueChange={pickTicker}>
              <SelectTrigger aria-label="종목" className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tickers.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">{renderBody()}</CardContent>
    </Card>
  )
}
