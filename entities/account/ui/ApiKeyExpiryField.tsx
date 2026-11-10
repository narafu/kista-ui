import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { kstToday } from '../model/apiKeyExpiry'

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  hint: string
  disabled?: boolean
}

export function ApiKeyExpiryField({ id, value, onChange, hint, disabled }: Props) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>API 키 만료일 (선택)</Label>
      <Input id={id} type="date" min={kstToday()} className="h-12" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
