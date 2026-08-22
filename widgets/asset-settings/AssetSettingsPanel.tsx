'use client'

import { CategoryManager } from '@features/finance/manage-categories'
import { AccountManager } from '@features/finance/manage-accounts'
import { StrategySuggestionManager } from '@features/finance/manage-strategy-suggestions'
import { GroupManager } from '@features/finance/manage-group'
import { HideAmountsToggle } from '@features/finance/hide-amounts'
import { Surface } from '@shared/ui/Surface'

// 자산 탭의 5번째 세그먼트("설정")를 구성하는 조합 위젯 — SettingsPageContent와 동일하게
// features 슬라이스를 Surface 카드로 묶어 나열한다. 카테고리·계좌는 서로 다른 리소스라
// AccountManager가 자체 카드(bg-card 배경)를 갖고 있어 이 컴포넌트가 다시 Surface로
// 감싸지 않는다 — CategoryManager/GroupManager는 카드 배경이 없어 Surface로 감싼다.
// StrategySuggestionManager는 ADMIN이 아니면 스스로 null을 반환한다(구 admin/settings 폼의
// 전역 설정을 계좌관리 아래로 이관 — 일반 사용자도 방문하는 탭이라 컴포넌트 자체가 게이팅한다).
// 예산 관리는 수입/소비/저축 탭 상단 "예산등록" 버튼(BudgetManagerDialog)으로 이관됐다(2026-08).
export function AssetSettingsPanel() {
  return (
    <div className="flex flex-col gap-[18px]">
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
