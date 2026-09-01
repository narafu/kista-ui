'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { SectionTabBar } from '@shared/ui/SectionTabBar'
import { isSectionTabActive } from '@shared/lib/utils'
import { registerWindowUpperBound } from '@entities/finance'
import { todayKst } from '@shared/lib/format'
import { NewAssetButton } from '@features/asset/save-asset'
import { NewTransactionButton } from '@features/finance/save-transaction'
import { BudgetManagerDialog } from '@features/finance/manage-budgets'

const TAB_OPTIONS = [
  { href: '/finance',          label: '자산' },
  { href: '/finance/income',   label: '수입' },
  { href: '/finance/expense',  label: '소비' },
  { href: '/finance/saving',   label: '저축' },
  { href: '/finance/settings', label: '설정' },
]

const TITLE_BY_HREF: Record<string, string> = {
  '/finance': '내 자산',
  '/finance/income': '수입',
  '/finance/expense': '소비',
  '/finance/saving': '저축',
  '/finance/settings': '설정',
}

const FLOW_TYPE_BY_HREF: Record<string, 'INCOME' | 'EXPENSE' | 'SAVING'> = {
  '/finance/income': 'INCOME',
  '/finance/expense': 'EXPENSE',
  '/finance/saving': 'SAVING',
}

export function FinanceHeader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeHref = TAB_OPTIONS.find(({ href }) => isSectionTabActive(pathname, href, '/finance'))?.href ?? '/finance'
  const flowType = FLOW_TYPE_BY_HREF[activeHref]
  // 수입/소비/저축 3탭은 조회 기간(?month=&mode=)을 URL로 공유한다(useFinanceFlowData 참고) —
  // 탭 링크가 현재 쿼리스트링을 그대로 이어받아야 탭을 옮겨도 보던 기간이 유지된다.
  const flowQuery = searchParams.toString()
  const registerWindowTo = registerWindowUpperBound(todayKst())

  return (
    <>
      <PageHeader
        eyebrow="가계부"
        title={TITLE_BY_HREF[activeHref]}
        actions={
          activeHref === '/finance' ? (
            <NewAssetButton />
          ) : flowType ? (
            <div className="flex items-center gap-2">
              <BudgetManagerDialog type={flowType} />
              <NewTransactionButton type={flowType} windowFrom={undefined} windowTo={registerWindowTo} />
            </div>
          ) : undefined
        }
      />
      <SectionTabBar
        items={TAB_OPTIONS}
        rootHref="/finance"
        ariaLabel="가계부 탭"
        className="grid-cols-5 sm:w-[30rem]"
        getHref={(href) => (href in FLOW_TYPE_BY_HREF && flowQuery ? `${href}?${flowQuery}` : href)}
      />
    </>
  )
}
