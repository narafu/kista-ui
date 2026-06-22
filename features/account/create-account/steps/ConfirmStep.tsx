'use client'

import { useCreateAccountMutation } from '@entities/account'
import { useMeta } from '@entities/meta'
import { ApiError } from '@shared/lib/api-client'
import type { BrokerCode, AccountRequest } from '@entities/account'
import type { StepData } from '../CreateAccountStepper'

interface Props {
  data: StepData
  onBack: () => void
}

export function ConfirmStep({ data, onBack }: Props) {
  const { mutate, isPending, isError, error } = useCreateAccountMutation()
  const { labelOf } = useMeta()

  const broker = (data.broker || 'KIS') as BrokerCode

  function handleSubmit() {
    const req: AccountRequest = {
      nickname: data.nickname,
      appKey: data.apiKey,
      secretKey: data.apiSecret,
      accountNo: data.accountNo,
      broker,
    }
    mutate(req)
  }

  let errorMessage = '계좌 연결에 실패했습니다'
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: string } | null)?.detail
    if (error.status === 409) {
      errorMessage = detail ?? '이미 등록된 계좌번호입니다.'
    } else if (error.status === 429) {
      errorMessage = '잠시 후 다시 시도하세요. KIS API 인증 요청이 너무 잦습니다.'
    } else if (error.status === 422) {
      errorMessage = broker === 'TOSS'
        ? 'Toss 자격증명 인증에 실패했습니다. Client ID와 Client Secret을 확인하세요.'
        : 'App Key, App Secret 또는 계좌번호를 다시 확인하세요.'
    } else if (detail) {
      errorMessage = detail
    }
  }

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
          <span className="text-sm text-muted-foreground">증권사</span>
          <span className="text-sm font-semibold">{labelOf('brokers', broker)}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">별칭</span>
          <span className="text-sm font-semibold">{data.nickname}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">계좌번호</span>
          <span className="text-sm font-semibold font-mono">{data.accountNo}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">API Key</span>
          <span className="text-sm font-semibold">
            {data.apiKey ? `${data.apiKey.slice(0, 6)}...` : '-'}
          </span>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-neg">{errorMessage}</p>
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
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              연결 중...
            </>
          ) : '계좌 연결'}
        </button>
      </div>
    </div>
  )
}
