import { Suspense } from 'react'
import { UrlRangeFilterBar, type RangePreset } from '@shared/ui/UrlRangeFilterBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { Surface } from '@shared/ui/Surface'
import { Badge } from '@shared/ui/Badge'
import { SectionError } from '@shared/ui/SectionError'
import type { AdminAnomalies } from '@entities/admin'
import { AccountTable } from './AccountTable'

export function AnomaliesSection({
  anomalies, range, from, to,
}: {
  /** null이면 조회 실패 */
  anomalies: AdminAnomalies | null
  range: RangePreset
  from?: string
  to?: string
}) {
  const total = anomalies ? anomalies.pausedAccounts.length + anomalies.inactiveAccounts.length : 0
  return (
    <Surface as="section" className="p-4 lg:p-5">
      <div className="mb-4 lg:flex lg:items-center lg:gap-3">
        <h2 className="text-base font-bold shrink-0 mb-2 lg:mb-0">
          이상 징후
          {total > 0 && <Badge tone="warn" size="sm" className="ml-2">{total}</Badge>}
        </h2>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <UrlRangeFilterBar current={range} from={from} to={to} paramPrefix="ano" pageParamKeys={[]} />
          </Suspense>
        </div>
      </div>
      {!anomalies ? (
        <SectionError message="이상 징후를 불러오지 못했습니다." serverRetry />
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              일시중지 계좌
              {anomalies.pausedAccounts.length > 0 && (
                <span className="ml-2 font-medium text-warn">
                  {anomalies.pausedAccounts.length}
                </span>
              )}
            </h3>
            {anomalies.pausedAccounts.length === 0 ? (
              <EmptyState message="일시중지된 계좌가 없습니다." />
            ) : (
              <AccountTable accounts={anomalies.pausedAccounts} label="일시중지 계좌" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              비활성 계좌{' '}
              <span className="font-normal">(7일 거래 없음)</span>
              {anomalies.inactiveAccounts.length > 0 && (
                <span className="ml-2 font-medium text-foreground">
                  {anomalies.inactiveAccounts.length}
                </span>
              )}
            </h3>
            {anomalies.inactiveAccounts.length === 0 ? (
              <EmptyState message="비활성 계좌가 없습니다." />
            ) : (
              <AccountTable accounts={anomalies.inactiveAccounts} label="비활성 계좌" />
            )}
          </div>
        </div>
      )}
    </Surface>
  )
}
