'use client'

import { useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { BacktestForm, useBacktestForm } from '@features/backtest/run-backtest'
import { fmtDate, fmtUsd } from '@shared/lib/format'
import { EquityLineChart } from '@shared/ui/EquityLineChart'
import { BacktestSummaryCards } from './BacktestSummaryCards'
import { BacktestWarnings } from './BacktestWarnings'

export function BacktestPageContent() {
  const form = useBacktestForm()
  const result = form.result
  const resultRef = useRef<HTMLDivElement>(null)

  // 모바일(1열)은 결과가 폼 아래에 생겨 눈에 띄지 않으므로 실행을 시작하면 결과 영역으로 내려준다
  useEffect(() => {
    if (!form.isLoading || !window.matchMedia('(max-width: 1023px)').matches) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    resultRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }, [form.isLoading])

  return (
    // PC에선 입력 폼(좌)과 결과(우)를 나란히 둬 폼이 화면 전체 너비로 늘어나지 않게 한다
    <div className="grid gap-5 lg:grid-cols-[26rem_minmax(0,1fr)] lg:items-start">
      <BacktestForm form={form} />
      {form.isLoading ? (
        <div ref={resultRef} role="status" aria-label="백테스트 실행 중" className="flex min-w-0 scroll-mt-20 flex-col gap-5">
          <BacktestSummaryCards />
          <Skeleton className="h-[290px] w-full rounded-[var(--r-lg)] sm:h-[340px]" />
        </div>
      ) : result ? (
        <div ref={resultRef} className="flex min-w-0 scroll-mt-20 flex-col gap-5">
          {form.isResultStale && (
            <p role="status" className="text-sm text-muted-foreground">
              입력값이 바뀌었습니다. 아래 결과는 이전 입력 기준이며, 다시 실행하면 갱신됩니다.
            </p>
          )}
          <BacktestSummaryCards summary={result.summary} />
          <div className="rounded-[var(--r-lg)] border border-border bg-card p-4 sm:p-6">
            <EquityLineChart
              title="백테스트 자산 추이"
              rows={result.points.map((p) => ({ date: p.date, asset: p.totalAsset, principal: p.principal }))}
              assetLabel="총자산"
              principalLabel="투입 원금"
              valueFormatter={(v) => `$${fmtUsd(v)}`}
              yAxisWidth={44}
              yAxisTickFormatter={(v) => fmtUsd(v, 0)}
              dateTickFormatter={fmtDate}
              markerDates={result.cycleStartDates}
              markerLabel="사이클 시작"
            />
          </div>
          <BacktestWarnings warnings={result.warnings} />
        </div>
      ) : (
        <div className="hidden min-h-[24rem] items-center justify-center rounded-[var(--r-lg)] border border-dashed border-border text-sm text-muted-foreground lg:flex">
          조건을 입력하고 실행하면 결과가 여기에 표시됩니다.
        </div>
      )}
    </div>
  )
}
