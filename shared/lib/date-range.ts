// KST(Asia/Seoul) 기준 날짜 범위 계산 + searchParams 파서.
// 서버(UTC)·브라우저 어디서 실행돼도 같은 결과를 내도록 todayKst()를 기준으로 한다.
import { todayKst } from '@shared/lib/format'

export type RangePreset = '7d' | '30d' | '90d' | '180d' | 'all' | 'custom'

export const RANGE_LABELS: Record<RangePreset, string> = {
  '7d': '7일',
  '30d': '30일',
  '90d': '90일',
  '180d': '180일',
  all: '전체',
  custom: '입력',
}

function kstTodayAsUtcDate(): Date {
  const [y, m, d] = todayKst().split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** KST 오늘로부터 days일 전 날짜 (YYYY-MM-DD) */
export function kstDateMinusDays(days: number): string {
  const dt = kstTodayAsUtcDate()
  dt.setUTCDate(dt.getUTCDate() - days)
  return dt.toISOString().slice(0, 10)
}

/** KST 오늘이 속한 주의 시작일(일요일, YYYY-MM-DD) */
export function kstWeekStartDate(): string {
  const dt = kstTodayAsUtcDate()
  dt.setUTCDate(dt.getUTCDate() - dt.getUTCDay())
  return dt.toISOString().slice(0, 10)
}

/**
 * 프리셋 → { from, to } 변환.
 * - all: {} (전체 기간)
 * - custom: 입력 그대로 통과 (서버 페이지는 미완성 custom을 전체 조회로 처리)
 * - 7d/30d/90d/180d: KST 오늘 기준 N일 전 ~ 상한 없음 (미래 선접수 데이터 노출 위해 to 미지정)
 */
const PRESET_DAYS = { '7d': 7, '30d': 30, '90d': 90, '180d': 180 } as const

export function resolveRange(
  preset: RangePreset,
  from?: string,
  to?: string,
): { from?: string; to?: string } {
  if (preset === 'all') return {}
  if (preset === 'custom') return { from, to }
  return { from: kstDateMinusDays(PRESET_DAYS[preset]) }
}

/** custom인데 from/to가 미완성이면 null — 클라이언트 테이블의 조회 보류용 */
export function resolveRangeStrict(
  preset: RangePreset,
  from?: string,
  to?: string,
): { from?: string; to?: string } | null {
  if (preset === 'custom' && (!from || !to)) return null
  return resolveRange(preset, from, to)
}

const VALID_SIZES = new Set(['10', '30', '50', '100'])

export function parseRangePreset(raw: string | undefined, fallback: RangePreset): RangePreset {
  return raw !== undefined && Object.hasOwn(RANGE_LABELS, raw) ? (raw as RangePreset) : fallback
}

export function parseSize(raw: string | undefined): number {
  return raw !== undefined && VALID_SIZES.has(raw) ? Number(raw) : 10
}

export function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}
