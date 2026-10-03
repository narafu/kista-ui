'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { PageHeader } from '@widgets/page-header'
import { SectionTabBar } from '@shared/ui/SectionTabBar'
import { cn, isSectionTabActive } from '@shared/lib/utils'
import { budgetListHref, registerWindowUpperBound } from '@entities/finance'
import type { FlowType } from '@entities/finance'
import { todayKst } from '@shared/lib/format'
import { NewAssetButton } from '@features/asset/save-asset'
import { NewTransactionButton } from '@features/finance/save-transaction'

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

const FLOW_TYPE_BY_HREF: Record<string, FlowType> = {
  '/finance/income': 'INCOME',
  '/finance/expense': 'EXPENSE',
  '/finance/saving': 'SAVING',
}

export function FinanceHeader() {
  // 예산 관리 라우트(/finance/budgets/{slug}/...)가 @modal로 떠 있는 동안 이 헤더는 배경 페이지에 남는다 —
  // 경로를 원래 흐름 탭(/finance/{slug})으로 되돌려 봐야 제목·탭·액션이 "내 자산"으로 바뀌지 않는다.
  const pathname = usePathname().replace(/^\/finance\/budgets\/([^/]+).*$/, '/finance/$1')
  const activeHref = TAB_OPTIONS.find(({ href }) => isSectionTabActive(pathname, href, '/finance'))?.href ?? '/finance'
  const flowType = FLOW_TYPE_BY_HREF[activeHref]
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
              <Link href={budgetListHref(flowType)} className={cn(buttonVariants({ variant: 'brand-soft', size: 'sm' }), 'gap-1.5')}>
                <Plus className="size-3.5" />
                예산 관리
              </Link>
              <NewTransactionButton type={flowType} windowFrom={undefined} windowTo={registerWindowTo} />
            </div>
          ) : undefined
        }
      />
      <SectionTabBar
        items={TAB_OPTIONS}
        rootHref="/finance"
        ariaLabel="가계부 탭"
        activePathname={pathname}
        className="grid-cols-5 sm:w-[30rem]"
      />
    </>
  )
}
