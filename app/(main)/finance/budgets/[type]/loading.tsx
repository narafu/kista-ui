import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

// 예산 목록·추가·수정 일반 라우트 공용 — 없으면 상위 /finance의 자산 목록 스켈레톤(넓은 폭)이 대신 뜬다.
export default function BudgetLoading() {
  return (
    <div className="animate-pulse max-w-lg mx-auto space-y-4">
      <Skeleton className="h-8 w-32 mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} className="h-16" />
      ))}
    </div>
  )
}
