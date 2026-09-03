'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Surface } from '@shared/ui/Surface'
import { cn } from '@shared/lib/utils'
import { digitsOnly, formatAmountDisplay, fmtKrw, todayKst } from '@shared/lib/format'
import { MOBILE_BOTTOM_NAV_OFFSET_CLASS, MOBILE_FIXED_BAR_RESERVE_CLASS } from '@shared/lib/layout-constants'
import { useMeta } from '@entities/meta'
import {
  buildBulkRegisterItems,
  buildCategoryIndex,
  monthEndDate,
  monthStartDate,
  shiftMonth,
  useAssetSnapshotsQuery,
  useBulkRegisterFinanceMutation,
  useFinanceCategoriesQuery,
  useFinanceTransactionsQuery,
} from '@entities/finance'
import type { CategoryGroupNode, BulkRegisterItem } from '@entities/finance'
import { YearMonthSelect } from './YearMonthSelect'

// todayKst() 사용 — new Date()의 getFullYear/getMonth는 브라우저 로컬 타임존이라
// KST가 아닌 기기·자정 근처(UTC 기준 전날)에서 소스/타겟월 기본값이 하루 어긋날 수 있다.
function thisMonth(): string {
  return todayKst().slice(0, 7)
}

interface RowState {
  included: boolean
  amount: number
}

interface Props {
  defaultSourceMonth?: string
  defaultTargetMonth?: string
}

function flattenNode(node: CategoryGroupNode): BulkRegisterItem[] {
  return [...node.items, ...node.children.flatMap(flattenNode)]
}
function flattenNodes(nodes: CategoryGroupNode[]): BulkRegisterItem[] {
  return nodes.flatMap(flattenNode)
}

export function BulkRegisterForm({ defaultSourceMonth, defaultTargetMonth }: Props) {
  const router = useRouter()
  const { labelOf } = useMeta()
  const [sourceMonth, setSourceMonth] = useState(defaultSourceMonth ?? shiftMonth(thisMonth(), -1))
  const [targetMonth, setTargetMonth] = useState(defaultTargetMonth ?? thisMonth())

  const { data: transactions = [] } = useFinanceTransactionsQuery(monthStartDate(sourceMonth), monthEndDate(sourceMonth))
  const { data: assetSnapshots = [] } = useAssetSnapshotsQuery()
  const { data: assetCategories = [] } = useFinanceCategoriesQuery('ASSET')
  const { data: incomeCategories = [] } = useFinanceCategoriesQuery('INCOME')
  const { data: expenseCategories = [] } = useFinanceCategoriesQuery('EXPENSE')
  const { data: savingCategories = [] } = useFinanceCategoriesQuery('SAVING')

  // AssetSnapshot 조회 API엔 기간 파라미터가 없어(전체 목록) 소스월 접두사로 클라이언트 필터링한다.
  const filteredSnapshots = useMemo(
    () => assetSnapshots.filter((s) => s.entryDate.startsWith(sourceMonth)),
    [assetSnapshots, sourceMonth],
  )
  const index = useMemo(
    () => buildCategoryIndex({ ASSET: assetCategories, INCOME: incomeCategories, EXPENSE: expenseCategories, SAVING: savingCategories }),
    [assetCategories, incomeCategories, expenseCategories, savingCategories],
  )
  const items = useMemo(
    () => buildBulkRegisterItems({ transactions, assetSnapshots: filteredSnapshots, index }),
    [transactions, filteredSnapshots, index],
  )

  // 소스월에 실제로 등록된 데이터만 매번 다시 조회해 만드는 목록이라, 제외 토글을 끈 항목은
  // 다음 달 미리보기에도 자동으로 다시 나타나지 않는다 — 별도로 "제외 이력"을 저장하지 않는다.
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})

  function rowState(item: BulkRegisterItem): RowState {
    return rowStates[item.id] ?? { included: item.included, amount: item.amount }
  }
  function updateRow(item: BulkRegisterItem, patch: Partial<RowState>) {
    setRowStates((prev) => ({ ...prev, [item.id]: { ...rowState(item), ...patch } }))
  }
  // 그룹(섹션/대분류/중분류/소분류) 전체 토글 — 부분 선택 상태는 무시하고 하위 전체를 받은
  // 값으로 맞춘다. 헤더 Switch는 하위 전체 포함일 때만 checked라 부분 선택 중 클릭하면
  // 항상 전체 on부터 시작한다. 상위 레벨을 끄면 하위 모든 레벨이 함께 꺼지는 계층 동작이다.
  function setItemsIncluded(items: BulkRegisterItem[], included: boolean) {
    setRowStates((prev) => {
      const next = { ...prev }
      for (const item of items) {
        next[item.id] = { ...(prev[item.id] ?? { included: item.included, amount: item.amount }), included }
      }
      return next
    })
  }

  const mutation = useBulkRegisterFinanceMutation()

  const allItems = useMemo(
    () => flattenNodes([...items.asset, ...items.income, ...items.expense, ...items.saving]),
    [items],
  )
  const includedCount = allItems.filter((item) => rowState(item).included).length

  function handleSubmit() {
    // 대상월의 마지막 일자로 등록한다 — 월말 마감 시점 기준 자산·거래 기록이라는 성격에 맞춘다.
    const targetDate = monthEndDate(targetMonth)

    const assets = flattenNodes(items.asset)
      .filter((item) => rowState(item).included)
      .map((item) => ({
        categoryId: item.categoryId,
        accountId: item.accountId,
        entryDate: targetDate,
        assetClass: item.assetClass!,
        market: item.market!,
        strategy: item.strategy,
        memo: item.memo,
        amount: rowState(item).amount,
      }))

    const transactionsPayload = flattenNodes([...items.income, ...items.expense, ...items.saving])
      .filter((item) => rowState(item).included)
      .map((item) => ({
        categoryId: item.categoryId,
        transactionDate: targetDate,
        amount: rowState(item).amount,
        memo: item.memo,
      }))

    mutation.mutate(
      { assets, transactions: transactionsPayload },
      {
        onSuccess: (result) => {
          const succeeded = result.assetSuccessCount + result.transactionSuccessCount
          if (result.failures.length > 0) {
            toast.warning(`${succeeded}건 등록, ${result.failures.length}건 실패 — ${result.failures[0]}`)
          } else {
            toast.success(`${succeeded}건 등록했어요`)
          }
          router.push('/finance')
        },
      },
    )
  }

  function renderRow(item: BulkRegisterItem, showAssetColumns: boolean) {
    const state = rowState(item)
    // 같은 카테고리+메모 조합이 두 행 이상일 수 있어(예: 같은 가맹점 메모의 카드 결제 2건) 원본
    // 금액까지 이어 붙여 접근성 이름을 행마다 고유하게 만든다 — categoryName+memo만으로는 충돌한다.
    const rowLabel = `${item.categoryName}${item.memo ? ' ' + item.memo : ''} ${fmtKrw(item.amount)}`
    return (
      <div key={item.id} className="flex items-center gap-3 py-3 border-t border-border first:border-t-0">
        {/* 카테고리명은 이미 그룹 헤더(대/중/소분류)가 표시하므로 행에서 반복하지 않는다 — 자산은
            계좌·자산군·전략, 그 외는 메모만 한 줄로 넓게 나열한다. */}
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          {showAssetColumns && (
            <>
              <span className="text-sm font-medium truncate">{item.accountName ?? '계좌 미지정'}</span>
              <span className="text-xs text-muted-foreground">
                {labelOf('markets', item.market ?? '')} {labelOf('assetClasses', item.assetClass ?? '')}
              </span>
              {item.strategy && <span className="text-xs text-muted-foreground truncate">{item.strategy}</span>}
            </>
          )}
          {item.memo && (
            <span className={cn('text-xs text-muted-foreground truncate', !showAssetColumns && 'text-sm')}>{item.memo}</span>
          )}
        </div>
        <Input
          inputMode="numeric"
          value={formatAmountDisplay(String(state.amount))}
          onChange={(e) => updateRow(item, { amount: Number(digitsOnly(e.target.value)) })}
          disabled={!state.included}
          className="h-9 w-32 text-right tabular-nums shrink-0"
          aria-label={`${rowLabel} 금액`}
        />
        <Switch
          checked={state.included}
          onCheckedChange={(next) => updateRow(item, { included: next })}
          aria-label={`${rowLabel} 포함`}
        />
      </div>
    )
  }

  // 카테고리 경로 깊이(대/중/소분류)만큼 재귀 렌더링 — depth 0=대분류, 1=중분류, 2=소분류…
  // 대분류(depth 0)는 수입/소비/저축이 서로 별도 카드로 나뉜 것과 같은 인상을 주도록 자체
  // 박스(rounded border + 배경)로 감싸 영역을 분리한다 — 중/소분류는 그 안에서 좌측 보더로 들여쓴다.
  // 하위 카테고리가 더 없는 노드(소분류, 트리 최하단)는 전체 토글을 두지 않는다 — 바로 아래
  // 개별 항목 행 토글과 사실상 같은 대상을 중복 제어하게 되어 불필요하다. 대/중분류만 하위
  // 전체를 켜고 끄는 전체 토글을 갖는다(계층적: 상위 off → 하위 전부 off).
  function renderGroupNode(node: CategoryGroupNode, depth: number, showAssetColumns: boolean) {
    const nodeItems = flattenNode(node)
    const allIncluded = nodeItems.length > 0 && nodeItems.every((item) => rowState(item).included)
    return (
      <div
        key={node.id}
        className={cn(
          'mb-4 last:mb-0',
          depth === 0 ? 'rounded-xl border border-border bg-muted/30 p-4' : 'pl-4 border-l border-border',
        )}
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="text-xs font-semibold text-muted-foreground">{node.name}</div>
          {node.children.length > 0 && nodeItems.length > 0 && (
            <Switch
              checked={allIncluded}
              onCheckedChange={(next) => setItemsIncluded(nodeItems, next)}
              aria-label={`${node.name} 전체 포함`}
            />
          )}
        </div>
        {node.items.map((item) => renderRow(item, showAssetColumns))}
        {node.children.map((child) => renderGroupNode(child, depth + 1, showAssetColumns))}
      </div>
    )
  }

  function renderSection(title: string, nodes: CategoryGroupNode[], showAssetColumns = false) {
    const sectionItems = flattenNodes(nodes)
    const allIncluded = sectionItems.length > 0 && sectionItems.every((item) => rowState(item).included)
    return (
      <Surface as="section" className="p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm font-bold">{title}</div>
          {sectionItems.length > 0 && (
            <Switch
              checked={allIncluded}
              onCheckedChange={(next) => setItemsIncluded(sectionItems, next)}
              aria-label={`${title} 전체 포함`}
            />
          )}
        </div>
        {nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">이 달 등록된 기록이 없어요.</p>
        ) : (
          nodes.map((node) => renderGroupNode(node, 0, showAssetColumns))
        )}
      </Surface>
    )
  }

  const submitDisabled = mutation.isPending || includedCount === 0

  return (
    <div className={cn('space-y-[18px] sm:pb-0', MOBILE_FIXED_BAR_RESERVE_CLASS)}>
      {/* PC 저장 버튼은 필터 행 우측 상단에 둔다 — 데이터가 길어지는 화면 하단부에 있으면
          스크롤해야 보이는 위치라 눈에 잘 띄지 않는다는 피드백으로 상단으로 옮겼다. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <YearMonthSelect value={sourceMonth} onChange={setSourceMonth} yearLabel="소스 연도" monthLabel="소스 월" />
          <span>기록으로</span>
          <YearMonthSelect value={targetMonth} onChange={setTargetMonth} yearLabel="대상 연도" monthLabel="대상 월" />
          <span>모두 등록</span>
        </div>
        <Button onClick={handleSubmit} disabled={submitDisabled} className="hidden sm:inline-flex">
          이대로 확정하기
        </Button>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-2">
        <div>{renderSection('자산', items.asset, true)}</div>
        <div className="space-y-[18px]">
          {renderSection('수입', items.income)}
          {renderSection('소비', items.expense)}
          {renderSection('저축', items.saving)}
        </div>
      </div>

      {/* 모바일 하단 탭바(widgets/layout/MobileBottomNav, fixed bottom-0 z-40)와 겹치지 않도록
          탭바 실제 높이만큼 위(MOBILE_BOTTOM_NAV_OFFSET_CLASS)에 별도 z-40 바를 띄운다 — bottom-0으로
          겹치면 탭바가 위에 렌더돼 이 버튼이 완전히 가려진다. 바/버튼 스타일은 AssetForm·EditAccountForm의
          모바일 제출 바 SSOT(p-4 bg-background border-t z-40 + w-full h-14 text-base font-semibold)를 따른다. */}
      <div className={cn('sm:hidden fixed left-0 right-0 z-40 p-4 bg-background border-t', MOBILE_BOTTOM_NAV_OFFSET_CLASS)}>
        <Button
          onClick={handleSubmit}
          disabled={submitDisabled}
          className="w-full h-14 text-base font-semibold"
        >
          이대로 확정하기
        </Button>
      </div>
    </div>
  )
}
