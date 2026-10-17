'use client'

import { useRouter } from 'next/navigation'

import { BROKER_CREDENTIAL, brokerErrorMessage, useCreateAccountMutation } from '@entities/account'
import { useMeta } from '@entities/meta'
import { apiMsg } from '@shared/lib/api-client'
import { Button } from '@/components/ui/button'
import { Spinner } from '@shared/ui/Spinner'
import { isCryptoBroker, isMockBroker } from '@shared/lib/api-schema'
import type { BrokerCode, AccountRequest, CredentialBroker } from '@entities/account'
import type { StepData } from '../CreateAccountStepper'

interface Props {
  data: StepData
  onBack: () => void
}

export function ConfirmStep({ data, onBack }: Props) {
  const { mutate, isPending, isError, error } = useCreateAccountMutation()
  const { labelOf } = useMeta()
  const router = useRouter()

  const broker = (data.broker || 'KIS') as BrokerCode
  const isMock = isMockBroker(broker)
  const hasAccountNo = !isMock && !isCryptoBroker(broker)

  function handleSubmit() {
    const req: AccountRequest = isMock
      ? { nickname: data.nickname, broker }
      : {
        nickname: data.nickname,
        appKey: data.apiKey,
        secretKey: data.apiSecret,
        ...(hasAccountNo ? { accountNo: data.accountNo } : {}),
        broker,
      }
    mutate(req, {
      onSuccess: (saved) => {
        router.push(`/accounts/${saved.id}`)
      },
    })
  }

  // 자격증명 오류만 증권사별 입력 항목을 짚어주고, 나머지(중복 계좌·호출 한도 등)는 서버 detail을 그대로 노출한다
  const errorMessage = isMock
    ? apiMsg(error, '계좌 연결에 실패했습니다')
    : brokerErrorMessage(error, BROKER_CREDENTIAL[broker as CredentialBroker].invalidMessage, '계좌 연결에 실패했습니다')

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
        {!isMock && (
          <>
            {hasAccountNo && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">계좌번호</span>
                <span className="text-sm font-semibold font-mono">{data.accountNo}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">API Key</span>
              <span className="text-sm font-semibold">
                {data.apiKey ? `${data.apiKey.slice(0, 6)}...` : '-'}
              </span>
            </div>
          </>
        )}
      </div>

      {isError && (
        <p className="text-sm text-[var(--status-error)]">{errorMessage}</p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" size="form" className="flex-1" onClick={onBack} disabled={isPending}>
          이전
        </Button>
        <Button type="button" size="form" className="flex-1" onClick={handleSubmit} disabled={isPending}>
          {isPending ? (
            <>
              <Spinner size={16} />
              연결 중...
            </>
          ) : '계좌 연결'}
        </Button>
      </div>
    </div>
  )
}
