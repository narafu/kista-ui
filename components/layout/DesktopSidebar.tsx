import Link from 'next/link'
import { LayoutDashboard, CreditCard, BarChart2, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts', label: '계좌 관리', icon: CreditCard },
  { href: '/statistics', label: '통계', icon: BarChart2 },
  { href: '/settings', label: '설정', icon: Settings },
]

export function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen border-r bg-card px-4 py-6 shrink-0">
      <div className="mb-8 px-2">
        <span className="text-xl font-bold tracking-tight">KISTA</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
