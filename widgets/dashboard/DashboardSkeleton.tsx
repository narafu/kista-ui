import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

// 라우트 loading.tsx와 계좌 조회 대기가 같은 모양을 쓰도록 실제 DashboardMarkets 배치(3열 ×2행)를 따른다
export function DashboardSkeleton() {
  return (
    <div>
      <div className="hidden lg:block mb-8">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} className="h-[420px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} className="h-[400px]" />
        ))}
      </div>
    </div>
  )
}
