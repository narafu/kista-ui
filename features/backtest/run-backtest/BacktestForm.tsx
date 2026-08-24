'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@shared/ui/Spinner'
import { SelectionCard } from '@shared/ui/selection-card'
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

export function BacktestForm({ form }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <div>
          <Label className="mb-2 block text-sm font-bold">매매 전략</Label>
          <div className="grid grid-cols-3 gap-2.5">
            {form.meta.strategyTypes.map((t) => (
              <SelectionCard
                key={t.code}
                selected={form.type === t.code}
                showIndicator
                onClick={() => form.setType(t.code as BacktestType)}
                disabled={form.isLoading}
                className="px-3 py-3 text-center text-sm font-[800]"
              >
                {t.code}
              </SelectionCard>
            ))}
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
          <Label className="mb-2 block text-sm font-bold">시드 (USD)</Label>
          <Input
            type="number"
            min={0}
            value={form.seed ?? ''}
            onChange={(e) => form.setSeed(e.target.value === '' ? null : Number(e.target.value))}
            disabled={form.isLoading}
            placeholder="10000"
          />
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
          <div className="flex flex-col gap-4 rounded-[var(--r-sm)] border border-border p-4">
            <Label className="text-sm font-bold">밸류 리밸런싱 설정</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block text-xs text-muted-foreground">밴드 폭(%)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.vrBandWidth ?? ''}
                  onChange={(e) => form.setVrBandWidth(e.target.value === '' ? null : Number(e.target.value))}
                  disabled={form.isLoading}
                  placeholder="15"
                />
              </div>
              <div>
                <Label className="mb-2 block text-xs text-muted-foreground">리밸런싱 주기(주)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.vrIntervalWeeks ?? ''}
                  onChange={(e) => form.setVrIntervalWeeks(e.target.value === '' ? null : Number(e.target.value))}
                  disabled={form.isLoading}
                  placeholder="4"
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-xs text-muted-foreground">초기 V값(USD)</Label>
              <Input
                type="number"
                min={0}
                value={form.vrInitialValue ?? ''}
                onChange={(e) => form.setVrInitialValue(e.target.value === '' ? null : Number(e.target.value))}
                disabled={form.isLoading}
                placeholder="10000"
              />
            </div>
            <div>
              <Label className="mb-2 block text-xs text-muted-foreground">적립(+)/거치/인출(-)</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['DEPOSIT', 'HOLD', 'WITHDRAW'] as const).map((mode) => (
                  <SelectionCard
                    key={mode}
                    selected={form.vrRecurringMode === mode}
                    onClick={() => form.setVrRecurringMode(mode)}
                    disabled={form.isLoading}
                    className="py-2.5 text-center text-sm font-bold"
                  >
                    {RECURRING_MODE_LABEL[mode]}
                  </SelectionCard>
                ))}
              </div>
              {form.vrRecurringMode !== 'HOLD' && (
                <Input
                  type="number"
                  min={0}
                  className="mt-2"
                  value={form.vrRecurringAmountAbs ?? ''}
                  onChange={(e) => form.setVrRecurringAmountAbs(e.target.value === '' ? null : Number(e.target.value))}
                  disabled={form.isLoading}
                  placeholder="0"
                />
              )}
            </div>
          </div>
        )}

        {form.submitDisabledReason && (
          <p className="text-sm font-semibold text-[var(--warn)]">{form.submitDisabledReason}</p>
        )}
        {form.errorMessage && (
          <p className="text-sm font-semibold text-[var(--status-error)]">{form.errorMessage}</p>
        )}

        <Button
          type="button"
          onClick={form.run}
          disabled={form.isLoading || !!form.submitDisabledReason}
          className="h-11 gap-2 text-sm font-[800]"
        >
          {form.isLoading ? (
            <>
              <Spinner size={14} />
              실행 중...
            </>
          ) : '실행'}
        </Button>
      </CardContent>
    </Card>
  )
}
