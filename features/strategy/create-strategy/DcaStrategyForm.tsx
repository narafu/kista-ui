'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSubviewHistory } from '@shared/lib/subviewHistory'
import { FormActions } from '@shared/ui/FormActions'
import { apiFieldMsg } from '@shared/lib/api-client'
import { invalidateLedgerTotals, type PriceMap } from '@entities/account'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import { StrategyValidationWarnings, useCreateStrategyMutation, useDcaAvailableCashQuery, useReconfigureDcaMutation, useStrategyValidationQuery } from '@entities/strategy'
import type { DcaDirection, Strategy, StrategyRequest } from '@entities/strategy'
import { StrategyTickerSection } from './sections/StrategyTickerSection'
import { ScheduledStartSection } from './sections/ScheduledStartSection'
import { SeedInputSection } from './sections/SeedInputSection'
import { InitialHoldingsSection } from './sections/InitialHoldingsSection'
import { ReadOnlySeedSection } from './sections/ReadOnlySeedSection'
import { DcaRuleList } from './sections/DcaRuleList'
import { DcaRuleEditor } from './sections/DcaRuleEditor'
import { buildDcaFormDefaults, buildDcaRuleDefaults, dcaFormSchema, type DcaFormValues, type DcaRuleFormValues } from './model/dcaFormSchema'
import { buildDcaConfig, buildDcaCreatePayload } from './model/buildDcaPayload'
import { SERVER_FIELD_SLOT } from './model/strategyFormGuards'

interface Props {
  accountId: string
  initial?: Strategy
  availableTickers: string[] // 런타임 설정 허용 티커 (StrategyForm이 계산해 전달)
  defaultTicker: string // 런타임 설정 기본 티커 (deriveRuntimeFields가 허용 목록 기준으로 확정)
  tickerCustomizable: boolean // false면 종목은 기본 티커로 고정(payload 포함)
  prices: PriceMap | null // 선택 가능한 종목의 현재가
  isMock?: boolean // 모의계좌 — 가용 예수금이 없어 예수금 칸에 배지를 대신 둔다
  onSuccess?: () => void
  onCancel?: () => void
  // 목록 화면 위에만 둘 요소(유형 선택, 수정은 읽기전용 유형) — 편집 화면에서 유형을 바꾸면 폼이 언마운트돼 편집 이력 칸만 남는다
  header?: ReactNode
}

// 편집 화면에서 돌아올 때 포커스 대상 — 규칙 줄 인덱스, 또는 줄이 없으면(새 규칙 이전·삭제) 해당 방향 추가 버튼
type FocusTarget = number | DcaDirection

// DCA 등록·수정 — 규칙 목록 화면과 규칙 하나의 편집 화면을 같은 자리에서 전환한다(spec §3 결정 1·4).
// 편집 화면은 브라우저 이력 한 칸을 쌓아 뒤로가기가 목록으로 돌아가게 한다(결정 7)
export function DcaStrategyForm({ accountId, initial, availableTickers, defaultTicker, tickerCustomizable, prices, isMock = false, onSuccess, onCancel, header }: Props) {
  const form = useForm<DcaFormValues>({
    resolver: zodResolver(dcaFormSchema),
    defaultValues: buildDcaFormDefaults(initial, defaultTicker),
  })
  const { fields, append, update, remove } = useFieldArray({ control: form.control, name: 'rules' })
  const [editing, setEditing] = useState<{ index: number | null; direction: DcaDirection } | null>(null)
  const rowRefs = useRef(new Map<number, HTMLButtonElement>())
  const listRef = useRef<HTMLFieldSetElement>(null)
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
    toast.success(initial ? '전략을 수정했습니다' : '전략을 등록했습니다')
    onSuccess?.()
  }
  const create = useCreateStrategyMutation(accountId, invalidateDependents)
  const reconfigure = useReconfigureDcaMutation(initial?.id ?? '', invalidateDependents)
  const pending = create.isPending || reconfigure.isPending
  const ticker = tickerCustomizable ? form.watch('ticker') : defaultTicker
  const toCreateBody = (v: DcaFormValues) => buildDcaCreatePayload(tickerCustomizable ? v : { ...v, ticker: defaultTicker })
  // 등록 검증 — 바디는 제출 바디 그대로. 규칙 편집 화면이 검증한 값만 목록에 들어가 보통 만들어지지만, 못 만들면 검증하지 않는다
  const formValues = form.watch()
  let createBody: StrategyRequest | null = null
  try {
    createBody = initial ? null : toCreateBody(formValues)
  } catch {
    createBody = null
  }
  const validation = useStrategyValidationQuery(
    { kind: 'create', accountId },
    createBody,
    { enabled: createBody !== null && !!ticker && formValues.rules.length > 0, keepWhile: (a, b) => a?.ticker === b?.ticker },
  )
  // 가용 예수금(계좌 미배정 금액, 계좌 통화) — 다른 전략처럼 참고값·비율 채우기용이고 초과해도 막지 않는다. 등록만 조회.
  // 검증 파생값이 있으면 그 값, 없으면(규칙 추가 전 등) 시드 미리보기
  const derived = validation.data?.derived
  const preview = useDcaAvailableCashQuery(accountId, ticker, { enabled: !initial && !!ticker && !derived })
  const cash = derived ? derived.availableCash : preview.data
  const availableCash = cash == null ? null : Math.max(0, cash)
  // 서버 거절은 지금 입력의 결과만 — 검증 중·실패면 막지 않고 제출에서 서버가 다시 거른다
  // 규칙이 없으면 서버 거절을 보이지 않는다 — 서버가 빈 규칙을 거절해 손대기 전부터 오류가 뜬다(빈 목록은 로컬 검증이 제출 때 안내). 가용 예수금은 그대로 쓴다
  // 제출 400의 필드 문장 — 표시 전용(제출 차단에 넣지 않는다), 지금 입력의 검증 결과가 오면 숨기고 다음 제출이 지운다
  const submitError = validation.current ? null : apiFieldMsg((initial ? reconfigure : create).error)
  const serverError = formValues.rules.length > 0 ? validation.current?.fieldErrors[0] : undefined
  // 서버 거절을 붙일 칸 — 규칙은 'dca…' 경로, 모르는 필드는 하단(undefined)
  const serverField = serverError?.field ?? ''
  const serverSlot = serverField.startsWith('dca') ? 'rules' : SERVER_FIELD_SLOT[serverField]
  const serverMessage = (slot?: typeof serverSlot) => (serverSlot === slot ? serverError?.detail : undefined)
  const needsHoldingsHint = form.watch('rules').some((r) => r.direction === 'SELL' || r.conditions.some((c) => c.indicator === 'AVG_PRICE'))
  const rulesError = form.formState.errors.rules
  const rulesErrorMessage = rulesError?.root?.message ?? rulesError?.message ?? (rulesError ? '규칙 입력값을 확인하세요.' : undefined)

  const { errors } = form.formState
  const holdingsInvalid = !!(errors.initialAvgPrice || errors.initialHoldings)
  const formRef = useRef<HTMLFormElement>(null)
  // 막힌 제출은 사유로 포커스를 옮긴다(비DCA 폼과 같다) — 사유는 렌더 뒤에 생겨 다음 프레임에 찾는다
  const focusReason = () => requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-submit-reason]')?.focus())

  const submit = form.handleSubmit((values) => {
    if (initial) reconfigure.mutate(buildDcaConfig(values), { onSuccess: done })
    else if (serverError) focusReason()
    else create.mutate(toCreateBody(values), { onSuccess: done })
  }, focusReason)

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
    const rule: DcaRuleFormValues = index == null ? buildDcaRuleDefaults(direction) : form.getValues(`rules.${index}`)
    return (
      <DcaRuleEditor
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
      {/* 저장 중 유형을 바꾸면 폼이 언마운트돼 성공 toast·이동이 사라진다 */}
      <fieldset disabled={pending} className="min-w-0">{header}</fieldset>
      <form ref={formRef} onSubmit={submit}>
        <StrategyTickerSection
          initial={initial}
          ticker={ticker}
          availableTickers={availableTickers}
          prices={prices}
          basePrice={initial ? prices?.[initial.ticker] ?? null : null}
          loading={pending}
          onTickerChange={(code) => form.setValue('ticker', code)}
          customizable={tickerCustomizable}
        />
        {!initial && (
          <InitialHoldingsSection
            avgPrice={form.watch('initialAvgPrice')}
            quantity={form.watch('initialHoldings')}
            setField={(field, v) => {
              form.setValue(field === 'avgPrice' ? 'initialAvgPrice' : 'initialHoldings', v)
              // 두 값은 서로를 검증한다 — 한쪽만 다시 검증하면 반대쪽 오류가 남는다
              void form.trigger(['initialHoldings', 'initialAvgPrice'])
            }}
            loading={pending}
            caption={needsHoldingsHint && form.watch('initialHoldings') == null ? '보유 0에서 시작합니다. 이미 보유 중이면 입력하세요.' : undefined}
            errors={{ avgPrice: errors.initialAvgPrice?.message, quantity: errors.initialHoldings?.message }}
            error={holdingsInvalid ? undefined : serverMessage('holdings')}
          />
        )}
        {!initial && (
          <ScheduledStartSection
            value={form.watch('scheduledStartDate')}
            onChange={(d) => form.setValue('scheduledStartDate', d, { shouldValidate: true })}
            loading={pending}
            error={errors.scheduledStartDate?.message ?? serverMessage('scheduledStart')}
          />
        )}
        {initial ? (
          <ReadOnlySeedSection type={initial.type} ledgerDeposit={initial.ledgerDeposit} />
        ) : (
          // 매수는 이 원장 예수금 안에서만 나간다 — 등록 후 증감은 투자금 추가·인출로. 입력 칸이 음수·자릿수 초과를 막는다
          <SeedInputSection
            seedUsdInput={form.watch('initialDeposit')}
            setSeedUsdInput={(v) => form.setValue('initialDeposit', v)}
            availableCash={availableCash}
            minSeed={null}
            isBelowMinSeed={false}
            loading={pending}
            mockBadgeLabel={isMock ? '모의계좌' : undefined}
          />
        )}
        <fieldset ref={listRef} disabled={pending} className="min-w-0">
          <DcaRuleList
            rules={fields}
            onSelect={(i) => openEditor(i, fields[i].direction)}
            onAdd={(direction) => openEditor(null, direction)}
            registerRowRef={(i, el) => {
              if (el) rowRefs.current.set(i, el)
              else rowRefs.current.delete(i)
            }}
            error={rulesErrorMessage ?? serverMessage('rules')}
          />
        </fieldset>
        <div aria-live="polite">{serverMessage(undefined) && <p data-submit-reason tabIndex={-1} className="text-sm font-semibold text-warn pt-3">{serverMessage(undefined)}</p>}</div>
        <StrategyValidationWarnings warnings={validation.current?.warnings ?? []} unavailable={validation.isError} />
        {submitError && <p role="alert" className="text-sm font-semibold text-status-error">{submitError}</p>}
        <FormActions onCancel={onCancel} isPending={pending} label={initial ? '수정' : '등록'} className="py-6" />
      </form>
    </>
  )
}
