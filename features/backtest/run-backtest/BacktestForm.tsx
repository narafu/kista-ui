'use client'

import type { ReactNode } from 'react'
import { Zap, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@shared/ui/Spinner'
import { SelectionCard } from '@shared/ui/selection-card'
import { UnitInput } from '@shared/ui/UnitInput'
import type { BacktestType } from '@entities/backtest'
import type { UseBacktestFormResult } from './model/useBacktestForm'

interface Props {
  form: UseBacktestFormResult
}

const RECURRING_MODE_LABEL: Record<'DEPOSIT' | 'HOLD' | 'WITHDRAW', string> = {
  DEPOSIT: '+ 적립',
  HOLD: '거치',
  WITHDRAW: '- 인출',
}

const FIELD_LABEL_CLASS = 'block mb-2.5 text-sm font-bold text-muted-foreground'

// 전략 등록 폼(features/strategy/create-strategy)의 ChoiceButton과 동일한 크기·타이포 — feature 간 cross-import가
// 금지돼 있어 작은 프레젠테이션 래퍼를 그대로 복제한다
function ChoiceButton({
  children,
  selected,
  disabled,
  onClick,
}: {
  children: ReactNode
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <SelectionCard
      selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={selected ? 'h-11 px-3 text-center text-sm font-extrabold' : 'h-11 px-3 text-center text-sm font-extrabold text-muted-foreground'}
    >
      {children}
    </SelectionCard>
  )
}

export function BacktestForm({ form }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <div>
          <Label className="mb-2 block text-sm font-bold">매매 전략</Label>
          <div className="grid grid-cols-2 gap-2.5">
            {form.meta.strategyTypes.map((t) => {
              const selected = form.type === t.code
              const singleTicker = (t.availableTickers?.length ?? 0) <= 1
              return (
                <SelectionCard
                  key={t.code}
                  selected={selected}
                  onClick={() => form.setType(t.code as BacktestType)}
                  disabled={form.isLoading}
                  className="flex items-center gap-2 rounded-[var(--r-md)] px-[14px] py-4"
                >
                  <span className={selected ? 'size-4 shrink-0 text-[var(--selection-fg)]' : 'size-4 shrink-0 text-muted-foreground'}>
                    {singleTicker ? <Activity size={16} /> : <Zap size={16} />}
                  </span>
                  <span className="text-sm font-[800]">{t.code}</span>
                </SelectionCard>
              )
            })}
          </div>
        </div>

        <div>
          <Label className="mb-2 block text-sm font-bold">종목</Label>
          <Select
            items={form.availableTickers.map((code) => ({ value: code, label: code }))}
            value={form.ticker}
            onValueChange={(value) => { if (value) form.setTicker(value) }}
          >
            <SelectTrigger aria-label="종목" className="w-full" disabled={form.isLoading || form.availableTickers.length <= 1}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {form.availableTickers.map((code) => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-2 block text-sm font-bold">시작일</Label>
            <Input type="date" value={form.from} onChange={(e) => form.setFrom(e.target.value)} disabled={form.isLoading} />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-bold">종료일</Label>
            <Input type="date" value={form.to} onChange={(e) => form.setTo(e.target.value)} disabled={form.isLoading} />
          </div>
        </div>

        <div>
          <Label htmlFor="seed" className="mb-2 block text-sm font-bold">예수금</Label>
          <Input
            id="seed"
            type="number"
            min={0}
            value={form.seed ?? ''}
            onChange={(e) => form.setSeed(e.target.value === '' ? null : Number(e.target.value))}
            disabled={form.isLoading}
            placeholder="USD"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="block mb-1 text-xs font-semibold text-muted-foreground">평단가</span>
            <UnitInput
              value={form.avgPrice}
              onChange={(v) => form.setAvgPrice(v)}
              unit="USD"
              disabled={form.isLoading}
              unitClassName="ml-1.5"
              maxDecimals={2}
            />
          </label>
          <label>
            <span className="block mb-1 text-xs font-semibold text-muted-foreground">수량</span>
            <UnitInput
              value={form.quantity}
              onChange={(v) => form.setQuantity(v !== null ? Math.round(v) : null)}
              unit="주"
              disabled={form.isLoading}
              unitClassName="ml-1.5"
            />
          </label>
        </div>

        {form.type === 'INFINITE' && form.divisionCountOptions.length > 0 && (
          <div>
            <Label className="mb-2 block text-sm font-bold">분할 수</Label>
            <div className="flex gap-2">
              {form.divisionCountOptions.map((n) => (
                <SelectionCard
                  key={n}
                  selected={form.divisionCount === n}
                  onClick={() => form.setDivisionCount(n)}
                  disabled={form.isLoading}
                  className="flex-1 py-2.5 text-center text-sm font-bold"
                >
                  {n}분할
                </SelectionCard>
              ))}
            </div>
          </div>
        )}

        {form.type === 'VR' && (
          <div className="py-[18px] border-t border-border">
            <Label className="mb-2 block text-sm font-bold">밸류 리밸런싱 설정</Label>

            <div className="grid grid-cols-1 gap-y-5">
              <div>
                <span className={FIELD_LABEL_CLASS}>적립금(+)/인출금(-)</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['DEPOSIT', 'HOLD', 'WITHDRAW'] as const).map((mode) => (
                    <ChoiceButton
                      key={mode}
                      selected={form.vrRecurringMode === mode}
                      disabled={form.isLoading}
                      onClick={() => form.setVrRecurringMode(mode)}
                    >
                      {RECURRING_MODE_LABEL[mode]}
                    </ChoiceButton>
                  ))}
                </div>
                <UnitInput
                  value={form.vrRecurringAmountAbs}
                  onChange={(v) => form.setVrRecurringAmountAbs(v !== null ? Math.round(v) : null)}
                  unit="USD"
                  disabled={form.isLoading || form.vrRecurringMode === 'HOLD'}
                  ariaLabel="적립금(+)/인출금(-)"
                  placeholder="0"
                  wrapperClassName="mt-2.5"
                />
              </div>
            </div>

            <details className="mt-4 group">
              <summary className="cursor-pointer select-none text-sm font-bold text-muted-foreground list-none flex items-center gap-1.5">
                <span className="transition-transform group-open:rotate-90">▸</span>
                상세 설정
              </summary>
              <div className="grid grid-cols-1 gap-y-5 mt-4">
                <label>
                  <span className={FIELD_LABEL_CLASS}>초기 V</span>
                  <UnitInput
                    value={form.vrInitialValue}
                    onChange={(v) => form.setVrInitialValue(v)}
                    unit="USD"
                    disabled={form.isLoading}
                    maxDecimals={2}
                  />
                </label>
                <label>
                  <span className={FIELD_LABEL_CLASS}>밴드 폭</span>
                  <UnitInput
                    value={form.vrBandWidth}
                    onChange={(v) => form.setVrBandWidth(v)}
                    unit="%"
                    disabled={form.isLoading}
                    maxDecimals={2}
                  />
                </label>
                <label>
                  <span className={FIELD_LABEL_CLASS}>리밸런싱 주기</span>
                  <UnitInput
                    value={form.vrIntervalWeeks}
                    onChange={(v) => form.setVrIntervalWeeks(v !== null ? Math.round(v) : null)}
                    unit="주"
                    disabled={form.isLoading}
                  />
                </label>
              </div>
            </details>
          </div>
        )}

        {form.submitDisabledReason && (
          <p className="text-sm font-semibold text-[var(--warn)]">{form.submitDisabledReason}</p>
        )}
        {form.errorMessage && (
          <p className="text-sm font-semibold text-[var(--status-error)]">{form.errorMessage}</p>
        )}

        <div className="flex gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={form.reset}
            disabled={form.isLoading}
            className="flex-1 h-11 text-sm font-bold"
          >
            초기화
          </Button>
          <Button
            type="button"
            onClick={form.run}
            disabled={form.isLoading || !!form.submitDisabledReason}
            className="flex-[1.5] h-11 gap-2 text-sm font-[800]"
          >
            {form.isLoading ? (
              <>
                <Spinner size={14} />
                실행 중...
              </>
            ) : '실행'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
