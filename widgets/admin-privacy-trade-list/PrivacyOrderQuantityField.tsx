import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { orderRequiresQuantity } from '@entities/privacy'
import type { AdminPrivacyOrder } from '@entities/privacy'

interface Props {
  id: string
  direction: AdminPrivacyOrder['direction']
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  compact?: boolean
}

/** 주문 수량 입력 — BUY는 필수(비면 인라인 오류), SELL은 선택. 오류는 한 번 벗어난 뒤부터 보여 다이얼로그를 열자마자 뜨지 않게 한다. */
export function PrivacyOrderQuantityField({ id, direction, value, onChange, disabled, compact }: Props) {
  const required = orderRequiresQuantity(direction)
  const [touched, setTouched] = useState(false)
  const invalid = touched && required && value === ''
  return (
    <>
      <Label htmlFor={id} className={compact ? 'text-xs' : undefined}>수량 {required ? '(필수)' : '(없으면 비움)'}</Label>
      <Input
        id={id}
        type="number"
        step="1"
        min="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={compact ? 'h-10' : 'h-11'}
      />
      {invalid && <p id={`${id}-error`} className="text-xs text-destructive">매수 주문은 수량이 필요합니다.</p>}
    </>
  )
}
