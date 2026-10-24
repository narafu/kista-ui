import { Eye, EyeOff, CheckCircle2, XCircle, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@shared/ui/Spinner'
import { IconButton } from '@shared/ui/IconButton'
import { Badge } from '@shared/ui/Badge'
import { BROKER_CREDENTIAL, brokerErrorMessage, type CredentialBroker } from '@entities/account'
import { isCryptoBroker } from '@shared/lib/api-schema'

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
  broker: string
  keyLabel: string
  secretLabel: string
  disabled: boolean
  isPending: boolean
  isSuccess: boolean
  isError: boolean
  error: unknown
  onTest: () => void
}

export function ConnectionTest({ broker, keyLabel, secretLabel, disabled, isPending, isSuccess, isError, error, onTest }: ConnectionTestProps) {
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
        <div className="flex items-center gap-1.5 text-sm text-[var(--status-error)]">
          <XCircle className="size-4" />
          {/* 거래소 키는 'Secret Key를'처럼 조사가 달라지고 바이낸스는 허용 IP도 짚어야 해 broker별 문구를 쓴다. KIS 문구는 이 단계에 없는 계좌번호를 짚어 증권사는 공통 문구로 둔다 */}
          {brokerErrorMessage(error, isCryptoBroker(broker) ? BROKER_CREDENTIAL[broker as CredentialBroker].invalidMessage : `증권사 API 인증에 실패했습니다. ${keyLabel} 또는 ${secretLabel}을 확인하세요.`, '연결 테스트에 실패했습니다. 잠시 후 다시 시도해주세요.')}
        </div>
      )}
    </div>
  )
}

const UPBIT_REQUIRED_PERMISSIONS = ['자산 조회', '주문 조회', '주문하기']
const BINANCE_REQUIRED_PERMISSIONS = ['읽기', '현물 및 마진 거래']

interface KeyGuideProps {
  allowedIp: string | undefined
  isLoading: boolean
  permissions: string[]
  withdrawLabel: string
  notes?: React.ReactNode
}

export function UpbitKeyGuide({ allowedIp, isLoading }: Pick<KeyGuideProps, 'allowedIp' | 'isLoading'>) {
  return <KeyGuide allowedIp={allowedIp} isLoading={isLoading} permissions={UPBIT_REQUIRED_PERMISSIONS} withdrawLabel="출금하기" />
}

export function BinanceKeyGuide({ allowedIp, isLoading }: Pick<KeyGuideProps, 'allowedIp' | 'isLoading'>) {
  return (
    <KeyGuide
      allowedIp={allowedIp}
      isLoading={isLoading}
      permissions={BINANCE_REQUIRED_PERMISSIONS}
      withdrawLabel="출금"
      notes={
        <>
          <p>키 유형은 시스템 생성(HMAC) 키만 사용할 수 있습니다. Ed25519·RSA 자가 생성 키는 쓸 수 없습니다.</p>
          {/* IP 제한이 없는 키는 바이낸스 연결 테스트가 BROKER_IP_NOT_ALLOWED로 실패한다 */}
          <p className="font-semibold">IP 접근 제한(Restrict access to trusted IPs only)을 반드시 켜고 아래 허용 IP를 등록하세요.</p>
        </>
      }
    />
  )
}

function KeyGuide({ allowedIp, isLoading, permissions, withdrawLabel, notes }: KeyGuideProps) {
  async function handleCopy() {
    if (!allowedIp) return
    try {
      await navigator.clipboard.writeText(allowedIp)
      toast.success('허용 IP를 복사했습니다')
    } catch {
      toast.error('복사에 실패했습니다. IP를 직접 선택해 복사해주세요.')
    }
  }

  return (
    <div className="space-y-2 rounded-[var(--r-sm)] border border-border bg-muted px-4 py-3 text-sm">
      <p className="font-semibold">API 키 발급 시 설정</p>
      {notes}
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">허용 IP</span>
        {allowedIp ? (
          <span className="flex items-center gap-1">
            <span className="font-mono font-semibold">{allowedIp}</span>
            <IconButton aria-label="허용 IP 복사" onClick={handleCopy}>
              <Copy className="size-4" />
            </IconButton>
          </span>
        ) : (
          <span className="text-muted-foreground">{isLoading ? '확인 중' : '불러오지 못했습니다.'}</span>
        )}
      </div>
      <p className="flex flex-wrap items-center gap-1">
        권한은
        {permissions.slice(0, -1).map((p) => <Badge key={p} tone="ok" size="md">{p}</Badge>)}
        {/* 마지막 배지와 "만 켜세요."가 줄바꿈으로 갈라지지 않게 묶는다 */}
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
          <Badge tone="ok" size="md">{permissions.at(-1)}</Badge>만 켜세요.
        </span>
      </p>
      <p className="flex flex-wrap items-center gap-1 font-semibold text-[var(--warn)]">
        <Badge tone="error" size="md">{withdrawLabel}</Badge>
        권한은 켜지 마세요. 키가 유출돼도 출금은 막힙니다.
      </p>
    </div>
  )
}
