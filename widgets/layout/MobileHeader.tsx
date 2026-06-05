import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'

interface Props {
  trailing?: ReactNode
}

export function MobileHeader({ trailing }: Props) {
  return (
    <header
      className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-border"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <Image
          src="/logo.png"
          alt="KISTA"
          width={28}
          height={28}
          className="rounded-[6px] shadow-[0_2px_6px_rgba(143,68,48,.22)]"
          style={{ height: 28, width: 28 }}
        />
        <span className="font-[800] text-[17px] tracking-wide text-brand-fg">KISTA</span>
      </Link>
      {trailing && <div>{trailing}</div>}
    </header>
  )
}
