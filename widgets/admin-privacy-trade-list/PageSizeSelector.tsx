'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const SIZES = ['10', '30', '50', '100']

interface Props {
  value: string
}

export function PageSizeSelector({ value }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (size: string | null) => {
    if (!size) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('size', size)
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
