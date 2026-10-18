'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useManageStrategyMutations } from '@features/strategy/manage-strategy'
import { useMeta } from '@entities/meta'
import { dcaIndicatorLabel, formatCryptoNextExecution, formatDcaCondition, formatDcaSchedule } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { fmtDate, fmtMoney, fmtQuantity } from '@shared/lib/format'
import { isCryptoMarket } from '@shared/lib/api-schema'
import { DeleteStrategyDialog } from './DeleteStrategyDialog'
import { DcaExecutionHistory } from './DcaExecutionHistory'

interface Props {
  accountId: string
  strategy: Strategy
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  )
}

// DCA 상세 — 바로 주문·미리보기 미지원(409)이라 NextOrderCard 대신 설정·다음 판정일·회차 이력을 표시
// dca가 없어도(응답 누락) 보유 수량·이력·중지/삭제는 그대로 노출한다
export function DcaStrategyDetail({ accountId, strategy }: Props) {
  const { push } = useRouter()
  const { labelOf, findTicker } = useMeta()
  const isCrypto = isCryptoMarket(findTicker(strategy.ticker)?.market)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { dca } = strategy
  const { pause, resume, remove, isPausing, isResuming, isDeleting } = useManageStrategyMutations({
    onDeleted: () => push(`/accounts/${accountId}`),
    strategyId: strategy.id,
  })
  const toggleLoading = isPausing || isResuming
  const loading = toggleLoading || isDeleting
  const toggleLabel = toggleLoading ? '처리 중...' : strategy.status === 'ACTIVE' ? '일시중지' : '재개'

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          {dca && (
            <>
              <Row label="방향">{labelOf('orderDirections', dca.direction)}</Row>
              <Row label="주기">{formatDcaSchedule(dca, labelOf('dcaFrequencies', dca.frequency))}</Row>
              <Row label="회차당 금액">{fmtMoney(dca.amount, isCrypto ? 'KRW' : 'USD')}</Row>
              <Row label="주문 방식">{labelOf('orderTypes', dca.orderType)}</Row>
              {isCrypto
                ? <Row label="다음 실행">{formatCryptoNextExecution(dca.nextExecution?.kstTradeDate, dca.executionHour)}</Row>
                : <Row label="다음 판정일">{dca.nextExecution ? fmtDate(dca.nextExecution.kstTradeDate) : '미정'}</Row>}
              <p className="text-xs text-muted-foreground">조건 충족 여부는 실행일에 판정</p>
            </>
          )}
          <Row label="보유 수량">{strategy.currentHoldings != null ? (isCrypto ? `${fmtQuantity(strategy.currentHoldings)} ${strategy.ticker}` : `${fmtQuantity(strategy.currentHoldings)}주`) : '-'}</Row>
          <p className="text-xs text-muted-foreground">계좌 전체 보유 기준</p>
          {dca && (
            <div className="pt-3">
              <div className="text-sm text-muted-foreground">추가 조건</div>
              {dca.conditions.length === 0 ? (
                <p className="text-sm">조건 없이 매 회차 주문</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm font-semibold">
                  {dca.conditions.map((c, i) => (
                    <li key={i}>{formatDcaCondition(c, dcaIndicatorLabel(c.indicator, labelOf('dcaIndicators', c.indicator), isCrypto), labelOf('dcaOperators', c.operator))}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <DcaExecutionHistory strategyId={strategy.id} ticker={strategy.ticker} />

      <Card>
        <CardContent className="p-5 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" disabled={loading}
            onClick={() => (strategy.status === 'ACTIVE' ? pause(strategy) : resume(strategy))}>
            {toggleLabel}
          </Button>
          <DeleteStrategyDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            ticker={strategy.ticker}
            onConfirm={() => remove(strategy)}
            disabled={loading}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
