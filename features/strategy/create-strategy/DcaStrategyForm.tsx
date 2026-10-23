'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { isCryptoMarket, marketCurrency, type TradingMarket } from '@shared/lib/api-schema'
import { currencyUnit } from '@shared/lib/format'
import { useSubviewHistory } from '@shared/lib/subviewHistory'
import { FormActions } from '@shared/ui/FormActions'
import type { OrderAmountRule } from '@entities/meta'
import { useCreateStrategyMutation, useReconfigureDcaMutation } from '@entities/strategy'
import type { DcaDirection, Strategy } from '@entities/strategy'
import { StrategyTickerSection } from './sections/StrategyTickerSection'
import { ScheduledStartSection } from './sections/ScheduledStartSection'
import { InitialHoldingsSection } from './sections/InitialHoldingsSection'
import { DcaRuleList } from './sections/DcaRuleList'
import { DcaRuleEditor } from './sections/DcaRuleEditor'
import { buildDcaFormDefaults, buildDcaRuleDefaults, dcaFormSchema, type DcaFormValues, type DcaRuleFormValues } from './model/dcaFormSchema'
import { buildDcaConfig, buildDcaCreatePayload } from './model/buildDcaPayload'

interface Props {
  accountId: string
  initial?: Strategy
  availableTickers: string[] // 런타임 설정 허용 티커 (StrategyForm이 계산해 전달)
  defaultTicker: string // 런타임 설정 기본 티커 (deriveRuntimeFields가 허용 목록 기준으로 확정)
  market: TradingMarket // 계좌 broker에서 정해지는 시장 — 금액 단위·주문 방식·실행 시각 규칙을 가른다
  orderAmount: OrderAmountRule // 계좌 broker의 회차 금액 제약 — 규칙 금액 검증 기준
  onSuccess?: () => void
  onCancel?: () => void
  // 목록 화면 위에만 둘 요소(등록의 유형 선택) — 편집 화면에서 유형을 바꾸면 폼이 언마운트돼 편집 이력 칸만 남는다
  header?: ReactNode
}

// 편집 화면에서 돌아올 때 포커스 대상 — 규칙 줄 인덱스, 또는 줄이 없으면(새 규칙 이전·삭제) 해당 방향 추가 버튼
type FocusTarget = number | DcaDirection

// DCA 등록·수정 — 규칙 목록 화면과 규칙 하나의 편집 화면을 같은 자리에서 전환한다(spec §3 결정 1·4).
// 편집 화면은 브라우저 이력 한 칸을 쌓아 뒤로가기가 목록으로 돌아가게 한다(결정 7)
export function DcaStrategyForm({ accountId, initial, availableTickers, defaultTicker, market, orderAmount, onSuccess, onCancel, header }: Props) {
  const form = useForm<DcaFormValues>({
    resolver: zodResolver(dcaFormSchema),
    defaultValues: buildDcaFormDefaults(initial, defaultTicker, market, orderAmount),
  })
  const { fields, append, update, remove } = useFieldArray({ control: form.control, name: 'rules' })
  const [editing, setEditing] = useState<{ index: number | null; direction: DcaDirection } | null>(null)
  const rowRefs = useRef(new Map<number, HTMLButtonElement>())
  const listRef = useRef<HTMLDivElement>(null)
  const focusTarget = useRef<FocusTarget | null>(null)
  // history.back()의 popstate는 비동기라 그 사이 완료·삭제가 두 번 눌리지 않게 막는다
  const leaving = useRef(false)
  const { leave } = useSubviewHistory(editing !== null, () => {
    leaving.current = false
    setEditing(null)
  })

  useEffect(() => {
    if (editing || focusTarget.current == null) return
    const target = focusTarget.current
    focusTarget.current = null
    if (typeof target === 'number') rowRefs.current.get(target)?.focus()
    else listRef.current?.querySelector<HTMLButtonElement>(`[data-add-direction="${target}"]`)?.focus()
  }, [editing])

  const done = () => {
    toast.success(initial ? '전략이 수정되었습니다' : '전략이 등록되었습니다')
    onSuccess?.()
  }
  const create = useCreateStrategyMutation(accountId)
  const reconfigure = useReconfigureDcaMutation(initial?.id ?? '')
  const pending = create.isPending || reconfigure.isPending
  const ticker = form.watch('ticker')
  const crypto = isCryptoMarket(market)
  const needsHoldingsHint = form.watch('rules').some((r) => r.direction === 'SELL' || r.conditions.some((c) => c.indicator === 'AVG_PRICE'))
  const rulesError = form.formState.errors.rules
  const rulesErrorMessage = rulesError?.root?.message ?? rulesError?.message ?? (rulesError ? '규칙 입력값을 확인하세요.' : undefined)

  const submit = form.handleSubmit((values) => {
    if (initial) reconfigure.mutate(buildDcaConfig(values), { onSuccess: done })
    else create.mutate(buildDcaCreatePayload(values), { onSuccess: done })
  })

  const openEditor = (index: number | null, direction: DcaDirection) => {
    focusTarget.current = index ?? direction
    leaving.current = false
    setEditing({ index, direction })
  }
  const exitEditor = (apply: () => void) => {
    if (leaving.current) return
    leaving.current = true
    apply()
    leave()
  }

  if (editing) {
    const { index, direction } = editing
    // 규칙의 market·orderAmount는 항상 부모 값 — 어긋나면 크립토 executionHour가 payload에서 빠진다
    const rule: DcaRuleFormValues = { ...(index == null ? buildDcaRuleDefaults(direction, market, orderAmount) : form.getValues(`rules.${index}`)), market, orderAmount }
    return (
      <DcaRuleEditor
        market={market}
        initial={rule}
        isNew={index == null}
        onCancel={() => exitEditor(() => {})}
        onDone={(v) => exitEditor(() => {
          if (index == null) {
            focusTarget.current = fields.length
            append(v)
          } else {
            update(index, v)
          }
        })}
        onDelete={index == null ? undefined : () => exitEditor(() => {
          const left = fields.length - 1
          focusTarget.current = left === 0 ? direction : Math.min(index, left - 1)
          remove(index)
        })}
      />
    )
  }

  return (
    <>
      {header}
      <form onSubmit={submit}>
        <StrategyTickerSection
          initial={initial}
          ticker={ticker}
          availableTickers={availableTickers}
          prices={null}
          basePrice={null}
          loading={pending}
          onTickerChange={(code) => form.setValue('ticker', code)}
          customizable={availableTickers.length > 1}
        />
        {!initial && (
          <ScheduledStartSection
            value={form.watch('scheduledStartDate')}
            onChange={(d) => form.setValue('scheduledStartDate', d, { shouldValidate: form.formState.isSubmitted })}
            loading={pending}
            error={form.formState.errors.scheduledStartDate?.message}
          />
        )}
        {!initial && (
          <InitialHoldingsSection
            avgPrice={form.watch('initialAvgPrice')}
            quantity={form.watch('initialHoldings')}
            setField={(field, v) => {
              form.setValue(field === 'avgPrice' ? 'initialAvgPrice' : 'initialHoldings', v)
              // 두 값은 서로를 검증한다 — 한쪽만 다시 검증하면 반대쪽 오류가 남는다
              if (form.formState.isSubmitted) void form.trigger(['initialHoldings', 'initialAvgPrice'])
            }}
            loading={pending}
            priceUnit={currencyUnit(marketCurrency(market))}
            priceMaxDecimals={crypto ? 8 : 2}
            quantityUnit={crypto ? ticker : '주'}
            quantityMaxDecimals={crypto ? 8 : undefined}
            caption={needsHoldingsHint && form.watch('initialHoldings') == null ? '보유 0에서 시작합니다. 이미 보유 중이면 입력하세요.' : undefined}
            errors={{ avgPrice: form.formState.errors.initialAvgPrice?.message, quantity: form.formState.errors.initialHoldings?.message }}
          />
        )}
        <div ref={listRef}>
          <DcaRuleList
            rules={fields}
            market={market}
            onSelect={(i) => openEditor(i, fields[i].direction)}
            onAdd={(direction) => openEditor(null, direction)}
            registerRowRef={(i, el) => {
              if (el) rowRefs.current.set(i, el)
              else rowRefs.current.delete(i)
            }}
            error={rulesErrorMessage}
          />
        </div>
        <FormActions onCancel={onCancel} isPending={pending} canSubmit={!pending} label={initial ? '수정' : '등록'} className="py-6" />
      </form>
    </>
  )
}
