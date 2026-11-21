import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

/** 라우트 `loading.tsx`가 한 줄로 재수출하는 화면 골격 프리셋. */

function FormSkeleton({ widthClass, cards, progress }: { widthClass: string; cards: number; progress?: boolean }) {
  return (
    <div className={`animate-pulse ${widthClass} mx-auto space-y-4`}>
      <Skeleton className="h-8 w-32 mb-6" />
      {progress && <Skeleton className="h-2 w-full rounded-full mb-8" />}
      {Array.from({ length: cards }).map((_, i) => (
        <CardSkeleton key={i} className="h-16" />
      ))}
    </div>
  )
}

export const FormPageSkeleton = () => <FormSkeleton widthClass="max-w-lg" cards={4} />
export const WideFormPageSkeleton = () => <FormSkeleton widthClass="max-w-2xl" cards={4} />
export const WizardPageSkeleton = () => <FormSkeleton widthClass="max-w-2xl" cards={3} progress />

export function SplitDetailPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-6">
        <CardSkeleton className="h-48" />
        <CardSkeleton className="h-48" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <CardSkeleton className="h-64" />
        <CardSkeleton className="h-64" />
      </div>
      <CardSkeleton className="h-40" />
    </div>
  )
}

export function KpiDetailPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <Skeleton className="h-8 w-48" />
      <CardSkeleton className="h-20" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-24" />
        ))}
      </div>
      <CardSkeleton className="h-40" />
      <CardSkeleton className="h-64" />
      <CardSkeleton className="h-16" />
    </div>
  )
}

export function AdminOverviewSkeleton() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-8 w-40 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[var(--r-lg)]" />
        ))}
      </div>
      <Skeleton className="h-6 w-28 mb-4" />
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-[var(--r-lg)]" />
        ))}
      </div>
    </div>
  )
}

export function AdminCardListSkeleton() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-8 w-40 mb-8" />
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-[var(--r-lg)]" />
        ))}
      </div>
    </div>
  )
}

/** 관리자 테이블 페이지 공용 — 헤더 1줄 + 행 `rows`개. */
export function AdminTableBlock({ rows }: { rows: number }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-border bg-card overflow-hidden">
      <div className="h-12 bg-muted/50 border-b border-border" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 border-b border-border last:border-0 px-4 flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24 ml-auto" />
        </div>
      ))}
    </div>
  )
}

export function AdminTableSkeleton() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-8 w-40 mb-6" />
      <AdminTableBlock rows={6} />
    </div>
  )
}

export function PendingPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-pulse space-y-4">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <Skeleton className="h-12 w-full mt-6 rounded-[var(--r-lg)]" />
      </div>
    </div>
  )
}

export function RejectedPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-pulse space-y-4">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-20 w-full rounded-[var(--r-lg)]" />
        <Skeleton className="h-12 w-full rounded-[var(--r-lg)]" />
      </div>
    </div>
  )
}
