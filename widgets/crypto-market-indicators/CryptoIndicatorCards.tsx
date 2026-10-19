'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { Info } from 'lucide-react'
import { Surface } from '@shared/ui/Surface'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fmtSignedPercent } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import type { CryptoTickerIndicators } from '@entities/market'

const IndicatorLineChart = dynamic(() => import('./IndicatorLineChart'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">차트 불러오는 중…</div>,
})

// 응답은 days=200으로 한 번 받고 기간 토글은 최근 N일만 잘라 보여준다(대시보드 다른 차트와 같은 선택지)
const DAYS_OPTIONS = [200, 120, 50, 20] as const
type Days = (typeof DAYS_OPTIONS)[number]

const compactUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })
// 김프·테더 프리미엄은 이미 % 값이라 fmtSignedPercent(비율 입력)에 넘기기 전에 100으로 나눈다
const fmtPct = (percent: number) => fmtSignedPercent(percent / 100, 2)
// 펀딩비는 비율 원값(0.0001 = 0.01%) — 평상시 기준선이 0.01%라 소수 넷째 자리까지 보여준다
const fmtFunding = (ratio: number) => fmtSignedPercent(ratio, 4)
const fmtKstTime = (instant: string) =>
  new Date(instant).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })

interface IndicatorCardProps {
  title: string
  description: string
  days?: Days
  onDaysChange?: (days: Days) => void
  children: ReactNode
}

function IndicatorCard({ title, description, days, onDaysChange, children }: IndicatorCardProps) {
  return (
    <Surface className="flex flex-col gap-2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="text-sm font-semibold whitespace-nowrap text-foreground">{title}</span>
        <div className="ml-auto flex items-center gap-1">
          {days != null && onDaysChange && (
            <SegmentedToggle
              aria-label={`${title} 조회 기간(일)`}
              options={DAYS_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
              value={days}
              onChange={onDaysChange}
              size="sm"
            />
          )}
          <Popover>
            <PopoverTrigger aria-label={`${title} 설명`} className="inline-flex size-6 -my-[5px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Info className="size-3.5" />
            </PopoverTrigger>
            <PopoverContent className="w-auto text-sm whitespace-nowrap">{description}</PopoverContent>
          </Popover>
        </div>
      </div>
      {children}
    </Surface>
  )
}

// 카드는 그리드 행 높이로 늘어나므로 차트가 남는 아래 여백을 채운다(한 열 배치에서는 최소 높이)
function ChartArea({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('min-h-[140px] flex-1', className)}>{children}</div>
}

function Unavailable() {
  return <div className="flex h-[200px] items-center justify-center text-sm text-warn">일시적으로 불러올 수 없습니다.</div>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  )
}

interface KimchiProps {
  ticker: string
  data: CryptoTickerIndicators['kimchiPremium']
  usdtPremium: number | null
}

export function KimchiPremiumCard({ ticker, data, usdtPremium }: KimchiProps) {
  const title = `${ticker} 김치 프리미엄`
  const description = '국내 원화가의 해외 대비 할증'
  const [days, setDays] = useState<Days>(200)
  if (!data) {
    return <IndicatorCard title={title} description={description}><Unavailable /></IndicatorCard>
  }
  const { official, tether } = data.current
  // 환율 조회 실패(official null)면 공식 기준 현재값·분해를 숨긴다. 추이 선은 과거 값이 하나라도 있으면 그린다
  const hasOfficial = official != null
  const hasOfficialHistory = data.history.some((p) => p.official != null)
  const series = [
    ...(hasOfficialHistory ? [{ key: 'official', name: '공식 환율 기준', color: 'var(--chart-1)' }] : []),
    { key: 'tether', name: '테더 기준', color: 'var(--info)' },
  ]

  return (
    <IndicatorCard title={title} description={description} days={days} onDaysChange={setDays}>
      <div className="flex gap-6">
        {hasOfficial && <Stat label="공식 환율 기준" value={fmtPct(official)} />}
        <Stat label="테더 기준" value={fmtPct(tether)} />
      </div>
      {hasOfficial && usdtPremium != null && (
        // (1+공식) = (1+테더 김프) × (1+테더 프리미엄)의 곱셈 관계라 합으로 나눠 보여주는 값은 근사다
        <p className="text-xs text-muted-foreground">
          공식 ≈ 테더 김프 <span className="tabular-nums text-foreground">{fmtPct(tether)}</span> + 테더 프리미엄{' '}
          <span className="tabular-nums text-foreground">{fmtPct(usdtPremium)}</span> (근사)
        </p>
      )}
      {!hasOfficial && <p className="text-xs text-warn">환율을 불러오지 못해 공식 환율 기준 값을 표시하지 않습니다.</p>}
      {/* 범례가 붙는 두 선 차트라 최소 높이를 더 준다 */}
      <ChartArea className="min-h-[164px]">
        <IndicatorLineChart
          data={data.history.slice(-days)}
          series={series}
          title={`${title} 추이`}
          formatAxis={(v) => `${v.toFixed(1)}%`}
          formatValue={fmtPct}
          referenceY={0}
          yWidth={40}
        />
      </ChartArea>
    </IndicatorCard>
  )
}

export function FundingRateCard({ ticker, data }: { ticker: string; data: CryptoTickerIndicators['fundingRate'] }) {
  const title = `${ticker} 펀딩비`
  const description = '바이낸스 무기한 선물, 8시간 정산'
  const [days, setDays] = useState<Days>(200)
  if (!data) {
    return <IndicatorCard title={title} description={description}><Unavailable /></IndicatorCard>
  }
  // 차트는 % 단위로 그린다 — 기준선 0.01%(평상시 8시간 펀딩비)
  const history = data.history.slice(-days).map((p) => ({ date: p.date, value: p.value * 100 }))

  return (
    <IndicatorCard title={title} description={description} days={days} onDaysChange={setDays}>
      <div className="flex gap-6">
        <Stat label="현재" value={fmtFunding(data.current)} />
        <Stat label="다음 정산" value={`${fmtKstTime(data.nextFundingTime)} KST`} />
      </div>
      <ChartArea>
        <IndicatorLineChart
          data={history}
          series={[{ key: 'value', name: '일평균 펀딩비', color: 'var(--chart-1)' }]}
          title={`${title} 일평균 추이`}
          formatAxis={(v) => `${Number(v.toFixed(4))}%`}
          formatValue={(v) => fmtFunding(v / 100)}
          referenceY={0.01}
          yWidth={48}
        />
      </ChartArea>
    </IndicatorCard>
  )
}

export function OpenInterestCard({ ticker, data }: { ticker: string; data: CryptoTickerIndicators['openInterest'] }) {
  const title = `${ticker} 미결제약정`
  const description = '선물 레버리지 규모(USD), 최근 30일'
  const latest = data?.history.at(-1)
  if (!data) {
    return <IndicatorCard title={title} description={description}><Unavailable /></IndicatorCard>
  }

  return (
    <IndicatorCard title={title} description={description}>
      {latest && <Stat label={`${latest.date.replace(/-/g, '.')} UTC`} value={compactUsd.format(latest.valueUsd)} />}
      <ChartArea>
        <IndicatorLineChart
          data={data.history}
          series={[{ key: 'valueUsd', name: '미결제약정', color: 'var(--chart-2)' }]}
          title={`${title} 추이`}
          formatAxis={(v) => compactUsd.format(v)}
          formatValue={(v) => compactUsd.format(v)}
        />
      </ChartArea>
    </IndicatorCard>
  )
}
