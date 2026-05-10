import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        {/* 모바일: 상단 헤더 */}
        <header className="lg:hidden flex items-center h-14 px-4 border-b bg-background">
          <span className="text-lg font-bold">KISTA</span>
        </header>
        <main className="flex-1 p-4 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  )
}
