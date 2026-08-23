'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface Props {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  // 다이얼로그별 고유 id — label htmlFor 연결용. 같은 화면에 두 인스턴스가 동시에 마운트될 일은
  // 없지만(모드별 다이얼로그 1개만 열림) DOM id 중복을 피하려 호출부가 명시한다.
  id: string
}

/**
 * 예산·거래내역·자산·계좌 등록 폼이 공유하는 "그룹으로 저장" 스위치 — 생성 모드 전용,
 * useCanShareToGroup()으로 게이팅해 그룹 소속일 때만 렌더한다(게이팅은 호출부 책임).
 */
export function ShareToGroupSwitch({ checked, onCheckedChange, disabled, id }: Props) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id}>그룹으로 저장</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
