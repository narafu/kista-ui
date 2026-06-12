import type { Metadata } from 'next'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAllStrategies } from '@entities/strategy'
import { AllStrategiesList } from '@widgets/all-strategies'
import { PageHeader } from '@widgets/page-header'
import type { Strategy } from '@entities/strategy'

export const metadata: Metadata = {
  title: '전략 | KISTA',
}

export default async function StrategiesPage() {
  const token = await getAuthToken()
  let strategies: Strategy[] = []
  if (token) strategies = await listAllStrategies(token).catch(() => [])
  return (
    <>
      <PageHeader eyebrow="Strategies" title="전략" />
      <AllStrategiesList strategies={strategies} />
    </>
  )
}
