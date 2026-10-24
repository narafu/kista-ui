import { useMeta } from '@entities/meta'
import type { ReorderSummary } from './model/types'

interface Props {
  actionError: string | null
  reorderResult: ReorderSummary | null
}

export function AdminTradesFeedback({ actionError, reorderResult }: Props) {
  const { labelOf } = useMeta()
  return (
    <>
      {actionError ? (
        <section
          role="alert"
          className="rounded-[var(--r-lg)] border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4 text-status-error"
          aria-label="재주문 오류"
        >
          <p className="text-sm font-medium">{actionError}</p>
        </section>
      ) : null}

      {reorderResult ? (
        <section
          className="rounded-[var(--r-lg)] border border-status-ok/20 bg-status-ok-bg p-4 text-status-ok"
          role="status"
          aria-label="재주문 결과"
        >
          <h2 className="text-base font-semibold">거래일 재주문이 완료되었습니다</h2>
          <p className="mt-1 text-sm">처리 {reorderResult.processed}건 · 제외 {reorderResult.skipped}건</p>
          <p className="mt-2 text-sm">
            {reorderResult.results
              .map((r) => `${r.sourceOrderId.slice(-8)}: ${labelOf('orderStatuses', r.originalStatus)} → ${labelOf('orderStatuses', r.resultingStatus)}`)
              .join(' / ')}
          </p>
        </section>
      ) : null}
    </>
  )
}
