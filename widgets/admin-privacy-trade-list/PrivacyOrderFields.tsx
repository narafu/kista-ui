import { useWatch, type Control, type FieldValues } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@shared/ui/form/FormField'
import { orderRequiresQuantity } from '@entities/privacy'
import { usePrivacyOrderSelectItems } from './orderSelectItems'

interface Props {
  // 주문 행 값(direction·orderType·price·quantity)을 prefix 아래에 가진 폼의 control
  control: Control<FieldValues>
  // '' 또는 'orders.0.' — 필드 이름 앞머리
  prefix?: string
  // 수정은 가격·수량만 편집한다
  showKind?: boolean
  // 등록 다이얼로그의 주문 행 — 2열 그리드 안에 낱개 필드로 놓인다
  compact?: boolean
  disabled?: boolean
}

// 주문 입력 필드 묶음 — 추가 다이얼로그와 기준 등록의 주문 행이 공유한다
export function PrivacyOrderFields({ control, prefix = '', showKind = true, compact, disabled }: Props) {
  const { directionItems, orderTypeItems } = usePrivacyOrderSelectItems()
  const direction = useWatch({ control, name: `${prefix}direction` })
  const quantityRequired = orderRequiresQuantity(direction)
  const cls = compact ? 'space-y-1' : 'space-y-2'
  const label = (text: string) => (compact ? <span className="text-xs">{text}</span> : text)
  const triggerCls = compact ? 'h-10 w-full' : 'h-11'
  const inputCls = compact ? 'h-10' : 'h-11'

  const kind = (
    <>
      <FormField control={control} name={`${prefix}direction`} id={`${prefix}direction`} label={label('방향')} className={cls}>
        {(f) => (
          <Select items={directionItems} value={f.value} onValueChange={(v) => { if (v) f.onChange(v) }}>
            <SelectTrigger id={f.id} className={triggerCls} disabled={disabled}><SelectValue /></SelectTrigger>
            <SelectContent>
              {directionItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </FormField>
      <FormField control={control} name={`${prefix}orderType`} id={`${prefix}orderType`} label={label('유형')} className={cls}>
        {(f) => (
          <Select items={orderTypeItems} value={f.value} onValueChange={(v) => { if (v) f.onChange(v) }}>
            <SelectTrigger id={f.id} className={triggerCls} disabled={disabled}><SelectValue /></SelectTrigger>
            <SelectContent>
              {orderTypeItems.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </FormField>
    </>
  )

  return (
    <>
      {showKind && (compact ? kind : <div className="grid grid-cols-2 gap-3">{kind}</div>)}
      <FormField control={control} name={`${prefix}price`} id={`${prefix}price`} label={label('가격')} required className={cls}>
        {(f) => <Input {...f} type="number" step="0.01" min="0.01" disabled={disabled} className={inputCls} />}
      </FormField>
      <FormField control={control} name={`${prefix}quantity`} id={`${prefix}quantity`} label={label(quantityRequired ? '수량' : '수량 (없으면 비움)')} required={quantityRequired} className={cls}>
        {(f) => <Input {...f} type="number" step="1" min="1" disabled={disabled} className={inputCls} />}
      </FormField>
    </>
  )
}
