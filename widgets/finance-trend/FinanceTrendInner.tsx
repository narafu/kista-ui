'use client'

import { useMemo } from 'react'
// 아래 FinanceTrend.tsx의 next/dynamic({ ssr: false }) 셸이 이 파일 자체를 지연 로드한다. 룰은 파일 간
// 도달 가능성을 보지 않고 recharts import를 정적으로만 감지해 분리 구조와 무관하게 항상 발화한다
// (widgets/asset-trend/AssetTrendInner.tsx 등 기존 recharts 위젯과 동일한 처리).
// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SectionError } from '@shared/ui/SectionError'
import { fmtKrw } from '@shared/lib/format'
import { calcFlowTrend, filterByType } from '@entities/finance'
import type { CategoryIndex, FinanceCategoryType, FinanceTransaction } from '@entities/finance'

// Y축 눈금 전용 — fmtKrw는 "1,000,000원" 같은 긴 문자열이라 좁은 축 폭에 맞지 않는다.
// 만원 단위로 축약해 표시하고, 정확한 금액은 Tooltip의 fmtKrw로 보여준다.
function fmtKrwAxisTick(value: number): string {
  return `${Math.round(value / 10_000).toLocaleString('ko-KR')}만`
}

interface Props {
  type: FinanceCategoryType
  transactions: FinanceTransaction[]
  index: CategoryIndex
  month: string
  isLoading: boolean
  isError: boolean
}

export default function FinanceTrendInner({ type, transactions, index, month, isLoading, isError }: Props) {
  const typeTransactions = useMemo(() => filterByType(transactions, index, type), [transactions, index, type])
  const trend = useMemo(() => calcFlowTrend(typeTransactions, month, 6), [typeTransactions, month])

  if (isLoading) {
    return <div className="flex min-h-[240px] flex-1 items-center justify-center text-sm text-muted-foreground sm:min-h-[280px]">불러오는 중…</div>
  }
  if (isError) {
    return <SectionError message="추이를 불러오지 못했습니다" />
  }

  const hasData = trend.some((point) => point.amount !== 0)

  return (
    <div className="flex flex-1 flex-col gap-3">
      {!hasData ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">표시할 추이 데이터가 없습니다</p>
        </div>
      ) : (
        <div className="min-h-[240px] w-full flex-1 sm:min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
            <LineChart data={trend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={fmtKrwAxisTick} domain={['auto', 'auto']} />
              <Tooltip
                formatter={(value) => [fmtKrw(Number(value)), '금액']}
                contentStyle={{
                  fontSize: 12,
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  borderRadius: 6,
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
                animationDuration={500}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
