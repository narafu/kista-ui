'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@widgets/kpi-card'
import { useManageStrategyMutations } from '@features/strategy/manage-strategy'
import { useMeta } from '@entities/meta'
import { dcaIndicatorLabel, floorToCents, formatCryptoNextExecution, formatDcaCondition, formatDcaSchedule, formatDcaSizing } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { useAccountPricesQuery } from '@entities/account'
import { cryptoPricesQueryOptions, directionBadgeClass } from '@entities/trade'
import { Badge } from '@shared/ui/Badge'
import { cn } from '@shared/lib/utils'
import { fmtDate, splitMoneyUnit, fmtQuantity, fmtSignedPercent, pnlTextClass, roundMoney } from '@shared/lib/format'
import { brokerMarket, isCryptoMarket, marketCurrency } from '@shared/lib/api-schema'
import type { TradingMarket } from '@shared/lib/api-schema'
import { StrategyInfoCard } from './StrategyMetaSection'
import { CloseStrategyDialog } from './CloseStrategyDialog'
import { StrategyToggleButton } from './StrategyToggleButton'
import { DcaExecutionHistory } from './DcaExecutionHistory'

interface Props {
  accountId: string
  broker: string
  strategy: Strategy
}

// 모든 타일을 같은 글씨 크기로, 모바일(sm 미만)에서는 타일마다 전체 폭 — 2열 값 칸(360px에서 약 100px)에는 업비트 KRW 금액(984,074,074원)·소수 8자리 수량·"적립식 분할매매"가 한 줄로 안 들어가고, 타일 개수가 6개라 일부만 전체 폭이면 빈 칸이 생긴다
const TILE = { className: 'col-span-2 sm:col-span-1 p-4 lg:p-5', valueClassName: 'text-lg sm:text-xl lg:text-2xl tabular-nums break-keep' }
// 코드형 단위(코인 티커·USDT)는 KpiCard unit으로 라벨 줄 오른쪽에 둔다. 기호형 단위($·원·주)는 값에 그대로 붙인다
// 값이 없어도('-') 단위는 통화 기준으로 붙인다
// 규칙 카드는 한 줄 배치라 메타 라벨(가용만큼 주문·주문하지 않음) 대신 짧게 — 모르는 코드는 메타 라벨로
const SHORTFALL_SHORT: Record<string, string> = { PARTIAL: '잔량', REJECT: '주문 안 함' }
const UNAVAILABLE = <span className="text-base font-normal text-muted-foreground">확인 불가</span>

// 보유 수량·평단가는 원장(dca.currentHoldings·avgPrice)이 SSOT, 현재가만 시장별 시세로 받는다(실잔고는 보지 않는다).
// 크립토 계좌로 prices를 부르면 400이라 enabled로 갈라 둔다
function DcaHoldingGrid({ accountId, strategy, market }: { accountId: string; strategy: Strategy; market: TradingMarket }) {
  const isCrypto = isCryptoMarket(market)
  const { ticker, dca } = strategy
  const holdings = dca?.currentHoldings ?? null
  const avg = dca?.avgPrice ?? null
  const currency = marketCurrency(market)
  const cryptoPrices = useQuery({ ...cryptoPricesQueryOptions(accountId, [ticker]), enabled: isCrypto })
  const prices = useAccountPricesQuery(accountId, [ticker], { enabled: !isCrypto })
  const priceQuery = isCrypto ? cryptoPrices : prices
  const price = priceQuery.data?.[ticker]
  const settled = !!priceQuery.data || priceQuery.isError
  const priced = price != null
  // 크립토 소수 수량 × 가격은 통화 최소 단위 미만이 생긴다(원 미만·센트 미만) — 계좌 통화 단위로 반올림해 표시한다
  const evalAmount = holdings != null && priced ? (isCrypto ? roundMoney(holdings * price, currency) : holdings * price) : null
  const returnRatio = priced && avg != null && avg > 0 ? price / avg - 1 : null
  // 보유가 없으면 평가할 대상이 없어 -, 있는데 현재가가 없으면 확인 불가, 조회 중이면 스켈레톤
  const loading = holdings != null && !priced && !settled
  const unavailable = holdings != null && !priced && settled
  const avgTile = splitMoneyUnit(avg, currency)
  const evalTile = splitMoneyUnit(evalAmount, currency)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard label="보유 수량" unit={isCrypto ? ticker : undefined} value={isCrypto ? fmtQuantity(holdings ?? 0) : `${fmtQuantity(holdings ?? 0)}주`} {...TILE} />
      <KpiCard label="평단가" unit={avgTile.unit} value={avgTile.text} {...TILE} />
      <KpiCard label="평가금액" unit={evalTile.unit} value={unavailable ? UNAVAILABLE : evalTile.text} skeleton={loading} {...TILE} />
      <KpiCard
        label="수익률"
        value={unavailable ? UNAVAILABLE : returnRatio != null ? <span className={pnlTextClass(returnRatio)}>{fmtSignedPercent(returnRatio)}</span> : '-'}
        skeleton={loading}
        {...TILE}
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
  const deposit = splitMoneyUnit(strategy.ledgerDeposit != null ? floorToCents(strategy.ledgerDeposit) : null, marketCurrency(market))
  const [closeOpen, setCloseOpen] = useState(false)
  const { dca } = strategy
  const { pause, resume, remove, archive, isPausing, isResuming, isDeleting, isArchiving } = useManageStrategyMutations({
    onDeleted: () => push(`/accounts/${accountId}`),
    onArchived: () => push(`/accounts/${accountId}`),
    strategyId: strategy.id,
  })
  const toggleLoading = isPausing || isResuming
  const loading = toggleLoading || isDeleting || isArchiving
  const toggleLabel = toggleLoading ? '처리 중...' : strategy.status === 'ACTIVE' ? '일시중지' : '재개'

  return (
    <div className="space-y-4">
      <StrategyInfoCard strategy={strategy}>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="전략타입" value={labelOf('strategyTypes', strategy.type)} {...TILE} />
          <KpiCard label="예수금" unit={deposit.unit} value={deposit.text} {...TILE} />
        </div>
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
                    {/* 주기·주문 방식도 다른 항목처럼 라벨 행으로 둔다 — 배지 옆 한 줄 요약은 모바일에서 다른 행과 정렬이 어긋난다 */}
                    <Badge tone="none" size="sm" className={directionBadgeClass(r.direction)}>{labelOf('orderDirections', r.direction)}</Badge>
                    <dl className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                      <RuleField label="주기" inline>{formatDcaSchedule(r, labelOf('dcaFrequencies', r.frequency))}</RuleField>
                      {!isCrypto && <RuleField label="주문 방식" inline>{labelOf('orderTypes', r.orderType)}</RuleField>}
                      <RuleField label="금액" inline>{formatDcaSizing(r.sizing, market)}</RuleField>
                      <RuleField label="조건" inline>
                        {r.conditions.length === 0 ? '조건 없이 매 회차 주문' : r.conditions.map((c, i) => (
                          <div key={i}>{formatDcaCondition(c, dcaIndicatorLabel(c.indicator, labelOf('dcaIndicators', c.indicator), isCrypto), labelOf('dcaOperators', c.operator))}</div>
                        ))}
                      </RuleField>
                      <RuleField label={r.direction === 'SELL' ? '보유가 부족할 때' : '잔고가 부족할 때'} inline>
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
        <CardContent className="p-5 grid grid-cols-2 items-start gap-x-3 gap-y-1">
          <StrategyToggleButton active={strategy.status === 'ACTIVE'} loading={loading} label={toggleLabel}
            onClick={() => (strategy.status === 'ACTIVE' ? pause(strategy) : resume(strategy))} />
          <CloseStrategyDialog
            open={closeOpen}
            onOpenChange={setCloseOpen}
            ticker={strategy.ticker}
            broker={broker}
            hasHoldings={!!dca?.currentHoldings}
            onArchive={() => archive(strategy)}
            onDelete={() => remove(strategy)}
            disabled={loading}
            isArchiving={isArchiving}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
