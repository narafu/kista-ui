'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Eye, EyeOff, SlidersHorizontal } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { PageHeader } from '@widgets/page-header'
import { SectionTabBar } from '@shared/ui/SectionTabBar'
import { IconButton } from '@shared/ui/IconButton'
import { cn, isSectionTabActive } from '@shared/lib/utils'
import { budgetListHref, registerWindowUpperBound } from '@entities/finance'
import type { FlowType } from '@entities/finance'
import { todayKst } from '@shared/lib/format'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
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
  const { hidden, revealed, setAmountRevealed } = useAmountHiddenPreference()
  // 일시 공개는 가계부를 떠나면 끝낸다 — 모듈 스토어라 언마운트 시 직접 되돌리지 않으면 SPA 세션 내내 유지된다
  useEffect(() => () => setAmountRevealed(false), [setAmountRevealed])
  // 금액 감추기를 켠 경우에만, 금액이 있는 자산·수입·소비·저축 탭에서 이 화면의 금액을 한꺼번에 잠깐 공개한다
  const revealToggle = hidden ? (
    <IconButton aria-label={revealed ? '금액 숨기기' : '금액 보기'} onClick={() => setAmountRevealed(!revealed)}>
      {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </IconButton>
  ) : null

  return (
    <>
      <PageHeader
        eyebrow="가계부"
        title={TITLE_BY_HREF[activeHref]}
        actions={
          activeHref === '/finance' ? (
            <div className="flex items-center gap-2">
              {revealToggle}
              <NewAssetButton />
            </div>
          ) : flowType ? (
            <div className="flex items-center gap-2">
              {revealToggle}
              <Link href={budgetListHref(flowType)} className={cn(buttonVariants({ variant: 'brand-soft', size: 'sm' }), 'gap-1.5')}>
                <SlidersHorizontal className="size-3.5" />
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
