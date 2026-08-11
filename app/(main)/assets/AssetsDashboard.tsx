'use client'

import { useMemo, useState } from 'react'
import { Construction } from 'lucide-react'
import { listAvailableMonths, useAssetsQuery } from '@entities/asset'
import { NewAssetButton } from '@features/asset/save-asset'
import { AssetOverview } from '@widgets/asset-overview'
import { AssetTrend } from '@widgets/asset-trend'
import { AssetComposition } from '@widgets/asset-composition'
import { AssetRecordCheck } from '@widgets/asset-record-check'
import { AssetRecordList } from '@widgets/asset-record-list'
import { PageHeader } from '@widgets/page-header'
import { EmptyState } from '@shared/ui/EmptyState'
import { cn } from '@shared/lib/utils'

type AssetTab = 'budget' | 'income' | 'expense' | 'investment'

const TAB_OPTIONS: { value: AssetTab; label: string }[] = [
  { value: 'budget', label: '예산' },
  { value: 'income', label: '수입' },
  { value: 'expense', label: '지출' },
  { value: 'investment', label: '투자' },
]

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-9 w-full rounded px-2 py-1 text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

// '자산' 페이지의 상태 소유자 — asset-overview·asset-record-check가 공유하는 "기준 월"과
// 탭 상태를 이 컴포넌트가 소유하고 props로 흘려보낸다. 위젯끼리 cross-import가 금지돼 있어
// (widgets.md) 두 위젯이 상태를 공유하려면 app 레이어의 공통 client 부모가 필요하다.
// PageHeader/NewAssetButton도 page.tsx가 아니라 여기서 렌더한다 — "자산 등록" 버튼은 투자
// 탭에서만 의미가 있고(수입/지출은 아직 미구현 안내만 표시), 탭 상태가 이 컴포넌트의 client
// state라 Server Component인 page.tsx는 탭에 따라 버튼을 조건부로 숨길 수 없다.
// 수입/지출 탭은 아직 별도 도메인이 구현되지 않아 자리만 잡아둔 안내 화면이다 — 실제 기능이
// 생기면 각각 별도 위젯으로 분리한다.
export function AssetsDashboard() {
  const [tab, setTab] = useState<AssetTab>('investment')
  const { data: assets = [] } = useAssetsQuery()
  const months = useMemo(() => listAvailableMonths(assets), [assets])
  const [month, setMonth] = useState<string | null>(null)
  // 사용자가 고른 월이 더 이상 목록에 없으면(그 달의 기록을 전부 삭제한 경우 등) 최신 월로 폴백한다 —
  // AssetTrendInner의 effectiveSelector와 동일한 렌더 중 파생 계산(useEffect로 동기화하지 않는다).
  const selectedMonth = month && months.includes(month) ? month : (months[0] ?? null)

  return (
    <>
      <PageHeader
        eyebrow="자산 관리"
        title="내 자산"
        actions={tab === 'investment' ? <NewAssetButton /> : undefined}
      />
      <div className="space-y-6">
        <div role="group" aria-label="자산 탭" className="grid w-full grid-cols-4 rounded-md border border-border p-0.5 sm:w-96">
          {TAB_OPTIONS.map((option) => (
            <TabButton key={option.value} active={tab === option.value} onClick={() => setTab(option.value)}>
              {option.label}
            </TabButton>
          ))}
        </div>

        {tab === 'investment' ? (
          <>
            <AssetOverview month={selectedMonth} months={months} onMonthChange={setMonth} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AssetTrend />
              <AssetComposition />
            </div>
            <AssetRecordCheck month={selectedMonth} />
            <AssetRecordList />
          </>
        ) : (
          <EmptyState
            icon={<Construction className="size-6 text-muted-foreground" />}
            title={`${TAB_OPTIONS.find((option) => option.value === tab)?.label} 탭은 준비 중입니다`}
            message="곧 이용하실 수 있도록 준비하고 있어요."
          />
        )}
      </div>
    </>
  )
}
