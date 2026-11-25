import type { StrategyValidation } from '../model/types'

// 서버 검증 경고 — 저장은 되지만 알릴 것. 문장은 서버 detail 그대로.
// unavailable: 검증 호출이 실패(404 사용자 복제본 없음·429/503·네트워크) — 제출은 막지 않고 알리기만 한다
export function StrategyValidationWarnings({ warnings, unavailable = false }: { warnings: StrategyValidation['warnings']; unavailable?: boolean }) {
  if (warnings.length === 0 && !unavailable) return null
  return (
    <ul className="space-y-1 pt-3">
      {unavailable && <li className="text-sm text-muted-foreground">입력값 사전 확인을 불러오지 못했습니다. 제출하면 서버가 다시 확인합니다.</li>}
      {warnings.map((w, i) => <li key={`${w.code}-${i}`} className="text-sm text-warn">{w.detail}</li>)}
    </ul>
  )
}
