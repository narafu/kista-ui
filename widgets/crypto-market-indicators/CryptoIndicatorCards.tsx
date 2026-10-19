'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { Info } from 'lucide-react'
import { Surface } from '@shared/ui/Surface'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fmtCompactUsd, fmtSignedPercent } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { fmtCompactUsdTick, stepDecimals } from './niceTicks'
import type { CryptoMarketIndicators, CryptoTickerIndicators } from '@entities/market'

const IndicatorLineChart = dynamic(() => import('./IndicatorLineChart'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">차트 불러오는 중…</div>,
})

// 응답은 days=200으로 한 번 받고 기간 토글은 최근 N일만 잘라 보여준다(대시보드 다른 차트와 같은 선택지)
const DAYS_OPTIONS = [200, 120, 50, 20] as const
type Days = (typeof DAYS_OPTIONS)[number]

// 김프·테더 프리미엄은 이미 % 값이라 fmtSignedPercent(비율 입력)에 넘기기 전에 100으로 나눈다
const fmtPct = (percent: number) => fmtSignedPercent(percent / 100, 2)
// 펀딩비는 비율 원값(0.0001 = 0.01%) — 평상시 기준선이 0.01%라 소수 넷째 자리까지 보여준다
const fmtFunding = (ratio: number) => fmtSignedPercent(ratio, 4)
// 배수·비율은 1이 기준인 무단위 값이라 소수 둘째 자리까지
const fmtMultiple = (v: number | null) => (v == null ? '—' : `${v.toFixed(2)}x`)
const fmtUtcDate = (date: string) => `${date.replace(/-/g, '.')} UTC`
const fmtKstDate = (instant: string) =>
  new Date(instant).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' })
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
            <PopoverContent className="w-auto text-sm whitespace-pre">{description}</PopoverContent>
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
  const description = '국내 원화가의 해외 대비 할증\n공식 환율 기준: 일반 김프 사이트와 같은 기준\n테더 기준: 원화 유출 제약을 뺀 국내 과열도'
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
          formatAxis={(v, step) => `${v.toFixed(step ? stepDecimals(step) : 1)}%`}
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
  const description = '바이낸스 무기한 선물, 8시간 정산\n양수는 롱 과열, 음수는 숏 우세\n점선은 평상시 기준 0.01%'
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
          formatAxis={(v, step) => `${step ? v.toFixed(stepDecimals(step)) : Number(v.toFixed(4))}%`}
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
      {latest && <Stat label={fmtUtcDate(latest.date)} value={fmtCompactUsd(latest.valueUsd)} />}
      <ChartArea>
        <IndicatorLineChart
          data={data.history}
          series={[{ key: 'valueUsd', name: '미결제약정', color: 'var(--chart-2)' }]}
          title={`${title} 추이`}
          formatAxis={(v, step) => (step ? fmtCompactUsdTick(v, step) : fmtCompactUsd(v))}
          formatValue={fmtCompactUsd}
        />
      </ChartArea>
    </IndicatorCard>
  )
}

export function ValuationCard({ ticker, data }: { ticker: string; data: CryptoTickerIndicators['valuation'] }) {
  const title = `${ticker} 장기 밸류에이션`
  const description = '200주 배수: 종가 ÷ 200주 이동평균, 1 미만은 장기 저점권\n메이어 멀티플: 종가 ÷ 200일 이동평균\nATH 대비: 역대 최고가에서 내려온 폭'
  const [days, setDays] = useState<Days>(200)
  if (!data) {
    return <IndicatorCard title={title} description={description}><Unavailable /></IndicatorCard>
  }
  const { current } = data

  return (
    <IndicatorCard title={title} description={description} days={days} onDaysChange={setDays}>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Stat label="200주 배수" value={fmtMultiple(current.wma200Multiple)} />
        <Stat label="메이어 멀티플" value={fmtMultiple(current.mayerMultiple)} />
        {/* 신고가 당일은 0이라 fmtPct가 +0.00%로 그린다 — 하락률이 양수로 읽히지 않게 부호 없이 둔다 */}
        <Stat label="ATH 대비" value={current.athDrawdownPercent < 0 ? fmtPct(current.athDrawdownPercent) : '0.00%'} />
      </div>
      <p className="text-xs text-muted-foreground">{fmtUtcDate(current.date)} 종가 기준</p>
      <ChartArea className="min-h-[164px]">
        <IndicatorLineChart
          data={data.history.slice(-days)}
          series={[
            { key: 'wma200Multiple', name: '200주 배수', color: 'var(--chart-1)' },
            { key: 'mayerMultiple', name: '메이어 멀티플', color: 'var(--info)' },
          ]}
          title={`${title} 추이`}
          formatAxis={(v, step) => `${v.toFixed(step ? stepDecimals(step) : 1)}x`}
          formatValue={fmtMultiple}
          referenceY={1}
          yWidth={40}
        />
      </ChartArea>
    </IndicatorCard>
  )
}

export function LongShortRatioCard({ ticker, data }: { ticker: string; data: CryptoTickerIndicators['longShortRatio'] }) {
  const title = `${ticker} 롱/숏 비율`
  const description = '바이낸스 선물 롱/숏 계좌 수 비율, 최근 30일\n1보다 크면 롱 계좌가 더 많음\n계좌 수(사람) 기준이라 포지션 규모(돈) 기준인 펀딩비와 다름'
  if (!data) {
    return <IndicatorCard title={title} description={description}><Unavailable /></IndicatorCard>
  }

  return (
    <IndicatorCard title={title} description={description}>
      <div className="flex gap-6">
        <Stat label="롱 계좌 비중" value={`${(data.longAccount * 100).toFixed(1)}%`} />
        <Stat label="롱/숏" value={data.longShortRatio.toFixed(2)} />
      </div>
      <ChartArea>
        <IndicatorLineChart
          data={data.history}
          series={[{ key: 'longShortRatio', name: '롱/숏', color: 'var(--chart-2)' }]}
          title={`${title} 추이`}
          formatAxis={(v, step) => v.toFixed(step ? stepDecimals(step) : 1)}
          formatValue={(v) => v.toFixed(2)}
          referenceY={1}
          yWidth={40}
        />
      </ChartArea>
    </IndicatorCard>
  )
}

const HALVING_INTERVAL = 210_000 // 반감기 주기(블록)
const DAY_MS = 86_400_000

// 종목 무관 BTC 전용 지표라 응답 최상위 halving을 BTC 탭에만 놓는다
export function HalvingCard({ data, asOf }: { data: CryptoMarketIndicators['halving']; asOf: string }) {
  const title = 'BTC 반감기'
  const description = '21만 블록마다 채굴 보상이 절반으로 줄어듦\n예상 시점은 블록당 10분으로 계산한 추정치\n블록 높이: mempool.space'
  if (!data) {
    return <IndicatorCard title={title} description={description}><Unavailable /></IndicatorCard>
  }
  const daysLeft = Math.max(0, Math.ceil((Date.parse(data.estimatedAt) - Date.parse(asOf)) / DAY_MS))
  // 서버가 준 높이로만 계산하고 0~1로 묶어 막대·aria 값이 범위를 벗어나지 않게 한다
  const progress = Math.min(1, Math.max(0, (data.currentHeight - (data.nextHalvingHeight - HALVING_INTERVAL)) / HALVING_INTERVAL))

  return (
    <IndicatorCard title={title} description={description}>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Stat label="남은 블록" value={data.blocksRemaining.toLocaleString('en-US')} />
        <Stat label="예상 시점" value={`약 ${daysLeft.toLocaleString('en-US')}일 후`} />
      </div>
      <p className="text-xs text-muted-foreground">
        {fmtKstDate(data.estimatedAt)} 전후 · 블록 <span className="tabular-nums">{data.nextHalvingHeight.toLocaleString('en-US')}</span>
      </p>
      <div className="mt-auto flex flex-col gap-1.5 pt-2">
        <div
          role="progressbar"
          aria-label="이번 반감기 주기 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          {/* 진행률은 런타임 값이라 Tailwind로 표현할 수 없다 */}
          <div className="h-full rounded-full bg-chart-1" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>현재 블록 {data.currentHeight.toLocaleString('en-US')}</span>
          <span>{(progress * 100).toFixed(1)}%</span>
        </div>
      </div>
    </IndicatorCard>
  )
}
