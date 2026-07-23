'use client'

import { ErrorDisplay } from '@widgets/error-display'

export default function AccountDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorDisplay code={500} error={error} reset={reset} standalone={false} />
}
