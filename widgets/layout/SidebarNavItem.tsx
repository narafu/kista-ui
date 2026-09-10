import Link from 'next/link'
import type { ComponentType } from 'react'

interface Props {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  active: boolean
  ariaCurrent?: boolean
  hoverClassName?: string
}

/** 사이드바 nav 링크 공용 형태 — DesktopSidebar/AdminSidebar가 공유. */
export function SidebarNavItem({ href, label, icon: Icon, active, ariaCurrent, hoverClassName = 'hover:bg-muted hover:text-foreground' }: Props) {
  return (
    <Link
      href={href}
      aria-current={ariaCurrent ? 'page' : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm font-medium transition-colors ${
        active ? 'bg-sidebar-active text-sidebar-active-fg' : `text-muted-foreground ${hoverClassName}`
      }`}
    >
      <Icon className="size-[18px] shrink-0" />
      {label}
    </Link>
  )
}
