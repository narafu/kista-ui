'use client'

import Link from 'next/link'
import { CategoryManager } from '@features/finance/manage-categories'
import { AccountManager } from '@features/finance/manage-accounts'
import { StrategySuggestionManager } from '@features/finance/manage-strategy-suggestions'
import { GroupManager } from '@features/finance/manage-group'
import { HideAmountsToggle } from '@features/finance/hide-amounts'
import { Surface } from '@shared/ui/Surface'
import { BRAND_GRADIENT_BUTTON_CLASS } from '@shared/ui/brand-button-class'
import { cn } from '@shared/lib/utils'

// 자산 탭의 5번째 세그먼트("설정")를 구성하는 조합 위젯 — SettingsPageContent와 동일하게
// features 슬라이스를 Surface 카드로 묶어 나열한다. 카테고리·계좌는 서로 다른 리소스라
// AccountManager가 자체 카드(bg-card 배경)를 갖고 있어 이 컴포넌트가 다시 Surface로
// 감싸지 않는다 — CategoryManager/GroupManager는 카드 배경이 없어 Surface로 감싼다.
// StrategySuggestionManager는 유저별 설정(구 admin/settings 폼의 전역 설정을 2026-08 이관)이라
// ADMIN 게이트 없이 모든 로그인 유저에게 노출된다.
// 예산 관리는 수입/소비/저축 탭 상단 "예산등록" 버튼(BudgetManagerDialog)으로 이관됐다(2026-08).
export function AssetSettingsPanel() {
  return (
    <div className="flex flex-col gap-[18px]">
      <Surface as="section" className="p-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold mb-0.5">한 번에 등록하기</div>
          <div className="text-sm text-muted-foreground">지난달 자산·수입·소비·저축 기록을 이번 달로 한 번에 채워요</div>
        </div>
        <Link
          href="/finance/bulk-register"
          className={cn('inline-flex items-center h-8 px-3 rounded-md text-xs', BRAND_GRADIENT_BUTTON_CLASS)}
        >
          모두 등록
        </Link>
      </Surface>

      <Surface as="section" className="p-6">
        <HideAmountsToggle />
      </Surface>

      <Surface as="section" className="p-6">
        <div className="text-sm font-bold mb-0.5">카테고리</div>
        <div className="text-sm text-muted-foreground mb-[18px]">자산·수입·지출·저축 카테고리를 관리합니다.</div>
        <CategoryManager />
      </Surface>

      <AccountManager />

      <StrategySuggestionManager />

      <GroupManager />
    </div>
  )
}
