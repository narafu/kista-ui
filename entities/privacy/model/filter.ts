import type { AdminPrivacyBase } from './types'

export function filterAdminPrivacyBasesByRange(bases: AdminPrivacyBase[], from?: string, to?: string): AdminPrivacyBase[] {
  if (!from && !to) return bases
  return bases.filter((b) => (!from || b.releaseDate >= from) && (!to || b.releaseDate <= to))
}
