import type { RangePreset } from '@shared/ui/UrlRangeFilterBar'
import { ErrorLogsSectionContent } from './ErrorLogsSectionContent'

export function ErrorLogsSection({
  page, size, range, from, to,
}: {
  page: number
  size: number
  range: RangePreset
  from?: string
  to?: string
}) {
  return <ErrorLogsSectionContent page={page} size={size} range={range} from={from} to={to} />
}
