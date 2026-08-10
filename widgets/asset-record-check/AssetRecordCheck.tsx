'use client'

import { AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionError } from '@shared/ui/SectionError'
import { formatAssetCategoryLabel } from '@shared/lib/api-schema'
import {
  calcDateGroups,
  calcMissingAccounts,
  calcMissingCategories,
  listAvailableMonths,
  previousMonthOf,
  useAssetMonthlyChecksQuery,
  useAssetsQuery,
} from '@entities/asset'
import { ToggleMonthlyCheckButton } from '@features/asset/toggle-monthly-check'

interface Props {
  month: string | null
}

// entryDate('YYYY-MM-DD')를 Date로 파싱하지 않고 문자열에서 직접 M/D를 뽑는다 — Date 파싱은 타임존에 따라 날짜가 밀릴 수 있다.
function formatMonthDay(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  return `${Number(month)}/${Number(day)}`
}

export function AssetRecordCheck({ month }: Props) {
  const { data: assets = [], isLoading: assetsLoading, isError: assetsError } = useAssetsQuery()
  const { data: monthlyChecks = [], isLoading: checksLoading, isError: checksError } = useAssetMonthlyChecksQuery()

  if (assetsLoading || checksLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          불러오는 중…
        </CardContent>
      </Card>
    )
  }
  if (assetsError || checksError) {
    return <SectionError message="기록 점검 정보를 불러오지 못했습니다" />
  }

  if (month === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>기록 점검</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">확인할 자산 기록이 아직 없습니다.</CardContent>
      </Card>
    )
  }

  const months = listAvailableMonths(assets)
  const previousMonth = previousMonthOf(months, month)
  const missingCategories = calcMissingCategories(assets, month)
  const missingAccounts = calcMissingAccounts(assets, month, previousMonth)
  const dateGroups = calcDateGroups(assets, month)
  const completed = monthlyChecks.find((check) => check.month === month)?.completed ?? false

  return (
    <Card>
      <CardHeader>
        <CardTitle>기록 점검</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <h3 className="text-sm font-semibold mb-1.5">미기록 카테고리</h3>
          {missingCategories.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-[var(--status-ok)]">
              <CheckCircle2 className="size-4" /> 모든 카테고리 기록 완료
            </p>
          ) : (
            <div className="flex items-start gap-1.5 rounded-[var(--r-md)] border border-[var(--warn)] bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <span>{missingCategories.map(formatAssetCategoryLabel).join(', ')}</span>
            </div>
          )}
        </section>

        {previousMonth !== null && (
          <section>
            <h3 className="text-sm font-semibold mb-1.5">전월 대비 누락 계좌</h3>
            {missingAccounts.length === 0 ? (
              <p className="flex items-center gap-1.5 text-sm text-[var(--status-ok)]">
                <CheckCircle2 className="size-4" /> 전월 대비 누락된 계좌가 없습니다
              </p>
            ) : (
              <div className="flex items-start gap-1.5 rounded-[var(--r-md)] border border-[var(--warn)] bg-[var(--warn-bg)] px-3 py-2 text-sm text-[var(--warn)]">
                <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                <span>{missingAccounts.join(', ')}</span>
              </div>
            )}
          </section>
        )}

        {dateGroups.length > 1 && (
          <section>
            <h3 className="text-sm font-semibold mb-1.5">기준일 혼재 경고</h3>
            <div className="flex items-start gap-1.5 rounded-[var(--r-md)] border border-[var(--info)] bg-[var(--info-bg)] px-3 py-2 text-sm text-[var(--info)]">
              <CalendarClock className="size-4 mt-0.5 shrink-0" />
              <span>
                이번 달 기록이 여러 날짜({dateGroups.map((group) => formatMonthDay(group.date)).join(', ')})에 나뉘어 있습니다. 확인해주세요.
              </span>
            </div>
          </section>
        )}

        <ToggleMonthlyCheckButton month={month} completed={completed} />
      </CardContent>
    </Card>
  )
}
