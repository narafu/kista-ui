import type { Metadata } from 'next'
import { getAuthToken } from '@shared/lib/auth/token'
import { getCachedAccounts } from '@shared/lib/cache/cached-api'
import { listAllStrategies } from '@entities/strategy'
import { AllStrategiesList } from '@widgets/all-strategies'
import { PageHeader } from '@widgets/page-header'
import type { Strategy } from '@entities/strategy'
import type { Account } from '@entities/account'

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
  return (
    <>
      <PageHeader eyebrow="Strategies" title="전략" />
      <AllStrategiesList strategies={strategies} accounts={accounts} />
    </>
  )
}
