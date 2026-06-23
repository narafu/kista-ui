'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const SIZES = ['10', '30', '50', '100']

interface Props {
  value: string
  /** 제공 시 직접 호출 (클라이언트 사이드). 미제공 시 URL ?size= 업데이트 후 page=1 리셋. */
  onChange?: (size: string) => void
}

export function PageSizeSelector({ value, onChange }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (size: string | null) => {
    if (!size) return
    if (onChange) {
      onChange(size)
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('size', size)
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-24 h-8 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SIZES.map((s) => (
          <SelectItem key={s} value={s}>{s}개</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
