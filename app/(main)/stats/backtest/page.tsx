import type { Metadata } from 'next'
import { BacktestPageContent } from '@widgets/backtest'

export const metadata: Metadata = {
  title: '백테스트 | KISTA',
}

export default function BacktestPage() {
  return <BacktestPageContent />
}
