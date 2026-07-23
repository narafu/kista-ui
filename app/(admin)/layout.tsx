import { AdminSidebar } from '@widgets/layout/AdminSidebar'
import { AdminTopBar } from '@widgets/layout/AdminTopBar'
import { PullToRefresh } from '@widgets/pull-to-refresh'
import { MetaProvider, getMetaBundle } from '@entities/meta'
import { getAuthToken } from '@shared/lib/auth/token'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = await getAuthToken()
  const meta = await getMetaBundle(token)

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
