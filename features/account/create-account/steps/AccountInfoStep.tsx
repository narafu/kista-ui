'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { BrokerCode } from '@entities/account'
import { isCryptoBroker, isMockBroker } from '@shared/lib/api-schema'
import type { StepData } from '../CreateAccountStepper'
import { NicknameField, AccountNoField } from './AccountInfoFields'

interface Props {
  data: StepData
  onNext: (payload: Partial<StepData>) => void
  onBack: () => void
}

// KIS: 74420614-01 (XXXXXXXX-XX), Toss: 131-01-001931 (XXX-XX-XXXXXX)
const ACCOUNT_CONFIG = {
  KIS: {
    label: '계좌번호',
    maxLen: 11,
    placeholder: '74420614-01',
    pattern: /^\d{8}-\d{2}$/,
    hint: '계좌번호-계좌구분코드 형식 (예: 74420614-01)',
    // 숫자 10자리 입력 시 8번째 뒤에 하이픈 자동 삽입
    format: (raw: string) => {
      const digits = raw.replace(/\D/g, '').slice(0, 10)
      if (digits.length <= 8) return digits
      return `${digits.slice(0, 8)}-${digits.slice(8)}`
    },
  },
  TOSS: {
    label: '계좌번호',
    maxLen: 13,
    placeholder: '131-01-001931',
    pattern: /^\d{3}-\d{2}-\d{6}$/,
    hint: '토스증권 계좌번호 (예: 131-01-001931)',
    // 숫자 11자리 입력 시 3번째·5번째 뒤에 하이픈 자동 삽입
    format: (raw: string) => {
      const digits = raw.replace(/\D/g, '').slice(0, 11)
      if (digits.length <= 3) return digits
      if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
    },
  },
} as const

type AccountNoConfig = (typeof ACCOUNT_CONFIG)[keyof typeof ACCOUNT_CONFIG]

export function AccountInfoStep({ data, onNext, onBack }: Props) {
  // eslint-disable-next-line react-doctor/no-derived-useState
  const [nickname, setNickname] = useState(data.nickname)
  // eslint-disable-next-line react-doctor/no-derived-useState
  const [accountNo, setAccountNo] = useState(data.accountNo)
  const [touchedNickname, setTouchedNickname] = useState(false)
  const [touchedAccountNo, setTouchedAccountNo] = useState(false)

  const broker = (data.broker || 'KIS') as BrokerCode
  const isMock = isMockBroker(broker)
  // 계좌번호 설정이 없는 broker(MOCK, UPBIT, MERITZ, BINANCE)는 별칭만 받는다
  const config: AccountNoConfig | null = (ACCOUNT_CONFIG as Partial<Record<BrokerCode, AccountNoConfig>>)[broker] ?? null

  const nicknameValid = nickname.trim().length >= 1
  const accountNoValid = !config || config.pattern.test(accountNo)
  const valid = nicknameValid && accountNoValid

  const showNicknameError = touchedNickname && !nicknameValid
  const showAccountNoError = !!config && touchedAccountNo && accountNo.length > 0 && !accountNoValid

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">{config ? '계좌 정보' : '계좌 별칭'}</h2>
        <p className="text-sm text-muted-foreground">
          {config ? '계좌 별칭과 계좌번호를 입력하세요.' : isMock ? '모의계좌의 별칭을 입력하세요.' : '계좌 별칭을 입력하세요.'}
        </p>
      </div>
      {isMock && (
        <p className="whitespace-pre-line rounded-[var(--r-sm)] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          {'모의계좌\n실제 자금 없이 매매를 체험합니다.'}
        </p>
      )}
      <div className="flex flex-col gap-4">
        <NicknameField
          value={nickname}
          placeholder={isMock ? '예: 모의 계좌' : isCryptoBroker(broker) ? '예: 크립토 계좌' : '예: 메인 계좌'}
          showError={showNicknameError}
          onChange={setNickname}
          onBlur={() => setTouchedNickname(true)}
        />
        {config && (
          <AccountNoField
            config={config}
            value={accountNo}
            showError={showAccountNoError}
            onChange={setAccountNo}
            onBlur={() => setTouchedAccountNo(true)}
          />
        )}
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" size="form" className="flex-1" onClick={onBack}>
          이전
        </Button>
        <Button
          type="button"
          size="form"
          className="flex-1"
          disabled={!valid}
          onClick={() => onNext({ nickname: nickname.trim(), accountNo: config ? accountNo : '' })}
        >
          다음
        </Button>
      </div>
    </div>
  )
}
