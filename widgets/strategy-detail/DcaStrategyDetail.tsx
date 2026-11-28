'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Surface } from '@shared/ui/Surface'
import { SectionTitle } from '@shared/ui/SectionTitle'
import { KpiCard } from '@widgets/kpi-card'
import { useManageStrategyMutations } from '@features/strategy/manage-strategy'
import { useMeta } from '@entities/meta'
import { dcaIndicatorLabel, floorToCents, formatDcaCondition, formatDcaSchedule, formatDcaSizing } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { useAccountPricesQuery } from '@entities/account'
import { directionBadgeClass } from '@entities/trade'
import { Badge } from '@shared/ui/Badge'
import { cn } from '@shared/lib/utils'
import { fmtDate, fmtMoneyOrDash, fmtShares, fmtSignedPercent, pnlTextClass } from '@shared/lib/format'
import { StrategyInfoCard } from './StrategyMetaSection'
import { CloseStrategyDialog } from './CloseStrategyDialog'
import { StrategyToggleButton } from './StrategyToggleButton'
import { DcaExecutionHistory } from './DcaExecutionHistory'

interface Props {
  accountId: string
  broker: string
  strategy: Strategy
}

// 주식 전략 상세의 전략타입·금액 타일(StrategyMetaSection TILE_VALUE)과 같은 크기·모바일 2열 — 긴 전략타입 이름은 2열 칸에서 두 줄로 접힐 수 있다
const TILE = { className: 'p-4 lg:p-5', valueClassName: 'text-lg sm:text-xl lg:text-2xl tabular-nums break-keep' }
// 규칙 카드는 한 줄 배치라 메타 라벨(가용만큼 주문·주문하지 않음) 대신 짧게 — 모르는 코드는 메타 라벨로
const SHORTFALL_SHORT: Record<string, string> = { PARTIAL: '잔량', REJECT: '주문 안 함' }
const UNAVAILABLE = <span className="text-base font-normal text-muted-foreground">확인 불가</span>

// 보유 수량·평단가는 원장(dca.currentHoldings·avgPrice)이 SSOT, 현재가만 시장별 시세로 받는다(실잔고는 보지 않는다).
function DcaHoldingGrid({ accountId, strategy }: { accountId: string; strategy: Strategy }) {
  const { ticker, dca } = strategy
  const holdings = dca?.currentHoldings ?? null
  const avg = dca?.avgPrice ?? null
  const prices = useAccountPricesQuery(accountId, [ticker])
  const price = prices.data?.[ticker]
  const settled = !!prices.data || prices.isError
  const priced = price != null
  const evalAmount = holdings != null && priced ? holdings * price : null
  const returnRatio = priced && avg != null && avg > 0 ? price / avg - 1 : null
  // 보유가 없으면 평가할 대상이 없어 -, 있는데 현재가가 없으면 확인 불가, 조회 중이면 스켈레톤
  const loading = holdings != null && !priced && !settled
  const unavailable = holdings != null && !priced && settled
  const avgText = fmtMoneyOrDash(avg, 'USD')
  const evalText = fmtMoneyOrDash(evalAmount, 'USD')
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard label="보유 수량" value={holdings != null ? fmtShares(holdings) : '-'} {...TILE} />
      <KpiCard label="평단가" value={avgText} {...TILE} />
      <KpiCard label="평가금액" value={unavailable ? UNAVAILABLE : evalText} skeleton={loading} {...TILE} />
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

// DCA 상세 — NextOrderCard(다음 주문)를 두지 않고 보유 현황·규칙 카드(다음 판정일)·회차 이력을 표시한다.
// 서버 미리보기는 DCA도 지원하지만 DCA는 다음 실행일만 보이기로 한 제품 결정(D10)이다.
// 구성은 주식 전략 상세(전략 정보 카드 + KpiCard 그리드 → 이력 → 제어 카드)를 따른다
// dca가 없어도(응답 누락) 보유 수량·이력·중지/삭제는 그대로 노출한다
export function DcaStrategyDetail({ accountId, broker, strategy }: Props) {
  const { push } = useRouter()
  const { labelOf } = useMeta()
  const deposit = fmtMoneyOrDash(strategy.ledgerDeposit != null ? floorToCents(strategy.ledgerDeposit) : null, 'USD')
  const [closeOpen, setCloseOpen] = useState(false)
  const { dca } = strategy
  const { pause, resume, remove, archive, isPausing, isResuming, isDeleting, isArchiving } = useManageStrategyMutations({
    onDeleted: () => push(`/accounts/${accountId}`),
    onArchived: () => push(`/accounts/${accountId}`),
  })
  const toggleLoading = isPausing || isResuming
  const loading = toggleLoading || isDeleting || isArchiving
  const toggleLabel = toggleLoading ? '처리 중…' : strategy.status === 'ACTIVE' ? '일시중지' : '재개'

  return (
    <div className="space-y-4">
      <StrategyInfoCard strategy={strategy}>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="전략타입" value={labelOf('strategyTypes', strategy.type)} {...TILE} />
          <KpiCard label="예수금" value={deposit} {...TILE} />
        </div>
        <DcaHoldingGrid accountId={accountId} strategy={strategy} />
      </StrategyInfoCard>

      {/* PC: 규칙 / 회차별 실행 이력 2단 — 주식 전략 상세의 잔고 이력·주문 내역과 같은 배치. 규칙이 없으면 이력이 전체 폭 */}
      <div className={cn('space-y-4', dca && 'xl:grid xl:grid-cols-2 xl:items-start xl:gap-4 xl:space-y-0')}>
        {dca && (
          <Surface size="compact" className="flex flex-col gap-4 overflow-hidden text-sm">
            <SectionTitle className="pb-3">규칙</SectionTitle>
            <div>
              <ul className="space-y-3">
                {dca.rules.map((r) => (
                  <li key={r.ruleKey} className="rounded-lg border border-border px-3 py-2.5">
                    {/* 모바일 세로 길이를 줄이려 주기·주문 방식은 배지 옆 한 줄, 다음 판정·최근 결과는 하단 보조 줄로 둔다 */}
                    <div className="flex flex-wrap items-center gap-x-2">
                      <Badge tone="none" size="sm" className={directionBadgeClass(r.direction)}>{labelOf('orderDirections', r.direction)}</Badge>
                      <span data-testid="rule-summary">
                        {[formatDcaSchedule(r, labelOf('dcaFrequencies', r.frequency)), labelOf('orderTypes', r.orderType)].join(' · ')}
                      </span>
                    </div>
                    <dl className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                      <RuleField label="금액" inline>{formatDcaSizing(r.sizing)}</RuleField>
                      <RuleField label="조건" inline>
                        {r.conditions.length === 0 ? '조건 없이 매 회차 주문' : r.conditions.map((c, i) => (
                          <div key={i}>{formatDcaCondition(c, dcaIndicatorLabel(c.indicator, labelOf('dcaIndicators', c.indicator)), labelOf('dcaOperators', c.operator))}</div>
                        ))}
                      </RuleField>
                      <RuleField label={r.direction === 'SELL' ? '보유 부족 시' : '잔고 부족 시'} inline>
                        {SHORTFALL_SHORT[r.shortfall] ?? labelOf('dcaShortfallPolicies', r.shortfall)}
                      </RuleField>
                    </dl>
                    <p data-testid="rule-footer" className="mt-2.5 text-xs text-muted-foreground">
                      다음 판정{' '}
                      {/* 배치는 운영중 전략만 주문한다 — 일시중지 중에는 날짜를 보이지 않는다 */}
                      {strategy.status === 'PAUSED' ? '일시중지 중' : !r.nextExecution ? '미정' : fmtDate(r.nextExecution.kstTradeDate)}
                      {' · 최근 '}
                      {/* 건너뛴 회차는 사유만으로 충분하다 — "건너뜀 · 조건 미충족" 대신 "조건 미충족" */}
                      {!r.lastExecution ? '-' : r.lastExecution.skipReason ? labelOf('dcaSkipReasons', r.lastExecution.skipReason) : labelOf('dcaExecutionStatuses', r.lastExecution.status)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Surface>
        )}

        <DcaExecutionHistory strategyId={strategy.id} rules={dca?.rules ?? []} />
      </div>

      <Surface size="flush" className="flex flex-col gap-4 overflow-hidden py-4 text-sm">
        <div className="p-5 grid grid-cols-2 items-start gap-x-3 gap-y-1">
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
        </div>
      </Surface>
    </div>
  )
}
