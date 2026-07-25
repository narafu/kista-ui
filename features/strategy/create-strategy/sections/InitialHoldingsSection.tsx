'use client'

import { UnitInput } from './UnitInput'

interface Props {
  avgPrice: number | null
  quantity: number | null
  setField: (field: 'avgPrice' | 'quantity', value: number | null) => void
  loading: boolean
  // VR은 V값(마지막 평가금 = 전일종가 × 수량, 서버가 등록 시점 시장가로 계산)의 최초 입력이라는 프레이밍,
  // INFINITE·PRIVACY는 선택적 옵션이라는 프레이밍만 다르다. 평단가는 두 전략 공통으로 보유원가 기록용이며 V값 계산에는 쓰이지 않는다
  isVr: boolean
}

// 중간부터 시작 — 이미 종목을 보유 중인 사용자가 기존 평단가·수량을 입력해 그 지점부터 전략을 시작하는 공통 입력(등록 전용)
export function InitialHoldingsSection({ avgPrice, quantity, setField, loading, isVr }: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      {!isVr && (
        <p className="text-sm text-muted-foreground mb-3">
          이미 보유 중인 종목이 있다면 입력하세요. 비워두면 빈 포지션에서 시작합니다.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="block mb-1 text-xs font-semibold text-muted-foreground">평단가</span>
          <UnitInput
            value={avgPrice}
            onChange={(value) => setField('avgPrice', value)}
            unit="USD"
            disabled={loading}
            unitClassName="ml-1.5"
          />
        </label>
        <label>
          <span className="block mb-1 text-xs font-semibold text-muted-foreground">수량</span>
          <UnitInput
            value={quantity}
            onChange={(value) => setField('quantity', value)}
            unit="주"
            disabled={loading}
            unitClassName="ml-1.5"
          />
        </label>
      </div>
    </div>
  )
}
