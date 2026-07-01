'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { RevealableValue } from '@widgets/revealable-value'
import { useMeta } from '@entities/meta'
import { useStrategiesQuery } from '@entities/strategy'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

const EMPTY_STRATEGIES: Strategy[] = []
const STATUS_ACCENT: Record<'ACTIVE' | 'PAUSED', string> = {
  ACTIVE: 'var(--status-ok)',
  PAUSED: 'var(--warn)',
}

function strategyTypeShort(type: Strategy['type']): string {
  if (type === 'PRIVACY') return 'P'
  if (type === 'INFINITE') return 'I'
  return type
}

function formatStrategyBadge(strategy: Strategy): string {
  return `${strategyTypeShort(strategy.type)}-${strategy.ticker}`
}

function strategyStatusColor(status: Strategy['status']): string {
  return status === 'ACTIVE' || status === 'PAUSED'
    ? STATUS_ACCENT[status]
    : 'var(--muted-foreground)'
}

interface Props {
  account: Account
  strategies?: Strategy[]
}

/** 전략 목록에서 대표 상태를 집계. 모두 ACTIVE면 ACTIVE, 혼재면 PAUSED, 없으면 null. */
function aggregateStatus(strategies: Strategy[]): 'ACTIVE' | 'PAUSED' | null {
  if (strategies.length === 0) return null
  const hasActive = strategies.some((s) => s.status === 'ACTIVE')
  const allActive = strategies.every((s) => s.status === 'ACTIVE')
  if (allActive) return 'ACTIVE'
  if (hasActive) return 'PAUSED'
  return 'PAUSED'
}

export function AccountCard({ account, strategies: initialStrategies = EMPTY_STRATEGIES }: Props) {
  const { data: strategies = EMPTY_STRATEGIES } = useStrategiesQuery(account.id, initialStrategies)
  const { findBroker } = useMeta()
  const broker = findBroker(account.broker)
  const brokerLabel = broker?.label ?? account.broker
  const brokerShort = broker?.description ?? account.broker
  const aggregated = aggregateStatus(strategies)

  return (
    <Link
      href={`/accounts/${account.id}`}
      className="group relative block rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--sh-card)] hover:border-rose-200 hover:shadow-[var(--sh-rose)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {aggregated && (
        <span
          data-testid="account-status-accent"
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: STATUS_ACCENT[aggregated] }}
        />
      )}

      {/* 모바일: 2행 레이아웃 */}
      <div className="flex flex-col gap-1.5 pl-5 pr-4 py-3 lg:hidden">
        {/* 1행: 브로커 배지 + 계좌번호 */}
        <div className="flex items-center gap-2">
          <span
            className="-ml-2 inline-flex items-center px-2 h-[19px] rounded-sm text-xs font-semibold shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            {brokerLabel}
          </span>
          <span className="ml-auto text-xs font-mono font-semibold text-foreground/60 tracking-wider shrink-0">
            <RevealableValue
              value={account.accountNo ?? account.accountNoMasked}
              hiddenDisplay={account.accountNoMasked}
            />
          </span>
        </div>
        {/* 2행: 닉네임 + 전략 수 + 상태 + 화살표 */}
        <div className="flex items-start gap-2">
          <span className="font-bold text-sm text-foreground truncate flex-1 min-w-0">
            {account.nickname}
          </span>
          {strategies.length > 0 ? (
            <div className="flex items-start content-start justify-end gap-1.5 shrink-0 flex-wrap">
              {strategies.map((s) => (
                <span
                  key={s.id}
                  data-testid={`strategy-badge-${s.id}-mobile`}
                  className="inline-flex items-center px-2 h-[20px] rounded-full text-xs font-semibold shrink-0 whitespace-nowrap border bg-muted/40"
                  style={{ borderColor: strategyStatusColor(s.status), color: strategyStatusColor(s.status) }}
                >
                  {formatStrategyBadge(s)}
                </span>
              ))}
            </div>
          ) : (
            <span className="inline-flex items-center px-2 h-[20px] rounded-full text-xs font-semibold shrink-0 bg-muted text-muted-foreground whitespace-nowrap">
              미등록
            </span>
          )}
          <ChevronRight className="mt-0.5 size-4 text-muted-foreground group-hover:text-[var(--brand-fg-soft)] transition-colors shrink-0" />
        </div>
      </div>

      {/* PC: 카드 형태 */}
      <div className="hidden lg:flex flex-col">
        {/* 헤더 */}
        <div className="pl-6 pr-5 pt-4 pb-3">
          {/* 브로커 배지 + 계좌번호 우측 */}
          <div className="flex items-center justify-between mb-2.5">
            <span
              className="-ml-2 inline-flex items-center px-2 h-[19px] rounded-sm text-xs font-semibold"
              style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              {brokerLabel}
            </span>
            <span className="text-xs font-mono font-semibold text-foreground/60 tracking-wider">
              <RevealableValue
                value={account.accountNo ?? account.accountNoMasked}
                hiddenDisplay={account.accountNoMasked}
              />
            </span>
          </div>
          {/* 닉네임 + 집계 상태 */}
          <div className="h-[30px] flex items-center gap-2 overflow-hidden">
            <p className="font-bold text-xl text-foreground leading-none tracking-tight truncate">
              {account.nickname}
            </p>
          </div>
        </div>

        {/* 구분선 */}
        <div className="h-px bg-border" />

        {/* 전략 목록 */}
        <div className="pl-6 pr-5 pt-3 pb-3 flex-1">
          {strategies.length > 0 ? (
            <ul>
              {strategies.map((s) => (
                <li key={s.id} className="flex items-center gap-2 min-w-0 py-3 border-b border-border last:border-b-0">
                  <span
                    data-testid={`strategy-badge-${s.id}-desktop`}
                    className="inline-flex h-[20px] items-center px-2 rounded-full border bg-muted/40 text-xs font-bold leading-none uppercase shrink-0"
                    style={{ borderColor: strategyStatusColor(s.status), color: strategyStatusColor(s.status) }}
                  >
                    {formatStrategyBadge(s)}
                  </span>
                  {s.initialUsdDeposit != null && (
                    <span className="ml-auto shrink-0 text-sm font-semibold leading-none text-foreground tabular-nums">
                      ${s.initialUsdDeposit.toLocaleString('en-US')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">전략 미등록</p>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-1 pl-6 pr-5 py-3 border-t border-border bg-muted/30 text-sm text-muted-foreground">
          계좌 상세 보기
          <ChevronRight className="size-3.5 group-hover:text-[var(--brand-fg-soft)] transition-colors" />
        </div>
      </div>
    </Link>
  )
}
