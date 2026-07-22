import type { Metadata } from 'next'
import { getAuthToken } from '@shared/lib/auth/token'
import { getCachedAccounts } from '@entities/account'
import { listAllStrategies } from '@entities/strategy'
import { getStrategyOrderPreviewsById } from '@entities/order'
import { AllStrategiesList } from '@widgets/all-strategies'
import { PageHeader } from '@widgets/page-header'
import type { Strategy } from '@entities/strategy'
import type { Account } from '@entities/account'
import type { NextOrderPreview } from '@entities/order'

export const metadata: Metadata = {
  title: '전략 | KISTA',
}

export default async function StrategiesPage() {
  const token = await getAuthToken()
  // eslint-disable-next-line react-doctor/prefer-module-scope-static-value
  let strategies: Strategy[] = []
  // eslint-disable-next-line react-doctor/prefer-module-scope-static-value
  let accounts: Account[] = []
  // eslint-disable-next-line react-doctor/prefer-module-scope-static-value
  let previewsByStrategyId: Record<string, NextOrderPreview> = {}
  if (token) {
    ;[strategies, accounts] = await Promise.all([
      listAllStrategies(token).catch(() => []),
      getCachedAccounts(token).catch((): Account[] => []),
    ])
    // 전략별 다음 주문 미리보기 — 서버에서 미리 채워 카드 목록의 배지·배너가 첫 페인트부터 보이게 함 (계좌 단위 배치 조회)
    previewsByStrategyId = await getStrategyOrderPreviewsById(strategies, token)
  }
  return (
    <>
      <PageHeader eyebrow="Strategies" title="전략" />
      <AllStrategiesList strategies={strategies} accounts={accounts} previewsByStrategyId={previewsByStrategyId} />
    </>
  )
}
