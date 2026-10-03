'use client'

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
import { OptionChoiceGroup, RecurringModeField, VrRampFields, VR_FIELD_LABEL_CLASS } from '@entities/strategy'
import type { UseBacktestFormResult } from './model/useBacktestForm'

interface Props {
  form: UseBacktestFormResult
}

const FIELD_LABEL_CLASS = 'mb-2 block text-sm font-bold'

export function BacktestForm({ form }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <div>
          <Label className={FIELD_LABEL_CLASS}>매매 전략</Label>
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
          <Label className={FIELD_LABEL_CLASS}>종목</Label>
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
            <Label htmlFor="backtestFrom" className={FIELD_LABEL_CLASS}>시작일</Label>
            <Input id="backtestFrom" type="date" value={form.from} onChange={(e) => form.setFrom(e.target.value)} disabled={form.isLoading} />
          </div>
          <div>
            <Label htmlFor="backtestTo" className={FIELD_LABEL_CLASS}>종료일</Label>
            <Input id="backtestTo" type="date" value={form.to} onChange={(e) => form.setTo(e.target.value)} disabled={form.isLoading} />
          </div>
        </div>

        <label className="block">
          <span className={FIELD_LABEL_CLASS}>예수금</span>
          <UnitInput
            value={form.seed}
            onChange={form.setSeed}
            unit="USD"
            disabled={form.isLoading}
            unitClassName="ml-1.5"
            maxDecimals={2}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={FIELD_LABEL_CLASS}>평단가</span>
            <UnitInput
              value={form.avgPrice}
              onChange={form.setAvgPrice}
              unit="USD"
              disabled={form.isLoading}
              unitClassName="ml-1.5"
              maxDecimals={2}
            />
          </label>
          <label>
            <span className={FIELD_LABEL_CLASS}>수량</span>
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
            <Label className={FIELD_LABEL_CLASS}>분할 수</Label>
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
            <Label className={FIELD_LABEL_CLASS}>밸류 리밸런싱 설정</Label>

            <div className="grid grid-cols-1 gap-y-5">
              <RecurringModeField
                mode={form.vrRecurringMode}
                setMode={form.setVrRecurringMode}
                amount={form.vrRecurringAmountAbs}
                setAmount={(v) => form.setVrRecurringAmountAbs(v !== null ? Math.round(v) : null)}
                disabled={form.isLoading}
                setting={form.vrSettings?.recurringMode}
              />
            </div>

            <details className="mt-4 group">
              <summary className="cursor-pointer select-none text-sm font-bold text-muted-foreground list-none flex items-center gap-1.5">
                <span className="transition-transform group-open:rotate-90">▸</span>
                고급 설정
              </summary>
              <div className="grid grid-cols-1 gap-y-5 mt-4">
                <label>
                  <span className={VR_FIELD_LABEL_CLASS}>초기 V</span>
                  <UnitInput
                    value={form.vrInitialValue}
                    onChange={form.setVrInitialValue}
                    unit="USD"
                    disabled={form.isLoading}
                    maxDecimals={2}
                  />
                </label>
                <OptionChoiceGroup
                  label="밴드 폭"
                  suffix="%"
                  value={form.vrBandWidth}
                  setting={form.vrSettings?.bandWidth}
                  disabled={form.isLoading}
                  onSelect={form.setVrBandWidth}
                />
                <OptionChoiceGroup
                  label="리밸런싱 주기"
                  suffix="주"
                  value={form.vrIntervalWeeks}
                  setting={form.vrSettings?.intervalWeeks}
                  disabled={form.isLoading}
                  onSelect={form.setVrIntervalWeeks}
                />
              </div>
              <VrRampFields
                fields={form.vrRamp}
                setField={form.setVrRampField}
                disabled={form.isLoading}
                rampDefaults={form.rampDefaults}
              />
            </details>
          </div>
        )}

        {form.submitDisabledReason && (
          // 아직 입력 전인 안내도 포함하므로 경고색 대신 보조 텍스트로 표시
          <p className="text-sm text-muted-foreground">{form.submitDisabledReason}</p>
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
