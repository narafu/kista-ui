'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AssetClass, FinanceAccount, Market } from '@entities/finance'
import type { MetaBundle } from '@entities/meta'
import { NO_ACCOUNT_VALUE, accountOptionLabel } from './model/assetFormHelpers'

interface ComboFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  selectLabel: string
  disabled?: boolean
  maxLength?: number
  helperText?: string
}

// 운용전략 자유 입력 Input과 추천 목록 Select를 한 필드로 묶는다. Select는 값을 선택 즉시
// onChange로 흘려보낼 뿐 자체 선택 상태를 갖지 않는다(자유 입력이 SSOT).
export function ComboField({
  id,
  label,
  placeholder,
  value,
  onChange,
  suggestions,
  selectLabel,
  disabled,
  maxLength,
  helperText,
}: ComboFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Select
          items={suggestions.map((s) => ({ value: s, label: s }))}
          onValueChange={(next: string | null) => { if (next) onChange(next) }}
        >
          <SelectTrigger aria-label={selectLabel} className="w-32 h-12 shrink-0" disabled={disabled}>
            <SelectValue>목록</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {suggestions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          className="h-12 flex-1"
        />
      </div>
      {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  )
}

export function MarketAssetClassFields({ meta, market, assetClass, onMarketChange, onAssetClassChange, disabled }: {
  meta: MetaBundle
  market: Market
  assetClass: AssetClass
  onMarketChange: (value: Market) => void
  onAssetClassChange: (value: AssetClass) => void
  disabled: boolean
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="market">시장</Label>
        <Select
          items={meta.markets.map((m) => ({ value: m.code, label: m.label }))}
          value={market}
          onValueChange={(value) => { if (value) onMarketChange(value as Market) }}
        >
          <SelectTrigger id="market" className="w-full h-12" disabled={disabled}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {meta.markets.map((m) => <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assetClass">자산군</Label>
        <Select
          items={meta.assetClasses.map((c) => ({ value: c.code, label: c.label }))}
          value={assetClass}
          onValueChange={(value) => { if (value) onAssetClassChange(value as AssetClass) }}
        >
          <SelectTrigger id="assetClass" className="w-full h-12" disabled={disabled}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {meta.assetClasses.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

export function AccountField({ accounts, accountsByType, value, onChange, disabled }: {
  accounts: FinanceAccount[]
  accountsByType: { type: string; label: string; accounts: FinanceAccount[] }[]
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="account">계좌 (선택)</Label>
      <Select
        items={[{ value: NO_ACCOUNT_VALUE, label: '계좌 미지정' }, ...accounts.map((a) => ({ value: a.id, label: accountOptionLabel(a) }))]}
        value={value}
        onValueChange={(next) => { if (next) onChange(next) }}
      >
        <SelectTrigger id="account" className="w-full h-12" disabled={disabled}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_ACCOUNT_VALUE}>계좌 미지정</SelectItem>
          {accountsByType.map((group) => (
            <SelectGroup key={group.type}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.accounts.map((a) => <SelectItem key={a.id} value={a.id}>{accountOptionLabel(a)}</SelectItem>)}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
