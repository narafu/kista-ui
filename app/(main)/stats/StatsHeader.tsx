'use client'

import { usePathname } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { SectionTabBar } from '@shared/ui/SectionTabBar'
import { isSectionTabActive } from '@shared/lib/utils'

const TAB_OPTIONS = [
  { href: '/stats', label: '성과' },
  { href: '/stats/benchmark', label: '벤치마크' },
  { href: '/stats/backtest', label: '백테스트' },
]

export function StatsHeader() {
  const pathname = usePathname()
  const activeLabel = TAB_OPTIONS.find(({ href }) => isSectionTabActive(pathname, href, '/stats'))?.label ?? '성과'

  return (
    <>
      <PageHeader eyebrow="Stats" title={activeLabel} />
      <SectionTabBar items={TAB_OPTIONS} rootHref="/stats" ariaLabel="통계 탭" className="grid-cols-3 sm:w-[22rem]" />
    </>
  )
}
