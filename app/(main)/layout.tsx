import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { TradeNotificationProvider } from '@/components/trading/TradeNotificationProvider'
import { MetaProvider } from '@/components/providers/MetaProvider'
import { getMetaBundle } from '@/lib/api/meta'
import { getAuthToken } from '@/lib/auth/token'
import { Toaster } from 'sonner'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const token = await getAuthToken()
  const meta = await getMetaBundle(token)

  return (
    <MetaProvider meta={meta}>
      <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
        <DesktopSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <MobileHeader />
          <main className="flex-1 p-4 lg:p-9 pb-24 lg:pb-9">{children}</main>
          <MobileBottomNav />
        </div>
        <Toaster richColors position="top-right" />
        <TradeNotificationProvider />
      </div>
    </MetaProvider>
  )
}
