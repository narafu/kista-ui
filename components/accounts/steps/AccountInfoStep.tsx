"use client";

import {useState} from "react";
import type {StepData} from "../NewAccountStepper";

interface Props {
  data: StepData;
  onNext: (payload: Partial<StepData>) => void;
  onBack: () => void;
}

export function AccountInfoStep({data, onNext, onBack}: Props) {
  const [nickname, setNickname] = useState(data.nickname);
  const [accountNo, setAccountNo] = useState(data.accountNo);

  const valid = nickname.trim().length >= 1 && /^\d{8}$/.test(accountNo);

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
            계좌 별칭
          </label>
          <input
            id="account-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="예: 메인 계좌"
            className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
        <div>
          <label htmlFor="account-no" className="text-sm font-semibold mb-1.5 block">
            계좌번호 (8자리)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="account-no"
              value={accountNo}
              onChange={(e) =>
                setAccountNo(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              placeholder="12345678"
              maxLength={8}
              className="flex-1 px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <span className="text-muted-foreground text-sm font-mono">
              - 01
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            상품 코드(01)는 자동 설정됩니다
          </p>
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
          onClick={() =>
            onNext({nickname: nickname.trim(), accountNo})
          }
          className="flex-1 h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          다음
        </button>
      </div>
    </div>
  );
}
