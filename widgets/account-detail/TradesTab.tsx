'use client'

import { useAccountCycleHistoryQuery } from '@entities/trade'
import { CycleHistoryTable } from '@widgets/cycle-history'
import type { DateParams } from '@entities/trade/hooks/useCycleHistory'

interface Props {
  accountId: string
}

// accountId가 항상 정의된 이 위젯 전용 래퍼 — useHistoryQuery 타입(id: string | undefined)과 맞추기 위함
function useAccountCycleHistory(id: string | undefined, params: DateParams) {
  return useAccountCycleHistoryQuery(id!, params)
}

export function TradesTab({ accountId }: Props) {
  return (
    // 데스크탑 2열 그리드(items-stretch 기본값)에서 좌측 컬럼보다 행이 적을 때
    // 카드가 늘어나며 우측 공백이 커지는 문제 방지 — h-fit으로 콘텐츠 높이만 차지
    <div className="h-fit">
      <CycleHistoryTable
        title="잔고 이력"
        id={accountId}
        useHistoryQuery={useAccountCycleHistory}
      />
    </div>
  )
}
