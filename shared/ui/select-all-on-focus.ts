import type { FocusEvent } from 'react'

// 포커스 시 기존 값을 전체 선택 — 붙여넣기가 기존 텍스트를 대체하도록 해 커서 위치에 값이
// 이어붙어 "0"이 앞에 남는 현상(예: "0" + 붙여넣기 "5000" → "05000")을 막는다.
// 금액/숫자 입력 전반(AssetForm·TransactionFormDialog·BudgetFormDialog·BulkRegisterForm·
// SeedAmountInput·UnitInput·ReconfigureVrForm)이 공유한다.
export function selectAllOnFocus(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.select()
}
