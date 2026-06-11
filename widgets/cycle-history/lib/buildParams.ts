export type RangeType = 'all' | '7d' | '30d' | 'custom'

export const RANGE_LABELS: Record<RangeType, string> = {
  all: '전체',
  '7d': '7일',
  '30d': '30일',
  custom: '직접입력',
}

export function buildParams(
  rangeType: RangeType,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string } | null {
  const today = new Date().toISOString().split('T')[0]
  if (rangeType === 'all') return {}
  if (rangeType === '30d') {
    const from = new Date()
    from.setDate(from.getDate() - 30)
    return { from: from.toISOString().split('T')[0], to: today }
  }
  if (rangeType === '7d') {
    const from = new Date()
    from.setDate(from.getDate() - 7)
    return { from: from.toISOString().split('T')[0], to: today }
  }
  if (!customFrom || !customTo) return null
  return { from: customFrom, to: customTo }
}
