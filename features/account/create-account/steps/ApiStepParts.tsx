import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@shared/ui/Spinner'

interface KeyFieldProps {
  label: string
  value: string
  showError: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
}

export function ApiKeyField({ label, value, showError, onChange, onBlur }: KeyFieldProps) {
  return (
    <div>
      <label htmlFor="api-key" className="text-sm font-semibold mb-1.5 block">
        {label} <span className="text-destructive">*</span>
      </label>
      <input
        id="api-key"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={`발급받은 ${label}`}
        maxLength={256}
        aria-describedby={showError ? 'api-key-error' : undefined}
        aria-invalid={showError}
        className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {showError && (
        <p id="api-key-error" className="text-sm text-destructive mt-1">
          유효한 {label}를 입력해주세요.
        </p>
      )}
    </div>
  )
}

interface SecretFieldProps extends KeyFieldProps {
  showSecret: boolean
  onToggle: () => void
}

export function ApiSecretField({ label, value, showError, onChange, onBlur, showSecret, onToggle }: SecretFieldProps) {
  return (
    <div>
      <label htmlFor="api-secret" className="text-sm font-semibold mb-1.5 block">
        {label} <span className="text-destructive">*</span>
      </label>
      <div className="relative">
        <input
          id="api-secret"
          type={showSecret ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={`발급받은 ${label}`}
          maxLength={512}
          aria-describedby={showError ? 'api-secret-error' : undefined}
          aria-invalid={showError}
          className="w-full px-3 py-2.5 pr-10 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={showSecret ? '숨기기' : '보기'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showError && (
        <p id="api-secret-error" className="text-sm text-destructive mt-1">
          유효한 {label}를 입력해주세요.
        </p>
      )}
    </div>
  )
}

interface ConnectionTestProps {
  keyLabel: string
  secretLabel: string
  disabled: boolean
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  onTest: () => void
}

export function ConnectionTest({ keyLabel, secretLabel, disabled, isPending, isSuccess, isError, onTest }: ConnectionTestProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 gap-2 font-semibold"
        disabled={disabled}
        onClick={onTest}
      >
        {isPending ? (
          <>
            <Spinner size={16} /> 연결 확인 중...
          </>
        ) : (
          '연결 테스트'
        )}
      </Button>
      {isSuccess && (
        <div className="flex items-center gap-1.5 text-sm text-status-ok">
          <CheckCircle2 className="size-4" /> 연결 성공
        </div>
      )}
      {isError && (
        <div className="flex items-center gap-1.5 text-sm text-neg">
          <XCircle className="size-4" />
          증권사 API 인증에 실패했습니다. {keyLabel} 또는 {secretLabel}을 확인하세요.
        </div>
      )}
    </div>
  )
}
