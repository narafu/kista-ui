import type { Metadata } from 'next'
import { HousingBenchmarkComparison } from '@widgets/benchmark-comparison'
import { PageHeader } from '@widgets/page-header'

export const metadata: Metadata = {
  title: '벤치마크 | KISTA',
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function BenchmarkPage() {
  const defaultTo = isoDate(new Date())

  return (
    <>
      <PageHeader eyebrow="Benchmark" title="벤치마크" />
      <HousingBenchmarkComparison enabled defaultTo={defaultTo} />
    </>
  )
}
