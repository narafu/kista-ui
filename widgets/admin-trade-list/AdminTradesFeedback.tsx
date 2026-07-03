'use client'

import type { ReorderSummary } from './adminTradesReducer'

interface Props {
  actionError: string | null
  reorderResult: ReorderSummary | null
}

export function AdminTradesFeedback({ actionError, reorderResult }: Props) {
  return (
    <>
      {actionError ? (
        <section
          className="rounded-[var(--r-lg)] border border-rose-300 bg-rose-50 p-4 text-rose-950 dark:border-rose-800/80 dark:bg-rose-900/40 dark:text-rose-100"
          aria-label="재주문 오류"
        >
          <p className="text-sm font-medium">{actionError}</p>
        </section>
      ) : null}

      {reorderResult ? (
        <section
          className="rounded-[var(--r-lg)] border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-950/70 dark:bg-emerald-950/20 dark:text-emerald-200"
          aria-label="재주문 결과"
        >
          <h2 className="text-base font-semibold">거래일 재주문이 완료되었습니다</h2>
          <p className="mt-1 text-sm">처리 {reorderResult.processed}건 · 제외 {reorderResult.skipped}건</p>
          <p className="mt-2 text-sm">
            {reorderResult.results
              .map((r) => `${r.sourceOrderId.slice(-8)}: ${r.originalStatus} → ${r.resultingStatus}`)
              .join(' / ')}
          </p>
        </section>
      ) : null}
    </>
  )
}
