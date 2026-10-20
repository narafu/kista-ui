'use client'

import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { Info } from 'lucide-react'
import { Surface } from '@shared/ui/Surface'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fmtCompactUsd, fmtSignedPercent } from '@shared/lib/format'
import { sma } from '@shared/lib/indicators'
import { cn } from '@shared/lib/utils'
import { fmtCompactUsdTick, fmtPercentTick, stepDecimals } from './niceTicks'
import type { CryptoMarketIndicators, CryptoTickerIndicators } from '@entities/market'

const IndicatorLineChart = dynamic(() => import('./IndicatorLineChart'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">차트 불러오는 중…</div>,
})

// 응답은 days=365로 한 번 받고 기간 토글은 최근 N일만 잘라 보여준다(1년·반년·분기·한 달 — 일봉 시장 차트의 200/120/50/20과 달리 달력 단위)
const DAYS_OPTIONS = [365, 180, 90, 30] as const
type Days = (typeof DAYS_OPTIONS)[number]

// 프리미엄·펀딩비는 0 근처를 오가 아주 작은 음수가 반올림되면 -0.00%가 된다 — 색 없이 숫자만 보여주는 카드라 +0.00%로 통일한다
// (공용 fmtSignedPercent는 손익 색(pnlTextClass)이 원값 부호를 따르는 화면이 많아 거기서 바꾸지 않는다)
const signedPct = (ratio: number, digits: number) => fmtSignedPercent(ratio, digits).replace(/^-(0\.0+%)$/, '+$1')
// 김프·테더 프리미엄은 이미 % 값이라 fmtSignedPercent(비율 입력)에 넘기기 전에 100으로 나눈다
const fmtPct = (percent: number) => signedPct(percent / 100, 2)
// 펀딩비는 비율 원값(0.0001 = 0.01%) — 평상시 기준선이 0.01%라 소수 넷째 자리까지 보여준다
const fmtFunding = (ratio: number) => signedPct(ratio, 4)
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

function InfoPopover({ title, description }: { title: string; description: string }) {
  return (
    <Popover>
      <PopoverTrigger aria-label={`${title} 설명`} className="inline-flex size-6 -my-[5px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
        <Info className="size-3.5" />
      </PopoverTrigger>
      {/* 설명은 줄 단위로 쓰되 좁은 화면에서는 줄 안에서도 어절 단위로 접혀 화면 밖으로 넘치지 않게 한다 */}
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] text-sm break-keep whitespace-pre-line">{description}</PopoverContent>
    </Popover>
  )
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
          <InfoPopover title={title} description={description} />
        </div>
      </div>
      {children}
    </Surface>
  )
}

// 카드는 그리드 행 높이로 늘어나므로 차트가 남는 아래 여백을 채운다(한 열 배치에서는 최소 높이)
function ChartArea({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('min-h-[200px] flex-1', className)}>{children}</div>
}

// 매일 크게 튀는 지표의 추세를 보이려고 30일 이동평균을 흐린 선으로 겹친다. 받은 전체 추이로 계산한 뒤 기간만큼 잘라 짧은 기간에서도 앞쪽 평균이 비지 않게 한다
const MA_PERIOD = 30
const MA_SERIES = { key: 'ma', name: '30일 평균', color: 'var(--muted-foreground)', strokeWidth: 1.5 }
function withMovingAverage<T extends { date: string }>(rows: readonly T[], value: (row: T) => number) {
  const ma = sma(rows.map(value), MA_PERIOD)
  return rows.map((row, i) => ({ ...row, ma: ma[i] }))
}

// 섹션이 null이면(지표별 실패 격리) 제목·설명은 그대로 두고 본문만 안내로 바꾼다
function UnavailableCard(props: Omit<IndicatorCardProps, 'children'>) {
  return (
    <IndicatorCard {...props}>
      <div className="flex h-[200px] items-center justify-center text-sm text-warn">일시적으로 불러올 수 없습니다.</div>
    </IndicatorCard>
  )
}

function Stat({ label, value, valueClassName = 'text-foreground' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-xl font-semibold tabular-nums', valueClassName)}>{value}</span>
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
  const [days, setDays] = useState<Days>(30)
  if (!data) {
    return <UnavailableCard title={title} description={description} />
  }
  const { official, tether } = data.current
  // 환율 조회 실패(official null)면 공식 기준 현재값·분해를 숨긴다. 추이 선은 과거 값이 하나라도 있으면 그린다
  const hasOfficial = official != null
  const hasOfficialHistory = data.history.some((p) => p.official != null)
  const series = [
    ...(hasOfficialHistory ? [{ key: 'official', name: '공식 환율 기준', color: 'var(--chart-1)' }] : []),
    { key: 'tether', name: '테더 기준', color: 'var(--info)' },
    { ...MA_SERIES, name: '테더 30일 평균' },
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
      {/* 범례가 붙는 여러 선 차트라 최소 높이를 더 준다 */}
      <ChartArea className="min-h-[224px]">
        <IndicatorLineChart
          data={withMovingAverage(data.history, (p) => p.tether).slice(-days)}
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

// ±0.01% 수준까지 작아져 펀딩비처럼 소수 넷째 자리까지 보여준다
const fmtCoinbasePct = (percent: number) => signedPct(percent / 100, 4)

export function CoinbasePremiumCard({ ticker, data }: { ticker: string; data: CryptoTickerIndicators['coinbasePremium'] }) {
  const title = `${ticker} Coinbase 프리미엄`
  const description = '코인베이스 USD가의 바이낸스 대비 할증(테더 보정)\n김프 = 한국 수요, Coinbase 프리미엄 = 미국 수요\n양수는 미국 현물 매수 우위'
  const [days, setDays] = useState<Days>(30)
  if (!data) {
    return <UnavailableCard title={title} description={description} />
  }

  return (
    <IndicatorCard title={title} description={description} days={days} onDaysChange={setDays}>
      <Stat label="현재" value={fmtCoinbasePct(data.current)} />
      <ChartArea className="min-h-[224px]">
        <IndicatorLineChart
          data={withMovingAverage(data.history, (p) => p.value).slice(-days)}
          series={[{ key: 'value', name: 'Coinbase 프리미엄', color: 'var(--chart-1)' }, MA_SERIES]}
          title={`${title} 추이`}
          formatAxis={fmtPercentTick}
          formatValue={fmtCoinbasePct}
          referenceY={0}
          yWidth={48}
        />
      </ChartArea>
    </IndicatorCard>
  )
}

export function FundingRateCard({ ticker, data }: { ticker: string; data: CryptoTickerIndicators['fundingRate'] }) {
  const title = `${ticker} 펀딩비`
  const description = '바이낸스 무기한 선물, 8시간 정산\n양수는 롱 과열, 음수는 숏 우세\n점선은 평상시 기준 0.01%'
  const [days, setDays] = useState<Days>(30)
  if (!data) {
    return <UnavailableCard title={title} description={description} />
  }
  // 차트는 % 단위로 그린다 — 기준선 0.01%(평상시 8시간 펀딩비)
  const history = withMovingAverage(data.history.map((p) => ({ date: p.date, value: p.value * 100 })), (p) => p.value).slice(-days)

  return (
    <IndicatorCard title={title} description={description} days={days} onDaysChange={setDays}>
      <div className="flex gap-6">
        <Stat label="현재" value={fmtFunding(data.current)} />
        <Stat label="다음 정산" value={`${fmtKstTime(data.nextFundingTime)} KST`} />
      </div>
      <ChartArea className="min-h-[224px]">
        <IndicatorLineChart
          data={history}
          series={[{ key: 'value', name: '일평균 펀딩비', color: 'var(--chart-1)' }, MA_SERIES]}
          title={`${title} 일평균 추이`}
          formatAxis={fmtPercentTick}
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
    return <UnavailableCard title={title} description={description} />
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
  const description = '200주 배수: 종가 ÷ 200주 이동평균, 1 미만은 장기 저점권\n메이어 멀티플: 종가 ÷ 200일 이동평균, 2.4 이상은 과열권\nATH 대비: 역대 최고가에서 내려온 폭'
  const [days, setDays] = useState<Days>(30)
  if (!data) {
    return <UnavailableCard title={title} description={description} />
  }
  const { current } = data

  return (
    <IndicatorCard title={title} description={description} days={days} onDaysChange={setDays}>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Stat label="200주 배수" value={fmtMultiple(current.wma200Multiple)} />
        <Stat label="메이어 멀티플" value={fmtMultiple(current.mayerMultiple)} />
        {/* 신고가 당일(0)이나 0으로 반올림되는 작은 하락은 fmtPct가 +0.00%로 그린다 — 하락률이 양수로 읽히지 않게 + 부호를 뗀다 */}
        <Stat label="ATH 대비" value={current.athDrawdownPercent < 0 ? fmtPct(current.athDrawdownPercent).replace('+', '') : '0.00%'} />
      </div>
      <p className="text-xs text-muted-foreground">{fmtUtcDate(current.date)} 종가 기준</p>
      <ChartArea className="min-h-[224px]">
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
    return <UnavailableCard title={title} description={description} />
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

// 아래 세 카드는 종목 무관 시장 전체 지표라 종목 탭 밖 한 줄에 둔다(응답 최상위 섹션)
const fmtPlainPct = (percent: number) => `${percent.toFixed(2)}%`

export function BtcDominanceCard({ data }: { data: CryptoMarketIndicators['btcDominance'] }) {
  const title = 'BTC 도미넌스'
  const description = '전체 크립토 시가총액 중 BTC 비중\n오르면 자금이 BTC로 몰림, 내리면 알트로 퍼짐\n출처: CoinMarketCap'
  const [days, setDays] = useState<Days>(30)
  if (!data) {
    return <UnavailableCard title={title} description={description} />
  }

  return (
    <IndicatorCard title={title} description={description} days={days} onDaysChange={setDays}>
      <Stat label="현재" value={fmtPlainPct(data.current)} />
      <ChartArea className="min-h-[224px]">
        <IndicatorLineChart
          data={withMovingAverage(data.history, (p) => p.value).slice(-days)}
          series={[{ key: 'value', name: 'BTC 도미넌스', color: 'var(--chart-1)' }, MA_SERIES]}
          title={`${title} 추이`}
          formatAxis={(v, step) => `${v.toFixed(step ? stepDecimals(step) : 1)}%`}
          formatValue={fmtPlainPct}
          yWidth={40}
        />
      </ChartArea>
    </IndicatorCard>
  )
}

// CMC 관례: 75 이상 알트코인 시즌, 25 이하 비트코인 시즌
const ALT_SEASON_BOUNDS = [25, 75] as const
const altSeasonPhase = (index: number) => (index >= 75 ? '알트코인 시즌' : index <= 25 ? '비트코인 시즌' : '중립')

export function AltcoinSeasonCard({ data }: { data: CryptoMarketIndicators['altcoinSeason'] }) {
  const title = '알트코인 시즌'
  const description = '상위 100개 알트 중 최근 90일 동안 BTC보다 많이 오른 비율(0~100)\n75 이상 알트코인 시즌, 25 이하 비트코인 시즌\n출처: CoinMarketCap'
  const [days, setDays] = useState<Days>(30)
  if (!data) {
    return <UnavailableCard title={title} description={description} />
  }
  // 이력은 비공식 API라 실패하면 서버가 빈 배열로 주고 현재값만 살린다 — 빈 차트 대신 안내로 바꾼다
  const hasHistory = data.history.length > 0
  // 표시 숫자와 구간 판정이 경계(25·75)에서 어긋나지 않게 반올림한 값 하나로 둘 다 계산한다
  const index = Math.round(data.current)

  return (
    <IndicatorCard title={title} description={description} days={hasHistory ? days : undefined} onDaysChange={setDays}>
      <div className="flex gap-6">
        <Stat label="현재" value={String(index)} />
        <Stat label="구간" value={altSeasonPhase(index)} />
      </div>
      {hasHistory ? (
        <ChartArea className="min-h-[224px]">
          <IndicatorLineChart
            data={withMovingAverage(data.history, (p) => p.value).slice(-days)}
            series={[{ key: 'value', name: '알트코인 시즌 지수', color: 'var(--chart-1)' }, MA_SERIES]}
            title={`${title} 추이`}
            formatAxis={(v) => String(Math.round(v))}
            formatValue={(v) => String(Math.round(v))}
            referenceY={ALT_SEASON_BOUNDS}
            yWidth={32}
          />
        </ChartArea>
      ) : (
        <p className="text-xs text-warn">추이를 불러오지 못해 현재 값만 표시합니다.</p>
      )}
    </IndicatorCard>
  )
}

const fmtHashrate = (eh: number) => `${Math.round(eh).toLocaleString('en-US')} EH/s`

export function HashRibbonsCard({ data }: { data: CryptoMarketIndicators['hashRibbons'] }) {
  const title = 'Hash Ribbons'
  const description = '채굴 해시레이트(EH/s)의 30일·60일 이동평균\n30일선이 60일선 아래면 채굴자 항복(바닥권 신호)\n항복에서 회복한 뒤 BTC 종가 10일 평균이 20일 평균을 처음 넘은 날이 매수 신호(세로 점선)\n출처: mempool.space'
  const [days, setDays] = useState<Days>(30)
  if (!data) {
    return <UnavailableCard title={title} description={description} />
  }
  const { state } = data.current
  // 최근 신호는 기간 토글과 무관하게 받은 전체 이력(최대 1년)에서 찾는다
  const lastSignal = data.history.findLast((p) => p.buySignal)
  const history = data.history.slice(-days)

  return (
    <IndicatorCard title={title} description={description} days={days} onDaysChange={setDays}>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Stat
          label="상태"
          value={state === 'CAPITULATION' ? '채굴자 항복' : state === 'RECOVERY' ? '회복' : '—'}
          valueClassName={state === 'CAPITULATION' ? 'text-warn' : 'text-foreground'}
        />
        <Stat
          label="최근 매수 신호"
          value={lastSignal ? fmtUtcDate(lastSignal.date) : '최근 1년 없음'}
          valueClassName={lastSignal ? 'text-pos' : 'text-foreground'}
        />
      </div>
      <p className="text-xs text-muted-foreground">{fmtUtcDate(data.current.date)} 기준</p>
      <ChartArea className="min-h-[224px]">
        <IndicatorLineChart
          data={history}
          // 일 해시레이트 원값은 매일 크게 튀어 축을 넓히고 30·60일선 교차를 가린다 — 교차가 지표의 핵심이라 평균선만 그린다
          series={[
            { key: 'sma30', name: '30일 평균', color: 'var(--chart-1)' },
            { key: 'sma60', name: '60일 평균', color: 'var(--info)' },
          ]}
          title={`${title} 추이`}
          formatAxis={(v) => Math.round(v).toLocaleString('en-US')}
          formatValue={fmtHashrate}
          markerDates={history.filter((p) => p.buySignal).map((p) => p.date)}
          yWidth={44}
        />
      </ChartArea>
    </IndicatorCard>
  )
}

const HALVING_INTERVAL = 210_000 // 반감기 주기(블록)
const DAY_MS = 86_400_000

// 종목 무관 BTC 전용 지표라 응답 최상위 halving을 탭 밖 섹션 제목 줄에 둔다(ETH 탭에서도 보인다 — 반감기는 크립토 시장 전체 사이클의 기준).
// 며칠 단위로만 바뀌는 참고 정보라 카드 대신 한 줄로 줄이고 세부 값은 설명 팝오버로 옮긴다
export function HalvingSummary({ data, asOf }: { data: NonNullable<CryptoMarketIndicators['halving']>; asOf: string }) {
  const title = 'BTC 반감기'
  const daysLeft = Math.max(0, Math.ceil((Date.parse(data.estimatedAt) - Date.parse(asOf)) / DAY_MS))
  // 서버가 준 높이로만 계산하고 0~1로 묶어 막대·aria 값이 범위를 벗어나지 않게 한다
  const progress = Math.min(1, Math.max(0, (data.currentHeight - (data.nextHalvingHeight - HALVING_INTERVAL)) / HALVING_INTERVAL))
  const block = (n: number) => n.toLocaleString('en-US')
  const description = [
    '21만 블록마다 채굴 보상이 절반으로 줄어듦',
    `예상 시점: ${fmtKstDate(data.estimatedAt)} 전후(블록당 10분으로 계산한 추정치)`,
    `남은 블록 ${block(data.blocksRemaining)} · 현재 블록 ${block(data.currentHeight)} / 반감기 블록 ${block(data.nextHalvingHeight)}`,
    '블록 높이: mempool.space',
  ].join('\n')

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{title}</span>
      <span className="tabular-nums">약 {daysLeft.toLocaleString('en-US')}일 후</span>
      <div
        role="progressbar"
        aria-label="이번 반감기 주기 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"
      >
        {/* 진행률은 런타임 값이라 Tailwind로 표현할 수 없다 */}
        <div className="h-full rounded-full bg-chart-1" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="tabular-nums">{(progress * 100).toFixed(1)}%</span>
      <InfoPopover title={title} description={description} />
    </div>
  )
}
