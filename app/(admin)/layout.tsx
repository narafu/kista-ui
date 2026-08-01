import { AdminSidebar } from '@widgets/layout/AdminSidebar'
import { AdminTopBar } from '@widgets/layout/AdminTopBar'
import { PullToRefresh } from '@widgets/pull-to-refresh'
import { MetaProvider, getMetaBundle } from '@entities/meta'

// 관리자 화면은 사용자별 인증 콘텐츠 — 정적 프리렌더 금지 (빌드 타임 /api/meta fetch 방지).
// 과거엔 getAuthToken()의 cookies() 접근으로 암묵적 동적이었으나 명시적으로 고정한다.
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const meta = await getMetaBundle()

  return (
    <MetaProvider meta={meta}>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <AdminTopBar />
          <PullToRefresh />
          <main className="flex-1 p-4 lg:p-8 max-w-5xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </MetaProvider>
  )
}
