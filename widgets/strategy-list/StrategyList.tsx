import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StrategyCard } from '@widgets/strategy-card'
import { NewStrategyButton } from '@features/strategy/create-strategy'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import type { Strategy } from '@entities/strategy'
import { SectionError } from '@shared/ui/SectionError'

interface Props {
  accountId: string
  /** undefined면 아직 조회 전(또는 실패) — 빈 목록 안내와 구분한다 */
  strategies: Strategy[] | undefined
  isError?: boolean
}

export function StrategyList({ accountId, strategies, isError = false }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">전략</CardTitle>
          <NewStrategyButton accountId={accountId} />
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {!strategies && isError ? (
          <SectionError message="전략 목록을 불러오지 못했습니다." />
        ) : !strategies ? (
          <LoadingRow />
        ) : strategies.length === 0 ? (
          <EmptyState variant="text" message={`등록된 전략이 없습니다.\n종목당 1개씩, 여러 전략을 추가할 수 있습니다.`} />
        ) : (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-3">
            {strategies.map((s) => (
              <StrategyCard key={s.id} accountId={accountId} strategy={s} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
