'use client'

import { useSyncExternalStore } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@shared/lib/utils'

// 현금비중 경고 기준 — 이 아래 구간은 배경 음영으로 구분한다
export const CASH_THRESHOLD = 0.5

// 패널 높이 — 실제 차트와 스켈레톤이 같은 값을 써서 로딩 전후 레이아웃이 튀지 않게 한다
export const PANEL_HEIGHT = { price: 'h-[260px]', cash: 'h-[110px]', pnl: 'h-[144px] sm:h-[176px]' }

// 평단가-종가 괴리 단계 — 종가가 평단가에서 위아래로 10%·20% 이상 벌어지면 평단가를 색으로 강조한다
const AVG_GAP_LEVELS = [0.1, 0.2] as const

export function avgGapLevel(close: number | null, avgPrice: number | null): 0 | 1 | 2 {
  if (close == null || avgPrice == null || avgPrice <= 0) return 0
  const gap = Math.abs(close - avgPrice) / avgPrice
  return gap >= AVG_GAP_LEVELS[1] ? 2 : gap >= AVG_GAP_LEVELS[0] ? 1 : 0
}

// 부호 없는 정수 % — 현금비중처럼 0~1 비율을 그대로 보여줄 때 쓴다 (다른 사용처는 아직 없어 로컬 유지)
export function fmtPercent(ratio: number) {
  return `${Math.round(ratio * 100)}%`
}

// 범례와 툴팁이 같은 표식을 쓰도록 한곳에 둔다 — 툴팁 값과 차트 요소를 눈으로 짝짓기 위함
// 매수는 채운 원, 매도는 속이 빈 원 — 색만으로 구분하지 않도록 모양도 다르게 한다
export const SWATCH = {
  close: 'h-0.5 w-4 bg-[var(--chart-2)]',
  avgPrice: 'w-4 border-t-2 border-dashed border-[var(--foreground)]',
  // 차트 배경 띠와 같은 토큰
  avgGap1: 'h-2 w-4 rounded-sm bg-[var(--avg-gap-1-bg)]',
  avgGap2: 'h-2 w-4 rounded-sm bg-[var(--avg-gap-2-bg)]',
  buy: 'size-2.5 rounded-full bg-[var(--pos)]',
  sell: 'size-2.5 rounded-full border-2 border-[var(--neg)] bg-card',
  cash: 'h-2 w-4 rounded-sm bg-[var(--info)]',
  cashLow: 'h-2 w-4 rounded-sm border border-[var(--warn)] bg-[var(--warn-bg)]',
  boundary: 'h-3 w-0 border-l border-dashed border-muted-foreground',
  profit: 'h-2 w-4 rounded-sm bg-[var(--pos)]',
  loss: 'h-2 w-4 rounded-sm bg-[var(--neg)]',
  flat: 'h-2 w-4 rounded-sm bg-muted-foreground',
  cumulative: 'h-0.5 w-4 bg-[var(--chart-4)]',
  // 범례용 — 확정 손익 영역은 이익/손실에 따라 두 색이라 반반으로 보여준다
  confirmed: 'h-2 w-4 rounded-sm bg-[linear-gradient(90deg,var(--pos)_50%,var(--neg)_50%)]',
}

// 범례 — 종가·평단가·주문·현금비중·누적 손익은 하단 정보 줄이 같은 표식과 값으로 보여줘, 정보 줄로 알 수 없는 차트 장식만 둔다.
// 확정 손익 영역은 이익/손실 두 색이고 모바일 정보 줄에는 값이 없어 남긴다
export const LEGEND_ITEMS: Array<{ label: string; swatch: string }> = [
  { label: '사이클 경계', swatch: SWATCH.boundary },
  { label: '현금비중 50% 미만', swatch: SWATCH.cashLow },
  { label: '확정 손익(종료 사이클)', swatch: SWATCH.confirmed },
]

// 괴리 강조를 켰을 때만 괴리 단계 띠 표식을 덧붙인다
export const LEGEND_ITEMS_WITH_AVG_GAP = [
  ...LEGEND_ITEMS,
  { label: '평단가 괴리 10% 이상', swatch: SWATCH.avgGap1 },
  { label: '평단가 괴리 20% 이상', swatch: SWATCH.avgGap2 },
]

export function Swatch({ className }: { className: string }) {
  return (
    <span className="inline-flex w-4 shrink-0 items-center justify-center" aria-hidden>
      <span className={cn('inline-block', className)} />
    </span>
  )
}

export function ChartSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="차트 불러오는 중" className="space-y-3">
      <Skeleton className={PANEL_HEIGHT.price} />
      <Skeleton className={PANEL_HEIGHT.cash} />
      <Skeleton className={PANEL_HEIGHT.pnl} />
    </div>
  )
}

// sm(640px) 미만 여부 — 서버 스냅샷은 false(PC 기준), 클라이언트 첫 렌더 직후 실제 값으로 맞춰진다
const NARROW_QUERY = '(max-width: 639px)'
function subscribeNarrow(onChange: () => void) {
  const mq = window.matchMedia(NARROW_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
export function useIsNarrow() {
  return useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW_QUERY).matches, () => false)
}
