// 서버가 준 재신청 가능 시각(reapplyAvailableAt)까지 남은 분. 없거나 지났으면 0
export function remainingCooldownMinutes(reapplyAvailableAt?: string | null): number {
  if (!reapplyAvailableAt) return 0
  return Math.max(0, Math.ceil((Date.parse(reapplyAvailableAt) - Date.now()) / 60000))
}
