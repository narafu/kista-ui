import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@shared/lib/utils'

// 현금비중 경고 기준 — 이 아래 구간은 배경 음영으로 구분한다
export const CASH_THRESHOLD = 0.5

// 패널 높이 — 실제 차트와 스켈레톤이 같은 값을 써서 로딩 전후 레이아웃이 튀지 않게 한다
export const PANEL_HEIGHT = { price: 'h-[260px]', cash: 'h-[110px]', pnl: 'h-[176px]' }

// 부호 없는 정수 % — 현금비중처럼 0~1 비율을 그대로 보여줄 때 쓴다 (다른 사용처는 아직 없어 로컬 유지)
export function fmtPercent(ratio: number) {
  return `${Math.round(ratio * 100)}%`
}

// 범례와 툴팁이 같은 표식을 쓰도록 한곳에 둔다 — 툴팁 값과 차트 요소를 눈으로 짝짓기 위함
// 매수는 채운 원, 매도는 속이 빈 원 — 색만으로 구분하지 않도록 모양도 다르게 한다
export const SWATCH = {
  close: 'h-0.5 w-4 bg-[var(--chart-2)]',
  avgPrice: 'w-4 border-t-2 border-dashed border-[var(--foreground)]',
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

// 범례 — 패널마다 recharts Legend를 두면 차트 사이에 떠서 산만해 카드 상단에 패널별 묶음으로 모은다
export const LEGEND_GROUPS: Array<{ title: string; items: Array<{ label: string; swatch: string }> }> = [
  {
    title: '가격',
    items: [
      { label: '종가', swatch: SWATCH.close },
      { label: '평단가', swatch: SWATCH.avgPrice },
      { label: '매수 주문', swatch: SWATCH.buy },
      { label: '매도 주문', swatch: SWATCH.sell },
    ],
  },
  {
    title: '현금비중',
    items: [
      { label: '현금비중', swatch: SWATCH.cash },
      { label: '현금비중 50% 미만', swatch: SWATCH.cashLow },
    ],
  },
  {
    title: '손익',
    items: [
      { label: '확정 손익(종료 사이클)', swatch: SWATCH.confirmed },
      { label: '누적 실현손익(진행 포함)', swatch: SWATCH.cumulative },
    ],
  },
  { title: '공통', items: [{ label: '사이클 경계', swatch: SWATCH.boundary }] },
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
