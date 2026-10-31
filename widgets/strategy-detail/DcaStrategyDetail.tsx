'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@widgets/kpi-card'
import { useManageStrategyMutations } from '@features/strategy/manage-strategy'
import { useMeta } from '@entities/meta'
import { dcaIndicatorLabel, formatCryptoNextExecution, formatDcaCondition, DcaRuleSummaryLabel } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { useAccountPricesQuery } from '@entities/account'
import { cryptoPortfolioQueryOptions, cryptoPricesQueryOptions, directionBadgeClass } from '@entities/trade'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtMoney, fmtQuantity, fmtSignedPercent, pnlTextClass, roundMoney } from '@shared/lib/format'
import { brokerMarket, isCryptoMarket, marketCurrency } from '@shared/lib/api-schema'
import type { TradingMarket } from '@shared/lib/api-schema'
import { StrategyInfoCard } from './StrategyMetaSection'
import { DeleteStrategyDialog } from './DeleteStrategyDialog'
import { DcaExecutionHistory } from './DcaExecutionHistory'

interface Props {
  accountId: string
  broker: string
  strategy: Strategy
}

// 주식 전략 상세(StrategyMetaSection)와 같은 타일 크기 — 원화 금액이 모바일 2열에서 줄바꿈되지 않게 한 단계 작게 둔다
const TILE = { className: 'p-4 lg:p-5', valueClassName: 'text-xl lg:text-2xl tabular-nums break-keep' }
// 보유 현황은 원화 9자리·코인 소수 8자리라 모바일 2열에서 한 단계 더 작게, 단위가 숫자와 떨어지지 않게 둔다
const HOLDING_TILE = { className: TILE.className, valueClassName: 'text-base sm:text-xl lg:text-2xl tabular-nums break-keep' }
// 규칙 카드는 한 줄 배치라 메타 라벨(가용만큼 주문·주문하지 않음) 대신 짧게 — 모르는 코드는 메타 라벨로
const SHORTFALL_SHORT: Record<string, string> = { PARTIAL: '잔량', REJECT: '주문 안 함' }
const UNAVAILABLE = <span className="text-base font-normal text-muted-foreground">확인 불가</span>

// 보유 수량·평단가는 원장(dca.currentHoldings·avgPrice)이 SSOT, 현재가만 시장별로 따로 받는다.
// 크립토는 계좌 상세와 캐시를 공유하는 crypto-portfolio, 주식은 prices — 크립토 계좌로 prices를 부르면 400이라 enabled로 갈라 둔다
function DcaHoldingGrid({ accountId, strategy, market }: { accountId: string; strategy: Strategy; market: TradingMarket }) {
  const isCrypto = isCryptoMarket(market)
  const { ticker, dca } = strategy
  const holdings = dca?.currentHoldings ?? null
  const avg = dca?.avgPrice ?? null
  const currency = marketCurrency(market)
  const portfolio = useQuery({ ...cryptoPortfolioQueryOptions(accountId), enabled: isCrypto })
  const prices = useAccountPricesQuery(accountId, [ticker], { enabled: !isCrypto })
  const balancePrice = portfolio.data?.holdings.find((h) => h.ticker === ticker)?.currentPrice
  // 원장 보유가 실잔고에 없으면(거래소에서 직접 매도 등) 현재가도 없다 — 그때만 공개 시세로 채운다
  const needsFallback = isCrypto && holdings != null && balancePrice == null && (!!portfolio.data || portfolio.isError)
  const fallback = useQuery({ ...cryptoPricesQueryOptions(accountId, [ticker]), enabled: needsFallback })
  const price = isCrypto ? balancePrice ?? fallback.data?.[ticker] : prices.data?.[ticker]
  const settled = isCrypto
    ? (!!portfolio.data || portfolio.isError) && (!needsFallback || !!fallback.data || fallback.isError)
    : !!prices.data || prices.isError
  const priced = price != null
  // 크립토 소수 수량 × 가격은 통화 최소 단위 미만이 생긴다(원 미만·센트 미만) — 계좌 통화 단위로 반올림해 표시한다
  const evalAmount = holdings != null && priced ? (isCrypto ? roundMoney(holdings * price, currency) : holdings * price) : null
  const returnRatio = priced && avg != null && avg > 0 ? price / avg - 1 : null
  // 보유가 없으면 평가할 대상이 없어 -, 있는데 현재가가 없으면 확인 불가, 조회 중이면 스켈레톤
  const loading = holdings != null && !priced && !settled
  const unavailable = holdings != null && !priced && settled
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard label="보유 수량" value={isCrypto ? `${fmtQuantity(holdings ?? 0)} ${ticker}` : `${fmtQuantity(holdings ?? 0)}주`} {...HOLDING_TILE} />
      <KpiCard label="평단가" value={avg != null ? fmtMoney(avg, currency) : '-'} {...HOLDING_TILE} />
      <KpiCard label="평가금액" value={unavailable ? UNAVAILABLE : evalAmount != null ? fmtMoney(evalAmount, currency) : '-'} skeleton={loading} {...HOLDING_TILE} />
      <KpiCard
        label="수익률"
        value={unavailable ? UNAVAILABLE : returnRatio != null ? <span className={pnlTextClass(returnRatio)}>{fmtSignedPercent(returnRatio)}</span> : '-'}
        skeleton={loading}
        {...HOLDING_TILE}
      />
    </div>
  )
}

function RuleField({ label, className, inline, children }: { label: string; className?: string; inline?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(inline && 'flex items-baseline gap-2', className)}>
      <dt className={cn('text-xs text-muted-foreground', inline && 'shrink-0')}>{label}</dt>
      <dd className={cn(!inline && 'mt-0.5')}>{children}</dd>
    </div>
  )
}

// DCA 상세 — 바로 주문·미리보기 미지원(409)이라 NextOrderCard 대신 보유 현황·규칙 카드·회차 이력을 표시.
// 구성은 주식 전략 상세(전략 정보 카드 + KpiCard 그리드 → 이력 → 제어 카드)를 따른다
// dca가 없어도(응답 누락) 보유 수량·이력·중지/삭제는 그대로 노출한다
export function DcaStrategyDetail({ accountId, broker, strategy }: Props) {
  const { push } = useRouter()
  const { labelOf } = useMeta()
  // 통화·크립토 여부는 계좌 broker 기준 — BTC는 업비트(KRW)·바이낸스(USDT) 모두에 있어 티커로 정할 수 없다
  const market = brokerMarket(broker)
  const isCrypto = isCryptoMarket(market)
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
      <StrategyInfoCard strategy={strategy}>
        <KpiCard label="전략타입" value={labelOf('strategyTypes', strategy.type)} {...TILE} />
        <DcaHoldingGrid accountId={accountId} strategy={strategy} market={market} />
      </StrategyInfoCard>

      {/* PC: 규칙 / 회차별 실행 이력 2단 — 주식 전략 상세의 잔고 이력·주문 내역과 같은 배치. 규칙이 없으면 이력이 전체 폭 */}
      <div className={cn('space-y-4', dca && 'xl:grid xl:grid-cols-2 xl:items-start xl:gap-4 xl:space-y-0')}>
        {dca && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">규칙</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <ul className="space-y-3">
                {dca.rules.map((r) => (
                  <li key={r.ruleKey} className="rounded-[var(--r-md)] border border-border px-3 py-2.5">
                    <p className="font-semibold"><DcaRuleSummaryLabel rule={r} labelOf={labelOf} market={market} size="sm" badgeClassName={directionBadgeClass(r.direction)} /></p>
                    <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
                      <RuleField label="조건" inline className="col-span-2 sm:col-span-1">
                        {r.conditions.length === 0 ? '조건 없이 매 회차 주문' : r.conditions.map((c, i) => (
                          <div key={i}>{formatDcaCondition(c, dcaIndicatorLabel(c.indicator, labelOf('dcaIndicators', c.indicator), isCrypto), labelOf('dcaOperators', c.operator))}</div>
                        ))}
                      </RuleField>
                      <RuleField label={r.direction === 'SELL' ? '보유가 부족할 때' : '잔고가 부족할 때'} inline className="col-span-2 sm:col-span-1">
                        {SHORTFALL_SHORT[r.shortfall] ?? labelOf('dcaShortfallPolicies', r.shortfall)}
                      </RuleField>
                      <RuleField label={isCrypto ? '다음 실행' : '다음 판정일'} inline>
                        {!r.nextExecution ? '미정' : isCrypto ? formatCryptoNextExecution(r.nextExecution.kstTradeDate, r.executionHour) : fmtDate(r.nextExecution.kstTradeDate)}
                      </RuleField>
                      <RuleField label="최근 결과" inline>
                        {/* 건너뛴 회차는 사유만으로 충분하다 — "건너뜀 · 조건 미충족" 대신 "조건 미충족" */}
                        {!r.lastExecution ? '-' : r.lastExecution.skipReason ? labelOf('dcaSkipReasons', r.lastExecution.skipReason) : labelOf('dcaExecutionStatuses', r.lastExecution.status)}
                      </RuleField>
                    </dl>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <DcaExecutionHistory strategyId={strategy.id} ticker={strategy.ticker} rules={dca?.rules ?? []} market={market} />
      </div>

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
            broker={broker}
            onConfirm={() => remove(strategy)}
            disabled={loading}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
