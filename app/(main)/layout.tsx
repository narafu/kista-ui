import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { TradeNotificationProvider } from '@/components/trading/TradeNotificationProvider'
import { MetaProvider } from '@/components/providers/MetaProvider'
import { FcmAutoRegister } from '@/components/providers/FcmAutoRegister'
import { getMetaBundle } from '@/lib/api/meta'
import { getMe } from '@/lib/api/auth'
import { getAuthToken } from '@/lib/auth/token'
import { Toaster } from 'sonner'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const token = await getAuthToken()
  const [meta, user] = await Promise.all([
    getMetaBundle(token),
    token ? getMe(token).catch(() => null) : null,
  ])

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
        <FcmAutoRegister notificationChannel={user?.notificationChannel ?? 'TELEGRAM'} />
      </div>
    </MetaProvider>
  )
}
