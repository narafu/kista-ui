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
  if (token) {
    ;[strategies, accounts] = await Promise.all([
      listAllStrategies(token).catch(() => []),
      getCachedAccounts(token).catch((): Account[] => []),
    ])
  }
  // 전략별 다음 주문 미리보기(계좌 단위 배치 조회)는 await하지 않고 Promise 그대로 클라이언트에 전달한다 —
  // 전략 카드 그리드의 첫 페인트를 블로킹하지 않고, 배지·배너는 도착하는 대로 카드별 Suspense로 스트리밍된다
  // 실패해도 페이지 전체(error.tsx)로 전파되지 않도록 흡수 — 카드는 미리보기 배지 없이 렌더링됨
  const previewsPromise: Promise<Record<string, NextOrderPreview>> = token
    ? getStrategyOrderPreviewsById(strategies, token).catch((): Record<string, NextOrderPreview> => ({}))
    : Promise.resolve({})
  return (
    <>
      <PageHeader eyebrow="Strategies" title="전략" />
      <AllStrategiesList strategies={strategies} accounts={accounts} previewsPromise={previewsPromise} />
    </>
  )
}
