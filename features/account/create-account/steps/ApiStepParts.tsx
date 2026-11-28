import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@shared/ui/Spinner'
import { IconButton } from '@shared/ui/IconButton'
import { brokerErrorMessage } from '@entities/account'

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
      <Label htmlFor="api-key" className="mb-1.5 gap-1 font-semibold">
        {label} <span className="text-destructive">*</span>
      </Label>
      <Input
        id="api-key"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={`발급받은 ${label}`}
        maxLength={256}
        aria-describedby={showError ? 'api-key-error' : undefined}
        aria-invalid={showError}
        className="h-11"
      />
      {showError && (
        <p id="api-key-error" className="text-sm text-destructive mt-1">
          유효한 {label}를 입력하세요.
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
      <Label htmlFor="api-secret" className="mb-1.5 gap-1 font-semibold">
        {label} <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <Input
          id="api-secret"
          type={showSecret ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={`발급받은 ${label}`}
          maxLength={512}
          aria-describedby={showError ? 'api-secret-error' : undefined}
          aria-invalid={showError}
          className="h-11 pr-11"
        />
        <IconButton
          onClick={onToggle}
          aria-label={showSecret ? '숨기기' : '보기'}
          className="absolute right-0 top-1/2 -translate-y-1/2"
        >
          {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </IconButton>
      </div>
      {showError && (
        <p id="api-secret-error" className="text-sm text-destructive mt-1">
          유효한 {label}를 입력하세요.
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
  error: unknown
  onTest: () => void
}

export function ConnectionTest({ keyLabel, secretLabel, disabled, isPending, isSuccess, isError, error, onTest }: ConnectionTestProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="form"
        className="w-full"
        disabled={disabled}
        onClick={onTest}
      >
        {isPending ? (
          <>
            <Spinner size={16} /> 연결 확인 중…
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
        <div className="flex items-center gap-1.5 text-sm text-status-error">
          <XCircle className="size-4" />
          {brokerErrorMessage(error, `증권사 API 인증에 실패했습니다. ${keyLabel} 또는 ${secretLabel}을 확인하세요.`, '연결 테스트에 실패했습니다. 잠시 후 다시 시도해주세요.')}
        </div>
      )}
    </div>
  )
}
