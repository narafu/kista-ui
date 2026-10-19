'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function ToggleRow({ id, label, description, checked, onChange }: {
  id: string; label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-3">
      <div>
        <Label htmlFor={id}>{label}</Label>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}
