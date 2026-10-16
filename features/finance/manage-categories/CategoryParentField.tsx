'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { FinanceCategory } from '@entities/finance'
import { NO_PARENT_VALUE } from './categoryFormHelpers'

export function ParentCategoryField({ id = 'parentId', cascadeLevels, selectedPath, onPathChange, disabled }: {
  id?: string
  cascadeLevels: FinanceCategory[][]
  selectedPath: string[]
  onPathChange: (updater: (prev: string[]) => string[]) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>상위 카테고리</Label>
      <div className="space-y-2">
        {cascadeLevels.map((level, levelIndex) => (
          <Select
            key={levelIndex}
            items={[
              { value: NO_PARENT_VALUE, label: '없음 (최상위로 생성)' },
              ...level.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={selectedPath[levelIndex] ?? NO_PARENT_VALUE}
            onValueChange={(value) => {
              if (!value) return
              onPathChange((prev) => (value === NO_PARENT_VALUE ? prev.slice(0, levelIndex) : [...prev.slice(0, levelIndex), value]))
            }}
          >
            {/* 1단계는 Label과 연결되지만 2단계부터는 이름이 비므로 단계별 이름을 직접 단다 */}
            <SelectTrigger id={levelIndex === 0 ? id : undefined} aria-label={levelIndex === 0 ? undefined : `상위 카테고리 ${levelIndex + 1}단계`} className="w-full h-10" disabled={disabled}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PARENT_VALUE}>없음 (최상위로 생성)</SelectItem>
              {level.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
      </div>
    </div>
  )
}
