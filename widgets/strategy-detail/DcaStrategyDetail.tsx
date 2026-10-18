'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useManageStrategyMutations } from '@features/strategy/manage-strategy'
import { useMeta } from '@entities/meta'
import { dcaIndicatorLabel, formatCryptoNextExecution, formatDcaCondition, formatDcaSchedule, isScheduledStart, scheduledStartBadgeLabel } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { cryptoPortfolioQueryOptions } from '@entities/trade'
import { fmtDate, fmtKrw, fmtMoney, fmtQuantity, fmtSignedPercent, pnlTextClass } from '@shared/lib/format'
import { Badge } from '@shared/ui/Badge'
import { cn } from '@shared/lib/utils'
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="pb-1 text-xs font-semibold text-[var(--brand-fg-soft)]">{children}</h2>
}

// 코인은 계좌 포트폴리오(업비트 잔고)에서 이 티커의 수량·평단가·평가금액을 찾는다 — 계좌 상세와 같은 쿼리 캐시를 공유.
// api currentHoldings는 cycle_position 기반 Integer라 소수 단위 코인 수량을 담지 못해 쓰지 않는다
function CryptoHoldingRows({ accountId, ticker }: { accountId: string; ticker: string }) {
  const { data, isError } = useQuery(cryptoPortfolioQueryOptions(accountId))
  if (isError && !data) {
    return (
      <>
        <Row label="보유 수량">-</Row>
        <p className="text-xs text-muted-foreground">보유 정보를 불러오지 못했습니다.</p>
      </>
    )
  }
  if (!data) return <Row label="보유 수량">-</Row>
  const holding = data.holdings.find((h) => h.ticker === ticker)
  if (!holding) return <Row label="보유 수량">{`0 ${ticker}`}</Row>
  const priced = holding.currentPrice != null
  const returnRatio = priced && holding.avgBuyPrice > 0 ? holding.currentPrice! / holding.avgBuyPrice - 1 : null
  return (
    <>
      <Row label="보유 수량">{`${fmtQuantity(holding.quantity)} ${ticker}`}</Row>
      <Row label="평단가">{fmtKrw(holding.avgBuyPrice)}</Row>
      <Row label="평가금액">{priced ? fmtKrw(holding.evalAmountKrw) : '현재가 확인 불가'}</Row>
      {returnRatio != null && <Row label="수익률"><span className={pnlTextClass(returnRatio)}>{fmtSignedPercent(returnRatio)}</span></Row>}
    </>
  )
}

// DCA 상세 — 바로 주문·미리보기 미지원(409)이라 NextOrderCard 대신 상태·일정·매매 설정·보유 현황·회차 이력을 표시
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
  const scheduledStart = isScheduledStart(strategy)
  const statusLabel = strategy.status === 'ACTIVE' ? null : labelOf('strategyStatuses', strategy.status)
  const toggleLabel = toggleLoading ? '처리 중...' : strategy.status === 'ACTIVE' ? '일시중지' : '재개'

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          {(scheduledStart || statusLabel) && (
            <div data-testid="strategy-status-group" className="flex flex-wrap items-center gap-2">
              {statusLabel && <Badge tone="neutral" size="md">{statusLabel}</Badge>}
              {scheduledStart && (
                <Badge tone="none" size="md" className="bg-info-bg text-info">{scheduledStartBadgeLabel(strategy.startDate!)}</Badge>
              )}
            </div>
          )}
          {dca && (
            <section>
              <SectionTitle>일정</SectionTitle>
              <Row label="주기">{formatDcaSchedule(dca, labelOf('dcaFrequencies', dca.frequency))}</Row>
              {isCrypto
                ? <Row label="다음 실행">{formatCryptoNextExecution(dca.nextExecution?.kstTradeDate, dca.executionHour)}</Row>
                : <Row label="다음 판정일">{dca.nextExecution ? fmtDate(dca.nextExecution.kstTradeDate) : '미정'}</Row>}
            </section>
          )}
          {dca && (
            <section className="border-t border-border pt-4">
              <SectionTitle>매매 설정</SectionTitle>
              <Row label="방향">{labelOf('orderDirections', dca.direction)}</Row>
              <Row label="회차당 금액">{fmtMoney(dca.amount, isCrypto ? 'KRW' : 'USD')}</Row>
              <Row label="주문 방식">{labelOf('orderTypes', dca.orderType)}</Row>
              <div className="pt-1.5 text-sm">
                <div className="text-muted-foreground">추가 조건</div>
                {dca.conditions.length === 0 ? (
                  <p className="mt-1">조건 없이 매 회차 주문</p>
                ) : (
                  <>
                    <ul className="mt-1 space-y-1 font-semibold">
                      {dca.conditions.map((c, i) => (
                        <li key={i}>{formatDcaCondition(c, dcaIndicatorLabel(c.indicator, labelOf('dcaIndicators', c.indicator), isCrypto), labelOf('dcaOperators', c.operator))}</li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-muted-foreground">조건 충족 여부는 실행일에 판정</p>
                  </>
                )}
              </div>
            </section>
          )}
          <section className={cn(dca && 'border-t border-border pt-4')}>
            <SectionTitle>보유 현황</SectionTitle>
            {isCrypto
              ? <CryptoHoldingRows accountId={accountId} ticker={strategy.ticker} />
              : <Row label="보유 수량">{strategy.currentHoldings != null ? `${fmtQuantity(strategy.currentHoldings)}주` : '-'}</Row>}
            <p className="text-xs text-muted-foreground">계좌 전체 보유 기준</p>
          </section>
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
