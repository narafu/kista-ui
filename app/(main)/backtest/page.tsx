import type { Metadata } from 'next'
import { BacktestPageContent } from '@widgets/backtest'
import { PageHeader } from '@widgets/page-header'

export const metadata: Metadata = {
  title: '백테스트 | KISTA',
}

export default function BacktestPage() {
  return (
    <>
      <PageHeader eyebrow="Backtest" title="백테스트" />
      <BacktestPageContent />
    </>
  )
}
