'use client'

import { ErrorDisplay } from '@widgets/error-display'

export default function Error({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  reset: () => void
  // Next 16.2 실험 prop — 이름이 바뀌거나 빠지면 reset으로 폴백해 재시도 버튼이 사라지지 않게 한다
  unstable_retry?: () => void
}) {
  return <ErrorDisplay code={500} error={error} retry={unstable_retry ?? reset} standalone={true} />
}
