'use client'

import { cn } from '@shared/lib/utils'
import { fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'

export interface OrderRowData {
  id?: string
  ticker: string
  direction: string
  quantity: number
  price: string
  status?: string  // PLACED이면 취소 버튼 미표시 (선접수 완료)
}

interface Props {
  orders: OrderRowData[]
  onCancelOne?: (id: string) => void
  cancellingId?: string | null
  cancelPending?: boolean
}

const directionBadgeCls = (direction: string) =>
  direction === 'BUY'
    ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
    : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'

const directionLabel = (direction: string) => direction === 'BUY' ? '매수' : '매도'

export function OrderRows({ orders, onCancelOne, cancellingId, cancelPending }: Props) {
  const hasCancel = !!onCancelOne

  return (
    <>
      {/* 모바일 리스트 */}
      <ul className="lg:hidden">
        <li className={cn(
          'grid items-center px-6 py-2 border-b border-border bg-muted/50 text-xs text-muted-foreground text-center',
          hasCancel ? 'grid-cols-5' : 'grid-cols-4',
        )}>
          <span>구분</span>
          <span>종목</span>
          <span>수량</span>
          <span>주문가</span>
          {hasCancel && <span>취소</span>}
        </li>
        {orders.map((o, i) => (
          <li key={o.id ?? `${o.ticker}-${o.direction}-${i}`} className={cn(
            'grid items-center text-sm px-6 py-3 border-b border-border last:border-b-0 text-center',
            hasCancel ? 'grid-cols-5' : 'grid-cols-4',
          )}>
            <div className="flex justify-center">
              <span className={cn('inline-flex items-center px-2 h-[20px] rounded-full text-xs font-semibold', directionBadgeCls(o.direction))}>
                {directionLabel(o.direction)}
              </span>
            </div>
            <span className="font-medium">{o.ticker}</span>
            <span className="text-muted-foreground">{o.quantity}</span>
            <span className="font-semibold">${fmtUsd(toNum(o.price))}</span>
            {hasCancel && (
              <div className="flex justify-center">
                {o.id && o.status !== 'PLACED' ? (
                  <button
                    type="button"
                    onClick={() => onCancelOne(o.id!)}
                    disabled={cancelPending}
                    className="text-xs px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-rose-600 disabled:opacity-50"
                  >
                    {cancelPending && cancellingId === o.id ? '취소 중...' : '취소'}
                  </button>
                ) : <span />}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* PC 테이블 */}
      <table className="hidden lg:table w-full">
        <thead>
          <tr>
            <th className="px-5 py-2.5 text-left text-sm lg:text-base uppercase tracking-widest text-[var(--brand-fg-soft)] bg-muted/50 border-b border-border font-semibold">구분</th>
            <th className="px-5 py-2.5 text-left text-sm lg:text-base uppercase tracking-widest text-[var(--brand-fg-soft)] bg-muted/50 border-b border-border font-semibold">종목</th>
            <th className="px-5 py-2.5 text-right text-sm lg:text-base uppercase tracking-widest text-[var(--brand-fg-soft)] bg-muted/50 border-b border-border font-semibold">수량</th>
            <th className="px-5 py-2.5 text-right text-sm lg:text-base uppercase tracking-widest text-[var(--brand-fg-soft)] bg-muted/50 border-b border-border font-semibold">주문가</th>
            {hasCancel && (
              <th className="px-5 py-2.5 text-right text-sm lg:text-base uppercase tracking-widest text-[var(--brand-fg-soft)] bg-muted/50 border-b border-border font-semibold">취소</th>
            )}
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <tr key={o.id ?? `${o.ticker}-${o.direction}-${i}`} className="border-b border-border last:border-b-0">
              <td className="px-5 py-3">
                <span className={cn('inline-flex items-center px-2 h-[20px] lg:h-[24px] rounded-full text-xs lg:text-sm font-semibold', directionBadgeCls(o.direction))}>
                  {directionLabel(o.direction)}
                </span>
              </td>
              <td className="px-5 py-3 text-sm lg:text-base font-semibold">{o.ticker}</td>
              <td className="px-5 py-3 text-sm lg:text-base text-muted-foreground text-right">{o.quantity}</td>
              <td className="px-5 py-3 text-sm lg:text-base font-semibold text-right">${fmtUsd(toNum(o.price))}</td>
              {hasCancel && (
                <td className="px-5 py-3 text-right">
                  {o.id && o.status !== 'PLACED' && (
                    <button
                      type="button"
                      onClick={() => onCancelOne(o.id!)}
                      disabled={cancelPending}
                      className="text-sm lg:text-base px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-rose-600 disabled:opacity-50"
                    >
                      {cancelPending && cancellingId === o.id ? '취소 중...' : '취소'}
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
