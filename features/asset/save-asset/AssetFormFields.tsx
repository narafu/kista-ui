'use client'

import { Input } from '@/components/ui/input'
import type { UseFormReturn } from 'react-hook-form'
import { FormField } from '@shared/ui/form/FormField'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FinanceAccount } from '@entities/finance'
import type { MetaBundle } from '@entities/meta'
import { NO_ACCOUNT_VALUE, accountOptionLabel, type AssetFormValues } from './model/assetFormHelpers'

type Control = UseFormReturn<AssetFormValues>['control']

interface ComboFieldProps {
  control: Control
  placeholder: string
  suggestions: string[]
  disabled?: boolean
}

// 운용전략 자유 입력 Input과 추천 목록 Select를 한 필드로 묶는다. Select는 값을 선택 즉시
// 폼 값에 흘려보낼 뿐 자체 선택 상태를 갖지 않는다(자유 입력이 SSOT).
export function ComboField({ control, placeholder, suggestions, disabled }: ComboFieldProps) {
  return (
    <FormField control={control} name="strategy" label="운용전략" hint="자동매매 전략과 무관한 자유 메모입니다.">
      {(f) => (
        <div className="flex gap-2">
          <Select
            items={suggestions.map((s) => ({ value: s, label: s }))}
            onValueChange={(next: string | null) => { if (next) f.onChange(next) }}
          >
            <SelectTrigger aria-label="운용전략 목록에서 선택" className="w-32 h-11 shrink-0" disabled={disabled}>
              <SelectValue>목록</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {suggestions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input {...f} placeholder={placeholder} disabled={disabled} maxLength={50} className="h-11 flex-1" />
        </div>
      )}
    </FormField>
  )
}

export function MarketAssetClassFields({ control, meta, disabled }: { control: Control; meta: MetaBundle; disabled: boolean }) {
  return (
    <>
      <FormField control={control} name="market" label="시장">
        {(f) => (
          <Select
            items={meta.markets.map((m) => ({ value: m.code, label: m.label }))}
            value={f.value}
            onValueChange={(value) => { if (value) f.onChange(value) }}
          >
            <SelectTrigger id={f.id} className="w-full h-11" disabled={disabled}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meta.markets.map((m) => <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField control={control} name="assetClass" label="자산군">
        {(f) => (
          <Select
            items={meta.assetClasses.map((c) => ({ value: c.code, label: c.label }))}
            value={f.value}
            onValueChange={(value) => { if (value) f.onChange(value) }}
          >
            <SelectTrigger id={f.id} className="w-full h-11" disabled={disabled}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meta.assetClasses.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </FormField>
    </>
  )
}

export function AccountField({ control, accounts, accountsByType, disabled, loadFailed = false }: {
  control: Control
  accounts: FinanceAccount[]
  accountsByType: { type: string; label: string; accounts: FinanceAccount[] }[]
  disabled: boolean
  loadFailed?: boolean
}) {
  return (
    <FormField control={control} name="accountId" label="계좌" id="account">
      {(f) => (
        <>
          <Select
            items={[{ value: NO_ACCOUNT_VALUE, label: '계좌 미지정' }, ...accounts.map((a) => ({ value: a.id, label: accountOptionLabel(a) }))]}
            value={f.value}
            onValueChange={(next) => { if (next) f.onChange(next) }}
          >
            <SelectTrigger id={f.id} className="w-full h-11" disabled={disabled}>
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
          {loadFailed && <p className="text-xs text-destructive">계좌 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>}
        </>
      )}
    </FormField>
  )
}
