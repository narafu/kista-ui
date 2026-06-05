'use client'

import { ErrorDisplay } from '@components/common/ErrorDisplay'

export default function AccountDetailError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorDisplay code={500} reset={reset} standalone={false} />
}
