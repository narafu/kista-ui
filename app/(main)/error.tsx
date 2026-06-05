'use client'

import { ErrorDisplay } from '@widgets/error-display'

export default function MainError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorDisplay code={500} reset={reset} standalone={false} />
}
