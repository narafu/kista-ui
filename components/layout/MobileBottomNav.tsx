import Link from 'next/link'
import { LayoutDashboard, CreditCard, BarChart2, Settings, User } from 'lucide-react'

const TAB_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts', label: '계좌', icon: CreditCard },
  { href: '/statistics', label: '통계', icon: BarChart2 },
  { href: '/settings', label: '설정', icon: Settings },
  { href: '/profile', label: '프로필', icon: User },
] as const

export function MobileBottomNav() {
  return (
    <nav className="flex lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      {TAB_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-1 flex-col items-center justify-center py-2 gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
