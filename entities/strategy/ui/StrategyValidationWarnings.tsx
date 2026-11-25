import type { StrategyValidation } from '../model/types'

// 서버 검증 경고 — 저장은 되지만 알릴 것. 문장은 서버 detail 그대로
export function StrategyValidationWarnings({ warnings }: { warnings: StrategyValidation['warnings'] }) {
  if (warnings.length === 0) return null
  return (
    <ul className="space-y-1 pt-3">
      {warnings.map((w, i) => <li key={`${w.code}-${i}`} className="text-sm text-warn">{w.detail}</li>)}
    </ul>
  )
}
