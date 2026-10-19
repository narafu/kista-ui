'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@widgets/kpi-card'
import { useManageStrategyMutations } from '@features/strategy/manage-strategy'
import { useMeta } from '@entities/meta'
import { dcaIndicatorLabel, formatCryptoNextExecution, formatDcaCondition, formatDcaSchedule } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { cryptoPortfolioQueryOptions, directionBadgeClass } from '@entities/trade'
import { fmtDate, fmtKrw, fmtMoney, fmtQuantity, fmtSignedPercent, pnlTextClass } from '@shared/lib/format'
import { Badge } from '@shared/ui/Badge'
import { cn } from '@shared/lib/utils'
import { isCryptoMarket } from '@shared/lib/api-schema'
import { StatusStrip } from './StrategyMetaSection'
import { DeleteStrategyDialog } from './DeleteStrategyDialog'
import { DcaExecutionHistory } from './DcaExecutionHistory'

interface Props {
  accountId: string
  strategy: Strategy
}

// 주식 전략 상세(StrategyMetaSection)와 같은 타일 크기 — 원화 금액이 모바일 2열에서 줄바꿈되지 않게 한 단계 작게 둔다
const TILE = { className: 'p-4 lg:p-5', valueClassName: 'text-xl lg:text-2xl tabular-nums break-keep' }
// 보유 현황은 원화 9자리·코인 소수 8자리라 모바일 2열에서 한 단계 더 작게, 단위가 숫자와 떨어지지 않게 둔다
const HOLDING_TILE = { className: TILE.className, valueClassName: 'text-base sm:text-xl lg:text-2xl tabular-nums break-keep' }
const UNAVAILABLE = <span className="text-base font-normal text-muted-foreground">확인 불가</span>
const HOLDINGS_SUB = '계좌 전체 보유 기준'

// 코인은 계좌 포트폴리오(업비트 잔고)에서 이 티커의 수량·평단가·평가금액을 찾는다 — 계좌 상세와 같은 쿼리 캐시를 공유.
// api는 코인 전략의 currentHoldings를 항상 null로 내려준다(코인 DCA는 cycle_position을 갱신하지 않음, kista-api 9bf959f6) — 코인 보유의 SSOT는 crypto-portfolio
function CryptoHoldingGrid({ accountId, ticker }: { accountId: string; ticker: string }) {
  const { data, isError } = useQuery(cryptoPortfolioQueryOptions(accountId))
  if (isError && !data) {
    return (
      <Card>
        <CardContent className="p-5 text-center text-sm text-muted-foreground">보유 정보를 불러오지 못했습니다.</CardContent>
      </Card>
    )
  }
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {['보유 수량', '평단가', '평가금액', '수익률'].map((label) => <KpiCard key={label} label={label} skeleton {...HOLDING_TILE} />)}
      </div>
    )
  }
  const holding = data.holdings.find((h) => h.ticker === ticker)
  const priced = holding?.currentPrice != null
  const returnRatio = holding && priced && holding.avgBuyPrice > 0 ? holding.currentPrice! / holding.avgBuyPrice - 1 : null
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard label="보유 수량" value={`${fmtQuantity(holding?.quantity ?? 0)} ${ticker}`} sub={HOLDINGS_SUB} {...HOLDING_TILE} />
      <KpiCard label="평단가" value={holding ? fmtKrw(holding.avgBuyPrice) : '-'} {...HOLDING_TILE} />
      <KpiCard label="평가금액" value={!holding ? '-' : priced ? fmtKrw(holding.evalAmountKrw) : UNAVAILABLE} {...HOLDING_TILE} />
      <KpiCard
        label="수익률"
        value={returnRatio == null ? (holding && !priced ? UNAVAILABLE : '-') : <span className={pnlTextClass(returnRatio)}>{fmtSignedPercent(returnRatio)}</span>}
        {...HOLDING_TILE}
      />
    </div>
  )
}

// DCA 상세 — 바로 주문·미리보기 미지원(409)이라 NextOrderCard 대신 설정 타일·보유 현황·추가 조건·회차 이력을 표시.
// 구성은 주식 전략 상세(StatusStrip + KpiCard 그리드 → 이력 → 제어 카드)를 따른다
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
      <StatusStrip strategy={strategy} />

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="전략타입" value={labelOf('strategyTypes', strategy.type)} {...TILE} />
        {dca && (
          <KpiCard
            label="방향"
            value={<Badge tone="none" size="md" className={cn('h-[28px] text-base lg:h-[36px]', directionBadgeClass(dca.direction))}>{labelOf('orderDirections', dca.direction)}</Badge>}
            {...TILE}
          />
        )}
      </div>

      {dca && (
        <div data-testid="dca-config-grid" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="주기" value={formatDcaSchedule(dca, labelOf('dcaFrequencies', dca.frequency))} {...TILE} />
          {isCrypto
            ? <KpiCard label="다음 실행" value={formatCryptoNextExecution(dca.nextExecution?.kstTradeDate, dca.executionHour)} {...TILE} />
            : <KpiCard label="다음 판정일" value={dca.nextExecution ? fmtDate(dca.nextExecution.kstTradeDate) : '미정'} {...TILE} />}
          <KpiCard label="회차당 금액" value={fmtMoney(dca.amount, isCrypto ? 'KRW' : 'USD')} {...TILE} />
          <KpiCard label="주문 방식" value={labelOf('orderTypes', dca.orderType)} {...TILE} />
        </div>
      )}

      {isCrypto ? (
        <CryptoHoldingGrid accountId={accountId} ticker={strategy.ticker} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="보유 수량" value={strategy.currentHoldings != null ? `${fmtQuantity(strategy.currentHoldings)}주` : '-'} sub={HOLDINGS_SUB} {...TILE} />
        </div>
      )}

      {dca && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">추가 조건</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {dca.conditions.length === 0 ? (
              <p>조건 없이 매 회차 주문</p>
            ) : (
              <>
                <ul className="space-y-1 font-semibold">
                  {dca.conditions.map((c, i) => (
                    <li key={i}>{formatDcaCondition(c, dcaIndicatorLabel(c.indicator, labelOf('dcaIndicators', c.indicator), isCrypto), labelOf('dcaOperators', c.operator))}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">조건 충족 여부는 실행일에 판정</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

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
