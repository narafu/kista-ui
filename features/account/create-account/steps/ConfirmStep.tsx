'use client'

import { useCreateAccountMutation } from '@entities/account'
import { ApiError } from '@shared/lib/api-client'
import type { StepData } from '../CreateAccountStepper'

interface Props {
  data: StepData
  onBack: () => void
}

export function ConfirmStep({ data, onBack }: Props) {
  const { mutate, isPending, isError, error } = useCreateAccountMutation()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">입력 확인</h2>
        <p className="text-sm text-muted-foreground">
          아래 정보로 계좌를 연결합니다. 등록 후 전략을 추가할 수 있습니다.
        </p>
      </div>

      <div className="rounded-[var(--r-lg)] border border-border bg-card divide-y divide-border">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">별칭</span>
          <span className="text-sm font-semibold">{data.nickname}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">계좌번호</span>
          <span className="text-sm font-semibold">{data.accountNo}-01</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">API Key</span>
          <span className="text-sm font-semibold">
            {data.apiKey ? `${data.apiKey.slice(0, 6)}...` : '-'}
          </span>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-neg">
          {error instanceof ApiError && error.status === 422
            ? '계좌번호가 KIS 자격증명과 일치하지 않습니다'
            : '계좌 연결에 실패했습니다'}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="flex-1 h-11 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-40"
        >
          이전
        </button>
        <button
          type="button"
          onClick={() => mutate({
            nickname: data.nickname,
            kisAppKey: data.apiKey,
            kisSecretKey: data.apiSecret,
            accountNo: data.accountNo,
          })}
          disabled={isPending}
          className="flex-1 h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? '연결 중...' : '계좌 연결'}
        </button>
      </div>
    </div>
  )
}
