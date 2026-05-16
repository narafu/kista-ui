import Image from 'next/image'
import Link from 'next/link'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <DesktopSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        {/* 모바일 헤더 */}
        <header
          className="lg:hidden flex items-center justify-between h-14 px-4 shrink-0"
          style={{
            background: 'var(--card)',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <Image
              src="/logo.png"
              alt="KISTA"
              width={24}
              height={24}
              style={{ borderRadius: 5, boxShadow: '0 1px 4px rgba(143,68,48,.2)' }}
            />
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: 1, color: 'var(--brand-fg)' }}>
              KISTA
            </span>
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-9 pb-24 lg:pb-9">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  )
}
