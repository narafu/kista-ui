'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CycleHistoryItem } from '@entities/trade'
import { RANGE_LABELS, type RangeType } from './lib/buildParams'

interface Props {
  title: string
  cycleHistory: CycleHistoryItem[]
  isLoading: boolean
  rangeType: RangeType
  setRangeType: (r: RangeType) => void
  customFrom: string
  setCustomFrom: (v: string) => void
  customTo: string
  setCustomTo: (v: string) => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  fetchNextPage?: () => void
}

export function CycleHistoryTable({
  title,
  cycleHistory,
  isLoading,
  rangeType,
  setRangeType,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: Props) {
  const rangeLabel =
    rangeType === 'all'
      ? '전체'
      : rangeType === '7d'
        ? '최근 7일'
        : rangeType === '30d'
          ? '최근 30일'
          : customFrom && customTo
            ? `${customFrom} ~ ${customTo}`
            : '기간 선택 중'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rangeLabel} · 총 {isLoading ? '…' : cycleHistory.length}건
              </p>
            </div>
            <div className="flex gap-0.5 rounded-lg bg-muted p-1 shrink-0">
              {(['all', '7d', '30d', 'custom'] as RangeType[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRangeType(r)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    rangeType === r ? 'bg-background text-rose-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          {rangeType === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                aria-label="시작 날짜"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">~</span>
              <input
                type="date"
                aria-label="종료 날짜"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">로딩 중...</div>
        ) : cycleHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">거래 내역이 없습니다.</p>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 p-4 lg:hidden">
              {cycleHistory.map((entry) => (
                <Card key={entry.createdAt} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{entry.ticker ?? '-'}</span>
                    <span className="text-sm font-semibold">${(entry.usdDeposit ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>
                      {entry.holdings}주{entry.avgPrice != null ? ` · 평균 $${entry.avgPrice.toFixed(2)}` : ''}
                    </span>
                    <span>{new Date(entry.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </Card>
              ))}
            </div>
            {/* 데스크탑: 테이블 */}
            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    {['일시', '종목', '보유수량', '평균단가', '예수금'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-rose-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cycleHistory.map((entry) => (
                    <tr key={entry.createdAt} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td className="px-4 py-3 font-medium">{entry.ticker ?? '-'}</td>
                      <td className="px-4 py-3">{entry.holdings}주</td>
                      <td className="px-4 py-3">{entry.avgPrice != null ? `$${entry.avgPrice.toFixed(2)}` : '-'}</td>
                      <td className="px-4 py-3 font-medium">${(entry.usdDeposit ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 더 보기 버튼 — 모바일·데스크탑 공통 */}
            {(hasNextPage || isFetchingNextPage) && (
              <div className="flex justify-center py-4 border-t">
                <button
                  type="button"
                  onClick={fetchNextPage}
                  disabled={isFetchingNextPage}
                  className="px-4 py-2 text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  {isFetchingNextPage ? '불러오는 중…' : '더 보기'}
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
