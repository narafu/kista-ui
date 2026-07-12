import { Suspense } from 'react'
import { UrlRangeFilterBar, type RangePreset } from '@shared/ui/UrlRangeFilterBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { Surface } from '@shared/ui/Surface'
import type { AdminAnomalies } from '@entities/admin'
import { AccountTable } from './AccountTable'

export function AnomaliesSection({
  anomalies, range, from, to,
}: {
  anomalies: AdminAnomalies
  range: RangePreset
  from?: string
  to?: string
}) {
  const total = anomalies.pausedAccounts.length + anomalies.inactiveAccounts.length
  return (
    <Surface as="section" className="p-4 lg:p-5">
      <div className="mb-4 lg:flex lg:items-center lg:gap-3">
        <h2 className="text-base font-bold shrink-0 mb-2 lg:mb-0">
          이상징후(7일)
          {total > 0 && (
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-warn-bg text-warn">
              {total}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <UrlRangeFilterBar current={range} from={from} to={to} paramPrefix="ano" pageParamKeys={[]} />
          </Suspense>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            일시정지 계좌
            {anomalies.pausedAccounts.length > 0 && (
              <span className="ml-2 normal-case font-medium text-warn">
                {anomalies.pausedAccounts.length}
              </span>
            )}
          </p>
          {anomalies.pausedAccounts.length === 0 ? (
            <EmptyState message="일시정지된 계좌가 없습니다" />
          ) : (
            <AccountTable accounts={anomalies.pausedAccounts} />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            비활성 계좌{' '}
            <span className="normal-case font-normal">(7일 거래 없음)</span>
            {anomalies.inactiveAccounts.length > 0 && (
              <span className="ml-2 font-medium text-slate-600">
                {anomalies.inactiveAccounts.length}
              </span>
            )}
          </p>
          {anomalies.inactiveAccounts.length === 0 ? (
            <EmptyState message="비활성 계좌가 없습니다" />
          ) : (
            <AccountTable accounts={anomalies.inactiveAccounts} />
          )}
        </div>
      </div>
    </Surface>
  )
}
