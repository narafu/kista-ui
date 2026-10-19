'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useMeta } from '@entities/meta'
import { useStrategiesQuery, strategyStatusAccent, strategyTypeShort } from '@entities/strategy'
import { apiKeyExpiryState, API_KEY_EXPIRY_LABEL } from '@entities/account'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'
import { Badge } from '@shared/ui/Badge'
import { fmtUsd } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'

const EMPTY_STRATEGIES: Strategy[] = []

function formatStrategyBadge(strategy: Strategy): string {
  return `${strategyTypeShort(strategy.type)}-${strategy.ticker}`
}


interface Props {
  account: Account
}

export function AccountCard({ account }: Props) {
  const strategiesQuery = useStrategiesQuery(account.id)
  const strategies = strategiesQuery.data ?? EMPTY_STRATEGIES
  const { findBroker, labelOf } = useMeta()
  const broker = findBroker(account.broker)
  const brokerLabel = broker?.label ?? account.broker
  const expiry = apiKeyExpiryState(account.apiKeyExpiresAt)
  // 하나라도 ACTIVE가 아니면 그 상태의 accent로 왼쪽 띠를 표시한다(모두 ACTIVE면 띠 없음)
  const inactive = strategies.find((s) => s.status !== 'ACTIVE')
  const aggregatedAccent = inactive ? strategyStatusAccent(inactive.status) : undefined
  // 조회 전·실패를 "전략 미등록"으로 오인하지 않도록 빈 목록일 때의 문구를 상태별로 나눈다
  const strategiesFailed = !strategiesQuery.data && strategiesQuery.isError
  const emptyLabel = strategiesFailed
    ? '전략 조회 실패'
    : !strategiesQuery.data && strategiesQuery.isPending ? '불러오는 중…' : '전략 미등록'

  return (
    <Link
      href={`/accounts/${account.id}`}
      className="group relative block rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-[border-color,box-shadow] overflow-hidden"
    >
      {aggregatedAccent && (
        <span
          data-testid="account-status-accent"
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: aggregatedAccent }}
        />
      )}

      {/* 모바일: 2행 레이아웃 */}
      <div className="flex flex-col gap-1.5 pl-5 pr-4 py-3 lg:hidden">
        {/* 1행: 브로커 배지 */}
        <div className="flex items-center gap-2">
          <span className="-ml-2 inline-flex items-center px-2 h-[19px] rounded-sm text-xs font-semibold shrink-0 bg-accent text-accent-foreground">
            {brokerLabel}
          </span>
          {expiry && (
            <Badge tone={expiry === 'EXPIRED' ? 'error' : 'warn'} size="sm">{API_KEY_EXPIRY_LABEL[expiry]}</Badge>
          )}
        </div>
        {/* 2행: 닉네임 + 전략 수 + 상태 + 화살표 */}
        <div className="flex items-start gap-2">
          <span className="font-bold text-sm text-foreground truncate flex-1 min-w-16">
            {account.nickname}
          </span>
          {strategies.length > 0 ? (
            <div className="flex min-w-0 max-w-[65%] items-start content-start justify-end gap-1.5 flex-wrap">
              {strategies.map((s) => (
                <Badge
                  key={s.id}
                  tone="none"
                  data-testid={`strategy-badge-${s.id}-mobile`}
                  className="border bg-muted/40"
                  style={{ borderColor: strategyStatusAccent(s.status), color: strategyStatusAccent(s.status) }}
                >
                  {formatStrategyBadge(s)}
                  {s.status !== 'ACTIVE' && ` · ${labelOf('strategyStatuses', s.status)}`}
                </Badge>
              ))}
            </div>
          ) : (
            <Badge tone={strategiesFailed ? 'error' : 'neutral'}>{emptyLabel}</Badge>
          )}
          <ChevronRight className="mt-0.5 size-4 text-muted-foreground group-hover:text-[var(--brand-fg-soft)] transition-colors shrink-0" />
        </div>
      </div>

      {/* PC: 카드 형태 */}
      <div className="hidden lg:flex flex-col">
        {/* 헤더 */}
        <div className="pl-6 pr-5 pt-4 pb-3">
          {/* 브로커 배지 */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className="-ml-2 inline-flex items-center px-2 h-[19px] rounded-sm text-xs font-semibold bg-accent text-accent-foreground">
              {brokerLabel}
            </span>
            {expiry && (
              <Badge tone={expiry === 'EXPIRED' ? 'error' : 'warn'} size="sm">{API_KEY_EXPIRY_LABEL[expiry]}</Badge>
            )}
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
        <div className="pl-6 pr-5 mt-auto">
          {strategies.length > 0 ? (
            <ul>
              {strategies.map((s) => (
                <li key={s.id} className="flex items-center gap-2 min-w-0 py-3 border-b border-border last:border-b-0">
                  <Badge
                    tone="none"
                    data-testid={`strategy-badge-${s.id}-desktop`}
                    className="border bg-muted/40 font-bold leading-none uppercase"
                    style={{ borderColor: strategyStatusAccent(s.status), color: strategyStatusAccent(s.status) }}
                  >
                    {formatStrategyBadge(s)}
                    {s.status !== 'ACTIVE' && ` · ${labelOf('strategyStatuses', s.status)}`}
                  </Badge>
                  {s.initialUsdDeposit != null && (
                    <span className="ml-auto shrink-0 text-sm font-semibold leading-none text-foreground tabular-nums">
                      ${fmtUsd(s.initialUsdDeposit)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={cn('text-sm', strategiesFailed ? 'text-[var(--status-error)]' : 'text-muted-foreground')}>{emptyLabel}</p>
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
