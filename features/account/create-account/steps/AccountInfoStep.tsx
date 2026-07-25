'use client'

import { useState } from 'react'
import type { BrokerCode } from '@entities/account'
import type { StepData } from '../CreateAccountStepper'

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

export function AccountInfoStep({ data, onNext, onBack }: Props) {
  // eslint-disable-next-line react-doctor/no-derived-useState
  const [nickname, setNickname] = useState(data.nickname)
  // eslint-disable-next-line react-doctor/no-derived-useState
  const [accountNo, setAccountNo] = useState(data.accountNo)
  const [touchedNickname, setTouchedNickname] = useState(false)
  const [touchedAccountNo, setTouchedAccountNo] = useState(false)

  const broker = (data.broker || 'KIS') as BrokerCode
  const isMock = broker === 'MOCK'

  const nicknameValid = nickname.trim().length >= 1

  if (isMock) {
    const showNicknameError = touchedNickname && !nicknameValid
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-bold mb-1">계좌 별칭</h2>
          <p className="text-sm text-muted-foreground">모의계좌의 별칭을 입력하세요.</p>
        </div>
        <p className="rounded-[var(--r-sm)] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          모의계좌 — 실제 자금 없이 매매를 체험합니다.
        </p>
        <div>
          <label htmlFor="account-nickname" className="text-sm font-semibold mb-1.5 block">
            계좌 별칭 <span className="text-destructive">*</span>
          </label>
          <input
            id="account-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onBlur={() => setTouchedNickname(true)}
            placeholder="예: 모의 계좌"
            aria-describedby={showNicknameError ? 'nickname-error' : undefined}
            aria-invalid={showNicknameError}
            className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {showNicknameError && (
            <p id="nickname-error" className="text-sm text-destructive mt-1">별칭을 입력해주세요.</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 h-11 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors"
          >
            이전
          </button>
          <button
            type="button"
            disabled={!nicknameValid}
            onClick={() => onNext({ nickname: nickname.trim(), accountNo: '' })}
            className="flex-1 h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      </div>
    )
  }

  // isMock 분기에서 이미 return했으므로 여기서는 KIS/TOSS만 도달
  const config = ACCOUNT_CONFIG[broker as Exclude<BrokerCode, 'MOCK'>]
  const accountNoValid = config.pattern.test(accountNo)
  const valid = nicknameValid && accountNoValid

  const showNicknameError = touchedNickname && !nicknameValid
  const showAccountNoError = touchedAccountNo && accountNo.length > 0 && !accountNoValid

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">계좌 정보</h2>
        <p className="text-sm text-muted-foreground">
          계좌 별칭과 계좌번호를 입력하세요.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="account-nickname" className="text-sm font-semibold mb-1.5 block">
            계좌 별칭 <span className="text-destructive">*</span>
          </label>
          <input
            id="account-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onBlur={() => setTouchedNickname(true)}
            placeholder="예: 메인 계좌"
            aria-describedby={showNicknameError ? 'nickname-error' : undefined}
            aria-invalid={showNicknameError}
            className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {showNicknameError && (
            <p id="nickname-error" className="text-sm text-destructive mt-1">별칭을 입력해주세요.</p>
          )}
        </div>
        <div>
          <label htmlFor="account-no" className="text-sm font-semibold mb-1.5 block">
            {config.label} <span className="text-destructive">*</span>
          </label>
          <input
            id="account-no"
            value={accountNo}
            onChange={(e) => setAccountNo(config.format(e.target.value))}
            onBlur={() => setTouchedAccountNo(true)}
            placeholder={config.placeholder}
            maxLength={config.maxLen}
            aria-describedby={showAccountNoError ? 'accountno-error' : 'accountno-hint'}
            aria-invalid={showAccountNoError}
            className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {showAccountNoError ? (
            <p id="accountno-error" className="text-sm text-destructive mt-1">
              올바른 계좌번호 형식으로 입력해주세요. (예: {config.placeholder})
            </p>
          ) : (
            <p id="accountno-hint" className="text-sm text-muted-foreground mt-1">{config.hint}</p>
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 h-11 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors"
        >
          이전
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onNext({ nickname: nickname.trim(), accountNo })}
          className="flex-1 h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          다음
        </button>
      </div>
    </div>
  )
}
