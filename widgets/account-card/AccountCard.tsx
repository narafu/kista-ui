'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { StatusDot } from '@widgets/status-dot'
import { useMeta } from '@entities/meta'
import { useStrategiesQuery } from '@entities/strategy'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

const EMPTY_STRATEGIES: Strategy[] = []

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

  const activeCount = strategies.filter((s) => s.status === 'ACTIVE').length
  const mixedLabel = strategies.length > 1 && activeCount > 0 && activeCount < strategies.length
    ? `운영중 ${activeCount}개`
    : undefined

  return (
    <Link
      href={`/accounts/${account.id}`}
      className="group block rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--sh-card)] hover:border-rose-200 hover:shadow-[var(--sh-rose)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* 모바일: 2행 레이아웃 */}
      <div className="flex flex-col gap-1.5 px-4 py-3 lg:hidden">
        {/* 1행: 브로커 배지 + 계좌번호 */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2 h-[19px] rounded-sm text-[11px] font-semibold shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
          >
            {brokerShort}
          </span>
          <span className="ml-auto text-xs font-mono font-semibold text-foreground/60 tracking-wider shrink-0">
            {account.accountNoMasked}
          </span>
        </div>
        {/* 2행: 닉네임 + 전략 수 + 상태 + 화살표 */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-foreground truncate flex-1 min-w-0">
            {account.nickname}
          </span>
          {strategies.length > 0 ? (
            <span
              className="inline-flex items-center px-2 h-[20px] rounded-full text-[11px] font-semibold shrink-0 whitespace-nowrap"
              style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}
            >
              전략 {strategies.length}개
            </span>
          ) : (
            <span className="inline-flex items-center px-2 h-[20px] rounded-full text-[11px] font-semibold shrink-0 bg-muted text-muted-foreground whitespace-nowrap">
              미등록
            </span>
          )}
          {aggregated && (
            mixedLabel ? (
              <span className="text-[11px] font-semibold text-warn shrink-0">{mixedLabel}</span>
            ) : (
              <StatusDot status={aggregated} hideLabel className="shrink-0" />
            )
          )}
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-rose-500 transition-colors shrink-0" />
        </div>
      </div>

      {/* PC: 카드 형태 */}
      <div className="hidden lg:flex flex-col">
        {/* 로즈골드 그라디언트 액센트 바 */}
        <div
          className="h-[3px] w-full opacity-60 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'var(--primary-grad)' }}
        />

        {/* 헤더 */}
        <div className="px-5 pt-4 pb-3">
          {/* 브로커 배지 + 계좌번호 우측 */}
          <div className="flex items-center justify-between mb-2.5">
            <span
              className="inline-flex items-center px-2 h-[19px] rounded-sm text-[11px] font-semibold"
              style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
            >
              {brokerLabel}
            </span>
            <span className="text-xs font-mono font-semibold text-foreground/60 tracking-wider">
              {account.accountNoMasked}
            </span>
          </div>
          {/* 닉네임 + 집계 상태 */}
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-xl text-foreground leading-tight tracking-tight truncate">
              {account.nickname}
            </p>
            {aggregated && (
              mixedLabel ? (
                <span className="text-[11px] font-semibold text-warn shrink-0">{mixedLabel}</span>
              ) : (
                <StatusDot status={aggregated} className="shrink-0" />
              )
            )}
          </div>
        </div>

        {/* 구분선 */}
        <div className="h-px bg-border" />

        {/* 전략 목록 */}
        <div className="px-5 pt-3 pb-3 flex-1">
          {strategies.length > 0 ? (
            <ul>
              {strategies.map((s) => (
                <li key={s.id} className="flex items-center gap-2 min-w-0 py-2 border-b border-border last:border-b-0">
                  <span
                    className="inline-flex items-center px-2 h-[20px] rounded-full text-[10px] font-bold uppercase shrink-0"
                    style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}
                  >
                    {s.type}
                  </span>
                  <span className="text-xs font-mono font-semibold text-foreground tracking-wider">
                    {s.ticker}
                  </span>
                  {s.initialUsdDeposit != null && (
                    <span className="ml-auto text-sm font-semibold text-foreground tabular-nums shrink-0">
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
        <div className="flex items-center justify-end gap-1 px-5 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          계좌 상세 보기
          <ChevronRight className="size-3.5 group-hover:text-rose-500 transition-colors" />
        </div>
      </div>
    </Link>
  )
}
