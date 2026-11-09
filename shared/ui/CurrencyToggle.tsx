'use client'

import type { Currency } from '@shared/lib/api-schema'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'

interface Props {
  options: Currency[]
  value: Currency
  onChange: (currency: Currency) => void
}

/** 합산 통화 선택 — 통화가 하나뿐이면 고를 것이 없어 그리지 않는다 */
export function CurrencyToggle({ options, value, onChange }: Props) {
  if (options.length < 2) return null
  return (
    <SegmentedToggle
      aria-label="통화"
      options={options.map((c) => ({ value: c, label: c }))}
      value={value}
      onChange={onChange}
      className="self-start"
    />
  )
}
