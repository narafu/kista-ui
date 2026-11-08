'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isCryptoMarket, marketCurrency, type TradingMarket } from '@shared/lib/api-schema'
import { currencyUnit } from '@shared/lib/format'
import { useSubviewHistory } from '@shared/lib/subviewHistory'
import { FormActions } from '@shared/ui/FormActions'
import { invalidateLedgerTotals } from '@entities/account'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import type { OrderAmountRule } from '@entities/meta'
import { useCreateStrategyMutation, useReconfigureDcaMutation, useStrategySeedPreviewQuery } from '@entities/strategy'
import type { DcaDirection, Strategy } from '@entities/strategy'
import { StrategyTickerSection } from './sections/StrategyTickerSection'
import { ScheduledStartSection } from './sections/ScheduledStartSection'
import { SeedInputSection } from './sections/SeedInputSection'
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
  isMock?: boolean // 모의계좌 — 가용 예수금이 없어 예수금 칸에 배지를 대신 둔다
  onSuccess?: () => void
  onCancel?: () => void
  // 목록 화면 위에만 둘 요소(등록의 유형 선택) — 편집 화면에서 유형을 바꾸면 폼이 언마운트돼 편집 이력 칸만 남는다
  header?: ReactNode
}

// 편집 화면에서 돌아올 때 포커스 대상 — 규칙 줄 인덱스, 또는 줄이 없으면(새 규칙 이전·삭제) 해당 방향 추가 버튼
type FocusTarget = number | DcaDirection

// DCA 등록·수정 — 규칙 목록 화면과 규칙 하나의 편집 화면을 같은 자리에서 전환한다(spec §3 결정 1·4).
// 편집 화면은 브라우저 이력 한 칸을 쌓아 뒤로가기가 목록으로 돌아가게 한다(결정 7)
export function DcaStrategyForm({ accountId, initial, availableTickers, defaultTicker, market, orderAmount, isMock = false, onSuccess, onCancel, header }: Props) {
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

  const queryClient = useQueryClient()
  // 훅 레벨 onSuccess로 넘겨 refetch가 끝날 때까지 mutation을 pending으로 둔다 — 호출부 onSuccess는 이미 success 상태라 등록 버튼이 다시 눌린다
  // DCA는 공용 전략 폼 효과(useStrategyFormEffects)를 거치지 않아 같은 캐시를 직접 무효화한다
  const invalidateDependents = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: tradeKeys.all }).catch(() => null),
      invalidateLedgerTotals(queryClient, accountId),
    ])
  }
  const done = () => {
    toast.success(initial ? '전략이 수정되었습니다' : '전략이 등록되었습니다')
    onSuccess?.()
  }
  const create = useCreateStrategyMutation(accountId, invalidateDependents)
  const reconfigure = useReconfigureDcaMutation(initial?.id ?? '', invalidateDependents)
  const pending = create.isPending || reconfigure.isPending
  const ticker = form.watch('ticker')
  const crypto = isCryptoMarket(market)
  // 가용 예수금(계좌 미배정 금액, 계좌 통화) — 다른 전략처럼 참고값·비율 채우기용이고 초과해도 막지 않는다. 등록만 조회
  // divisionCount는 DCA와 무관한 필수 쿼리 파라미터라 서버 기본값(20)을 보낸다
  const seedPreview = useStrategySeedPreviewQuery(accountId, { type: 'DCA', ticker, divisionCount: 20 }, { enabled: !initial && !!ticker })
  const availableCash = seedPreview.data?.availableCash == null ? null : Math.max(0, seedPreview.data.availableCash)
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
          tickerLabel={crypto ? (code) => `${code}/${marketCurrency(market)}` : undefined}
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
          // 매수는 이 원장 예수금 안에서만 나간다 — 등록 후 증감은 투자금 추가·인출로. 입력 칸이 음수·자릿수 초과를 막는다
          <SeedInputSection
            seedUsdInput={form.watch('initialDeposit')}
            setSeedUsdInput={(v) => form.setValue('initialDeposit', v)}
            availableCash={availableCash}
            minSeed={null}
            isBelowMinSeed={false}
            loading={pending}
            mockBadgeLabel={isMock ? '모의계좌' : undefined}
            currency={marketCurrency(market)}
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
