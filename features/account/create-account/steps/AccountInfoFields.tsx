import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface FieldProps {
  value: string
  showError: boolean
  onChange: (value: string) => void
  onBlur: () => void
}

export function NicknameField({ value, placeholder, showError, onChange, onBlur }: FieldProps & { placeholder: string }) {
  return (
    <div>
      <Label htmlFor="account-nickname" className="mb-1.5 gap-1 font-semibold">
        계좌 별칭 <span className="text-destructive">*</span>
      </Label>
      <Input
        id="account-nickname"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={100}
        aria-describedby={showError ? 'nickname-error' : undefined}
        aria-invalid={showError}
        className="h-11"
      />
      {showError && (
        <p id="nickname-error" className="text-sm text-destructive mt-1">별칭을 입력하세요.</p>
      )}
    </div>
  )
}

interface AccountNoConfig {
  label: string
  maxLen: number
  placeholder: string
  hint: string
  format: (raw: string) => string
}

export function AccountNoField({ config, value, showError, onChange, onBlur }: FieldProps & { config: AccountNoConfig }) {
  return (
    <div>
      <Label htmlFor="account-no" className="mb-1.5 gap-1 font-semibold">
        {config.label} <span className="text-destructive">*</span>
      </Label>
      <Input
        id="account-no"
        value={value}
        onChange={(e) => onChange(config.format(e.target.value))}
        onBlur={onBlur}
        placeholder={config.placeholder}
        maxLength={config.maxLen}
        aria-describedby={showError ? 'accountno-error' : 'accountno-hint'}
        aria-invalid={showError}
        className="h-11 font-mono"
      />
      {showError ? (
        <p id="accountno-error" className="text-sm text-destructive mt-1">
          올바른 계좌번호 형식으로 입력하세요. (예: {config.placeholder})
        </p>
      ) : (
        <p id="accountno-hint" className="text-sm text-muted-foreground mt-1">{config.hint}</p>
      )}
    </div>
  )
}
