import type { ReactNode } from 'react'
import { StatsHeader } from './StatsHeader'

export default function StatsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StatsHeader />
      {children}
    </>
  )
}
